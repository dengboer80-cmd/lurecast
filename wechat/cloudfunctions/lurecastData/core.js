const https=require('node:https');
const F=require('./lib/free-data'),Places=require('./lib/nation-data');
const allowed=new Set(['api.open-meteo.com','marine-api.open-meteo.com','geocoding-api.open-meteo.com']);
function sourceError(code,message){
 const error=new Error(message);
 error.code=code;
 return error;
}
function getJSON(url){
 return new Promise((resolve,reject)=>{
  const target=new URL(url);
  if(target.protocol!=='https:'||!allowed.has(target.hostname)){
   reject(sourceError('SOURCE_FORBIDDEN','不允许的数据服务'));
   return;
  }
  let settled=false;
  const finish=(error,data)=>{
   if(settled)return;
   settled=true;
   clearTimeout(deadline);
   if(error)reject(error);else resolve(data);
  };
  const deadline=setTimeout(()=>{
   req.destroy(sourceError('SOURCE_TIMEOUT','数据源超时'));
  },7000);
  const req=https.get(target,{headers:{Accept:'application/json','Accept-Encoding':'identity'}},res=>{
   if(res.statusCode!==200){
    res.resume();
    finish(sourceError('SOURCE_HTTP_'+res.statusCode,'数据源返回 '+res.statusCode));
    return;
   }
   let body='';
   res.setEncoding('utf8');
   res.on('data',chunk=>{
    body+=chunk;
    if(Buffer.byteLength(body)>1024*1024)req.destroy(sourceError('SOURCE_TOO_LARGE','数据响应过大'));
   });
   res.on('end',()=>{
    try{
     const data=JSON.parse(body);
     if(data.error)throw Error('provider error');
     finish(null,data);
    }catch(_){finish(sourceError('SOURCE_FORMAT','数据源格式无效'));}
   });
   res.on('error',finish);
   res.on('aborted',()=>finish(sourceError('ECONNRESET','数据源连接中断')));
  });
  req.on('error',finish);
 });
}
const transient=new Set(['SOURCE_TIMEOUT','ETIMEDOUT','ECONNRESET','EAI_AGAIN']);
async function fetchWeather(url,fetchJSON){
 try{return await fetchJSON(url);}
 catch(error){
  if(!transient.has(error.code))throw error;
  return fetchJSON(url);
 }
}
function weatherFailure(error){
 const code=error&&error.code||'SOURCE_UNKNOWN';
 let message='天气数据源连接失败，请稍后重试';
 if(['ENOTFOUND','EAI_AGAIN'].includes(code))message='天气域名解析失败，请检查云函数公网访问';
 else if(['SOURCE_TIMEOUT','ETIMEDOUT','ECONNRESET','ECONNREFUSED','ENETUNREACH','EHOSTUNREACH'].includes(code))message='天气接口连接超时或中断，请检查云函数公网访问后重试';
 else if(code==='SOURCE_HTTP_429')message='天气接口调用额度受限，请稍后重试';
 else if(code==='SOURCE_HTTP_400')message='天气接口请求参数被拒绝，请联系开发者';
 else if(code==='SOURCE_HTTP_401'||code==='SOURCE_HTTP_403')message='天气接口拒绝访问，请核对数据服务授权';
 else if(code==='SOURCE_FORMAT')message='天气接口返回格式异常，请稍后重试';
 return sourceError(code,message+'（'+String(code).replace(/[^A-Za-z0-9_]/g,'').slice(0,48)+'）');
}
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
    const [weather,marine]=await Promise.allSettled([fetchWeather(F.weatherURL(p),fetchJSON),...(event.habitat==='sea'?[fetchJSON(F.marineURL(p))]:[])]);
    if(weather.status!=='fulfilled')throw weatherFailure(weather.reason);
    F.normalizeWeather(weather.value);
    return {weather:weather.value,marine:marine&&marine.status==='fulfilled'?marine.value:null,retrievedAt:new Date(now()).toISOString()};
   });
  }catch(e){return {error:{code:e.code||'DATA_UNAVAILABLE',message:e.message||'数据暂不可用'}};}
 };
}
module.exports={createService,getJSON};
