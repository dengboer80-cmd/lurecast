const F=require('./free-data'),config=require('../config');
function read(key,fallback){try{const x=wx.getStorageSync(key);return x===undefined||x===''?fallback:x;}catch(_){return fallback;}}
function write(key,value){try{wx.setStorageSync(key,value);return true;}catch(_){wx.showToast({title:'保存失败：本机存储不可用',icon:'none'});return false;}}
const valid=p=>p&&typeof p.name==='string'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
const key=d=>new Date(d).toISOString().slice(0,10);
function dateKeys(now=Date.now()){const d=new Date(now+8*3600000);return Array.from({length:15},(_,i)=>key(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+i)));}
const stored=read('wx-lc-place',null);
const state={place:valid(stored)&&['fresh','sea'].includes(stored.type)?stored:{name:'杭州',lat:30.2741,lng:120.1551,type:'fresh'},date:dateKeys()[0],weather:null,marine:null,error:'',loading:false};
let requestId=0;const cache=new Map();
function call(action,params){
 if(!getApp().globalData.cloudReady)return Promise.reject(Error('尚未配置云开发环境，注册小程序后填写AppID与环境ID并部署云函数'));
 let timer;return Promise.race([wx.cloud.callFunction({name:config.functionName,data:{action,...params}}).then(r=>{if(!r.result||r.result.error)throw Error(r.result&&r.result.error&&r.result.error.message||'数据服务暂不可用');return r.result;}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('数据请求超时，请稍后刷新')),20000);})]).finally(()=>clearTimeout(timer));
}
async function load(force=false){
 const id=++requestId,p={...state.place},k=F.locationKey(p)+':'+p.type,cached=cache.get(k);
 state.weather=null;state.marine=null;state.error='';state.loading=true;
 try{
  let result=cached&&Date.now()-cached.at<600000&&!force?cached.data:await call('forecast',{lat:p.lat,lng:p.lng,habitat:p.type});
  if(id!==requestId)return state;
  state.weather=F.normalizeWeather(result.weather,result.retrievedAt);
  if(p.type==='sea'&&result.marine){try{state.marine=F.normalizeMarine(result.marine,p,result.retrievedAt);}catch(_){}}
  cache.set(k,{at:Date.now(),data:result});
 }catch(e){if(id===requestId)state.error=e.message||'天气暂不可用';}
 finally{if(id===requestId)state.loading=false;}
 return state;
}
function choose(p){if(!valid(p)||!['fresh','sea'].includes(p.type))throw Error('地点或水域类型无效');requestId++;state.place={...p};state.weather=null;state.marine=null;state.error='';write('wx-lc-place',p);const list=read('wx-lc-recent',[]);write('wx-lc-recent',[p,...(Array.isArray(list)?list:[]).filter(x=>valid(x)&&F.locationKey(x)!==F.locationKey(p))].slice(0,8));}
function setDate(d){if(dateKeys().includes(d))state.date=d;}
function selectedDay(){return state.weather&&state.weather.days.find(d=>d.date===state.date);}
function fishHours(){const day=selectedDay(),mean=d=>d&&Number.isFinite(d.temperatureMin)&&Number.isFinite(d.temperatureMax)?(d.temperatureMin+d.temperatureMax)/2:null,avg=mean(day),prev=state.weather&&state.weather.days.find(d=>d.date===key(Date.parse(state.date+'T00:00:00+08:00')-86400000+8*3600000)),pm=mean(prev);return (state.weather&&state.weather.hours||[]).filter(h=>h.time.startsWith(state.date)).map(h=>({...h,habitat:state.place.type,sunrise:day&&day.sunrise,sunset:day&&day.sunset,dayMean:avg,dayChange:Number.isFinite(avg)&&Number.isFinite(pm)?avg-pm:null}));}
function plans(){const x=read('wx-lc-plans',[]);return Array.isArray(x)?x.filter(p=>p&&typeof p.id==='string'&&valid(p.place)):[];}
function addPlan(snapshot=null){const id=F.locationKey(state.place)+':'+state.date,items=plans();if(items.some(x=>x.id===id))return {ok:false,message:'该地点当天已有计划'};const ok=write('wx-lc-plans',[...items,{id,date:state.date,place:{...state.place},time:'06:00',note:'',snapshot}]);return {ok,message:ok?'已加入出钓计划':'保存失败'};}
module.exports={state,read,write,valid,dateKeys,call,load,choose,setDate,selectedDay,fishHours,plans,addPlan};
