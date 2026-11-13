// Transparent weather heuristics; no inferred fish distribution or catch probability.
const profiles=require('./fish-profiles'),B=require('./bite-model');
const waters=['未细分','河流','湖库','溪流','河口','近岸'];
function species(place){
 const ids=Array.isArray(place.species)?place.species:[];
 return profiles.filter(p=>p.domestic&&p.habitat===place.type&&ids.includes(p.id));
}
function candidates(place){const local=species(place);return local.length?local:profiles.filter(p=>p.domestic&&p.habitat===place.type);}
function approach(p){
 const methods={
  pelagic:['先找饵鱼活动层，表层到中下层逐层搜索。','用可控速度搜索，改变停顿与收线节奏。','同一标点无口时先换水层，再换饵型；没有饵鱼迹象时换标点。'],
  bottom:['先搜索乱石、桥墩等结构边缘及近底层。','小幅跳底、慢拖并停顿，避免持续快速离底。','无口先调整停顿与铅重；挂底多时改用防挂钩组。'],
  cover:['先核实草边、障碍物与缓流缝隙。','沿障碍边缘分段搜索，留出停顿观察跟口。','无追口时改变搜索层和速度；雷蛙只用于适合的草区与装备。'],
  light:['优先观察浅流和缓急交界，确认站位安全。','在竿线适配范围内用轻饵，顺流或斜向搜索。','无口时换流缝、改变泳层；不要仅靠减小饵重应对强风。']
 };
 const m=methods[p.style]||['先观察水层、结构和当地鱼情。','少量抛投试探，再按现场反馈调整速度。','无口时依次改变水层、节奏和标点。'];
 return {layer:m[0],retrieve:m[1],fallback:m[2],bait:p.bait,tip:p.tip};
}
function explain(result){
 const factors=result.factors||[];
 return {
  favorable:factors.filter(f=>f.score>=75).map(f=>f.name+'条件相对有利'),
  unfavorable:factors.filter(f=>f.score<60).map(f=>f.name+'条件偏弱'),
  uncertainty:[...(result.missing||[]),'现场水温、水色、水位及鱼密度未纳入'],
  qualification:'经验天气分，非中鱼概率'
 };
}
function recommend(place,hours,hour,windowStart=hour){
 const r=B.rank(candidates(place),hours,hour).find(r=>Number.isFinite(r.current.score));
 if(!r)return null;
 const future=r.results.filter(x=>Number.isFinite(x.score)&&Number(x.input.time.slice(11,13))>=windowStart).sort((a,b)=>b.score-a.score||a.input.time.localeCompare(b.input.time));
 const best=future[0];
 return {id:r.profile.id,name:r.profile.name,score:r.current.score,hour,time:String(hour).padStart(2,'0')+':00',
 image:'/assets/fish/fish-'+r.profile.artIndex+'.jpg',bait:r.profile.bait,label:r.current.label,
 confirmed:species(place).length>0,basis:species(place).length?'仅在你确认的本钓点鱼种中比较':'尚未确认当地鱼种，仅作天气候选',
 window:best?best.input.time.slice(11,16)+' 附近 · '+best.score+'分':'后续时段暂无可判断数据',
 windowHour:best?Number(best.input.time.slice(11,13)):hour,
 ...explain(r.current),...approach(r.profile),reasons:r.current.reasons};
}
function snapshot(recommendation,weather,date){
 if(!recommendation)return null;
 return {fish:recommendation.name,score:recommendation.score,window:recommendation.window,
 bait:recommendation.bait,confirmed:recommendation.confirmed,weatherAt:weather&&weather.retrievedAt||'',version:'weather-0.4',weatherSummary:weather&&weather.hours?weather.hours.filter(h=>h.time.startsWith(date+'T'+recommendation.time)).slice(0,1).map(h=>'气温 '+h.temperature+'°C / 风速 '+h.windSpeed+'km/h').join(''):''};
}
function stats(plans){
 const done=plans.filter(p=>p.review),groups=new Map();
 for(const p of done){const k=JSON.stringify([p.place.lat,p.place.lng,p.place.type,p.review.targetName||p.review.targetId]);const fish=profiles.find(f=>f.id===p.review.targetId);const g=groups.get(k)||{key:k,name:p.place.name,fish:p.review.targetName||(fish?fish.name:'未识别鱼种'),count:0,contacts:0,minutes:0};g.count++;g.contacts+=p.review.contact==='yes'?1:0;g.minutes+=p.review.minutes;groups.set(k,g);}
 const hours=done.reduce((s,p)=>s+p.review.minutes/60,0);
 return {groups:[...groups.values()].map(g=>({...g,hours:Math.round(g.minutes/6)/10})),unknown:done.filter(p=>p.review.contact==='unknown').length,count:done.length,contacts:done.filter(p=>p.review.contact==='yes').length,caught:done.filter(p=>p.review.hooked||p.review.caught>0).length,hours:Math.round(hours*10)/10,
 note:done.length<10?'样本较少，仅展示个人记录，不推断中鱼概率。':'个人记录受钓点、时长和技巧影响，不代表推荐准确率。'};
}
module.exports={waters,species,candidates,approach,explain,recommend,snapshot,stats};
