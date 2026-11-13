const S=require('./state');
const B=require('./bite-model');
const profiles=require('./fish-profiles');

const num=v=>Number.isFinite(v)?String(Math.round(v*10)/10):'—';
const direction=v=>Number.isFinite(v)?['北','东北','东','东南','南','西南','西','西北'][Math.round(v/45)%8]+'风 '+Math.round(v)+'°':'—';
function recommendedFish(now=Date.now()){
 const s=S.state;
 if(s.loading||s.error||!s.weather)return null;
 const hour=s.date===S.dateKeys(now)[0]?new Date(now+8*3600000).getUTCHours():12;
 const candidates=profiles.filter(p=>p.domestic&&p.habitat===s.place.type);
 const ranked=B.rank(candidates,S.fishHours(),hour);
 const best=ranked.find(r=>Number.isFinite(r.current.score));
 if(!best)return null;
 return {
  id:best.profile.id,name:best.profile.name,score:best.current.score,
  hour,time:String(hour).padStart(2,'0')+':00',
  image:'/assets/fish/fish-'+best.profile.artIndex+'.jpg',
  bait:best.profile.bait,label:best.current.label
 };
}
function home(){const s=S.state,d=S.selectedDay(),today=S.dateKeys()[0],current=s.weather&&s.weather.current,hour=s.date===today&&current&&current.time?current.time.slice(11,13):'12',h=s.weather&&s.weather.hours.find(x=>x.time.startsWith(s.date+'T'+hour+':')),sea=s.marine&&s.marine.hours.find(x=>x.time.startsWith(s.date+'T'+hour+':'));
 return {recommendation:recommendedFish(),place:s.place,date:s.date,days:S.dateKeys().map(date=>{const v=s.weather&&s.weather.days.find(x=>x.date===date);return {date,label:date.slice(5),selected:date===s.date,temperature:v?num(v.temperatureMin)+'° / '+num(v.temperatureMax)+'°':'—'};}),loading:s.loading,error:s.error,updated:s.weather?s.weather.retrievedAt.replace('T',' ').slice(0,16)+' UTC':'',metrics:[{name:'气温',value:num(h&&h.temperature)+'°C',note:'体感 '+num(h&&h.apparentTemperature)+'°C'},{name:'风速',value:num(h&&h.windSpeed)+'km/h',note:direction(h&&h.windDirection)},{name:'气压',value:num(h&&h.pressure)+'hPa',note:'海平面气压'},{name:'降水概率',value:h&&Number.isFinite(h.precipitationChance)?Math.round(h.precipitationChance*100)+'%':'—',note:hour+':00预报'},{name:'日出',value:d&&d.sunrise?d.sunrise.slice(11,16):'—',note:'北京时间'},{name:'日落',value:d&&d.sunset?d.sunset.slice(11,16):'—',note:'北京时间'},{name:'紫外线',value:num(d&&d.uvIndex),note:'当日最大UV'},{name:s.place.type==='sea'?'海表水温':'河湖水温',value:num(sea&&sea.waterTemperature)+'°C',note:s.place.type==='sea'?'模型值，非实测':'暂无实测，不影响指数'}]};}
module.exports={num,direction,home,recommendedFish};
