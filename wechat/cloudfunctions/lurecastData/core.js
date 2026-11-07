const https=require('node:https');
const F=require('./lib/free-data'),Places=require('./lib/nation-data');
const allowed=new Set(['api.open-meteo.com','marine-api.open-meteo.com','geocoding-api.open-meteo.com']);
function getJSON(url){return new Promise((resolve,reject)=>{const u=new URL(url);if(u.protocol!=='https:'||!allowed.has(u.hostname))return reject(Error('不允许的数据服务'));const req=https.get(u,{headers:{Accept:'application/json','Accept-Encoding':'identity'}},res=>{let text='';if(res.statusCode!==200){res.resume();reject(Error('数据源返回 '+res.statusCode));return;}res.setEncoding('utf8');res.on('data',chunk=>{text+=chunk;if(Buffer.byteLength(text)>1024*1024){req.destroy(Error('数据响应过大'));}});res.on('end',()=>{try{const d=JSON.parse(text);if(d.error)throw Error('数据源暂不可用');resolve(d);}catch(_){reject(Error('数据源格式无效或暂不可用'));}});res.on('error',reject);});req.setTimeout(8000,()=>req.destroy(Error('数据源超时')));req.on('error',reject);});}
function createService({context,fetchJSON=getJSON,now=Date.now,enabled=()=>process.env.ENABLE_PUBLIC_WEATHER==='true'}){
 const cache=new Map(),limits=new Map();
 async function cached(key,fn){const old=cache.get(key);if(old&&now()-old.at<600000)return old.value;const value=await fn();cache.set(key,{value,at:now()});if(cache.size>256)cache.delete(cache.keys().next().value);return value;}
 return async event=>{
  try{
   const user=context();if(!user||!user.OPENID)return {error:{code:'AUTH',message:'请通过关联的小程序调用'}};
   if(!enabled())return {error:{code:'NOT_CONFIGURED',message:'天气服务尚未启用，请先完成云环境与数据使用配置'}};
   const minute=Math.floor(now()/60000),old=limits.get(user.OPENID),count=old&&old.minute===minute?old.count+1:1;limits.set(user.OPENID,{minute,count});if(limits.size>1000)limits.clear();if(count>20)return {error:{code:'RATE_LIMIT',message:'请求较频繁，请稍后重试'}};
   if(!event||!['forecast','search'].includes(event.action))throw Error('不支持的请求');
   if(event.action==='search'){
    const query=typeof event.query==='string'?event.query.trim():'',province=typeof event.province==='string'?event.province:'';
    if(query.length<2||query.length>60||province&&!Places.provinces.includes(province))throw Error('搜索条件无效');
    return await cached('search:'+query+':'+province,async()=>{
     const countries=province==='香港'?['HK']:province==='澳门'?['MO']:province==='台湾'?['TW']:['CN','HK','MO','TW'];
     const results=await Promise.allSettled(countries.map(c=>fetchJSON(Places.url(query,c))));const ok=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
     if(!ok.length)throw Error('地名服务暂不可用，可手动输入坐标');
     return {results:Places.normalize(ok,province),partial:ok.length!==countries.length,retrievedAt:new Date(now()).toISOString()};
    });
   }
   const p={lat:event.lat,lng:event.lng};if(!Places.valid(p)||!['fresh','sea'].includes(event.habitat))throw Error('坐标或水域类型无效');
   // Use only a modest precision for forecast grids; no name or device location logs.
   p.lat=Math.round(p.lat*1000)/1000;p.lng=Math.round(p.lng*1000)/1000;
   return await cached('forecast:'+F.locationKey(p)+':'+event.habitat,async()=>{
    const [weather,marine]=await Promise.allSettled([fetchJSON(F.weatherURL(p)),...(event.habitat==='sea'?[fetchJSON(F.marineURL(p))]:[])]);
    if(weather.status!=='fulfilled')throw Error('天气数据源暂不可用，请稍后重试');
    F.normalizeWeather(weather.value);
    return {weather:weather.value,marine:marine&&marine.status==='fulfilled'?marine.value:null,retrievedAt:new Date(now()).toISOString()};
   });
  }catch(e){return {error:{code:'DATA_UNAVAILABLE',message:e.message||'数据暂不可用'}};}
 };
}
module.exports={createService,getJSON};
