const profiles=require('./fish-profiles');
const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
function point(value){
 if(!value||!text(value.name,60)||!Number.isFinite(value.lat)||Math.abs(value.lat)>90||!Number.isFinite(value.lng)||Math.abs(value.lng)>180||!['fresh','sea'].includes(value.type))return null;
 if(value.species!==undefined&&(!Array.isArray(value.species)||value.species.length>40||value.species.some(id=>!profiles.some(p=>p.id===id&&p.domestic&&p.habitat===value.type))))return null;
 if(value.water!==undefined&&(!Number.isInteger(value.water)||value.water<0||value.water>5))return null;
 return {name:text(value.name,60),lat:value.lat,lng:value.lng,type:value.type,species:[...new Set(value.species||[])],water:value.water||0};
}
function review(value){
 if(!value||!profiles.some(p=>p.id===value.targetId&&p.domestic)||!Number.isInteger(value.minutes)||value.minutes<1||value.minutes>1440||!['yes','no','unknown'].includes(value.contact)||!Number.isInteger(value.caught)||value.caught<0||value.caught>999||value.caught>0&&value.contact!=='yes'||!text(value.bait,80))return null;
 return {targetId:value.targetId,minutes:value.minutes,contact:value.contact,caught:value.caught,bait:text(value.bait,80),note:text(value.note,300)};
}
function snapshot(value){
 if(!value||!text(value.fish,40)||!Number.isInteger(value.score)||value.score<0||value.score>85)return null;
 return {fish:text(value.fish,40),score:value.score,window:text(value.window,80),bait:text(value.bait,120),confirmed:value.confirmed===true,weatherAt:text(value.weatherAt,40),version:'weather-0.4',weatherSummary:text(value.weatherSummary,160)};
}
module.exports={point,review,snapshot};
