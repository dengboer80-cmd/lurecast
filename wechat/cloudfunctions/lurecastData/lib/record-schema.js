const profiles=require('./fish-profiles');
const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
function point(value){
 if(!value||!text(value.name,60)||!Number.isFinite(value.lat)||Math.abs(value.lat)>90||!Number.isFinite(value.lng)||Math.abs(value.lng)>180||!['fresh','sea'].includes(value.type))return null;
 if(value.species!==undefined&&(!Array.isArray(value.species)||value.species.length>40||value.species.some(id=>!profiles.some(p=>p.id===id&&p.domestic&&p.habitat===value.type))))return null;
 if(value.water!==undefined&&(!Number.isInteger(value.water)||value.water<0||value.water>5))return null;
 if(value.customSpecies!==undefined&&(!Array.isArray(value.customSpecies)||value.customSpecies.length>20||value.customSpecies.some(v=>typeof v!=='string'||!v.trim()||v.length>40)))return null;
 return {customSpecies:[...new Set(value.customSpecies||[])],name:text(value.name,60),lat:value.lat,lng:value.lng,type:value.type,species:[...new Set(value.species||[])],water:value.water||0};
}
function review(value){
 if(!value)return null;
 const typed=text(value.targetName,40);
 const fish=profiles.find(p=>p.domestic&&(typed?p.name===typed:p.id===value.targetId)),targetName=typed||(fish&&fish.name)||'';
 const hooked=typeof value.hooked==='boolean'?value.hooked:Number(value.caught)>0;
 const caught=value.caught===null?null:value.caught;
 if(!targetName||!Number.isInteger(value.minutes)||value.minutes<1||value.minutes>1440||!['yes','no','unknown'].includes(value.contact)||(caught!==null&&(!Number.isInteger(caught)||caught<0||caught>999))||hooked&&value.contact!=='yes'||!hooked&&caught!==0||hooked&&caught===0||!text(value.bait,80))return null;
 return {targetId:fish?fish.id:'',targetName,fishType:text(value.fishType,40),minutes:value.minutes,contact:value.contact,hooked,caught,bait:text(value.bait,80),note:text(value.note,300)};
}
function weather(value){
 if(!value||!['forecast','manual','unavailable'].includes(value.source))return null;
 return {source:value.source,summary:text(value.summary,200),observed:text(value.observed,200),date:text(value.date,10),time:text(value.time,5),retrievedAt:text(value.retrievedAt,40)};
}
function snapshot(value){
 if(!value||!text(value.fish,40)||!Number.isInteger(value.score)||value.score<0||value.score>85)return null;
 return {fish:text(value.fish,40),score:value.score,window:text(value.window,80),bait:text(value.bait,120),confirmed:value.confirmed===true,weatherAt:text(value.weatherAt,40),version:'weather-0.4',weatherSummary:text(value.weatherSummary,160)};
}
module.exports={point,review,snapshot,weather};
