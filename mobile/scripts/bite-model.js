/* Weather-only heuristic v0.4. Product rules, not a trained bite probability.
   Air-temperature bands below are independent experimental weather parameters;
   they are NOT water temperatures or biological water-temperature tolerances. */
(function(root){
 const profiles=[
  {id:'culter',name:'翘嘴鲌',habitat:'fresh',climate:'warm',activity:'twilight',bait:'米诺 / 亮片'},
  {id:'seabass',name:'中国花鲈',habitat:'sea',climate:'temperate',activity:'twilight',bait:'米诺 / 软饵'},
  {id:'seabream',name:'黑鲷',habitat:'sea',climate:'temperate',activity:'daylight',bait:'小型软饵 / 虾型饵'},
  {id:'bass',name:'大口黑鲈',habitat:'fresh',climate:'temperate',activity:'twilight',bait:'软虫 / 摇摆饵'},
  {id:'mandarin',name:'鳜',habitat:'fresh',climate:'warm',activity:'lowlight',bait:'软饵 / 沉水米诺'},
  {id:'snakehead',name:'乌鳢',habitat:'fresh',climate:'warm',activity:'daylight',bait:'雷蛙 / 软饵'}
 ];
 const bands={cool:{ideal:[5,18],outer:[-10,28]},temperate:{ideal:[12,27],outer:[-5,38]},warm:{ideal:[18,32],outer:[0,42]},tropical:{ideal:[23,33],outer:[10,43]}};
 const finite=Number.isFinite,clamp=n=>Math.max(0,Math.min(100,n));
 function thermal(t,rule){const [a,b]=rule.ideal,[low,high]=rule.outer;if(t>=a&&t<=b)return 100;return clamp(t<a?(t-low)/(a-low)*100:(high-t)/(high-b)*100);}
 function minutes(iso){if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso))return null;const h=Number(iso.slice(11,13)),m=Number(iso.slice(14,16));return h<24&&m<60?h*60+m:null;}
 function evaluate(p,input){
  const reasons=[],missing=[],factors=[];
  const unavailable=(label,fields=[])=>({score:null,label,reasons,missing:fields,version:'weather-0.4'});
  if(!p||!bands[p.climate])return unavailable('该鱼种尚未建立天气规则',['鱼种参数']);
  if(!input.habitat||input.habitat==='unknown')return unavailable('请先确认淡水或海水',['水域类型']);
  if(p.habitat!==input.habitat)return unavailable('与所选水域类型不匹配');
  if(finite(input.weatherCode)&&input.weatherCode>=95){reasons.push('当地天气预报显示雷暴');return unavailable('雷暴天气，暂停出钓建议');}
  if(!finite(input.temperature)||input.temperature< -80||input.temperature>60)missing.push('逐小时气温');
  if(!finite(input.windSpeed)||input.windSpeed<0)missing.push('逐小时风速');
  if(missing.length)return unavailable('天气数据不足，暂不判断',missing);
  const add=(name,score,weight)=>factors.push({name,score,weight});
  const rule=bands[p.climate],tempScore=thermal(input.temperature,rule);
  add('气温',tempScore,35);reasons.push(`气温 ${input.temperature.toFixed(1)}°C · 该鱼种实验天气参考区间 ${rule.ideal.join('–')}°C，气温项 ${Math.round(tempScore)}分（非水温）`);
  const windLimit=p.style==='light'?10:p.style==='cover'?14:18;
  const windScore=input.windSpeed<5?85:input.windSpeed<=windLimit?100:clamp(100-(input.windSpeed-windLimit)*(p.style==='light'?5:4));
  add('风况',windScore,20);reasons.push(`风速 ${input.windSpeed.toFixed(1)}km/h · 风况项 ${Math.round(windScore)}分`);
  const sr=minutes(input.sunrise),ss=minutes(input.sunset),now=minutes(input.time);
  if(sr!==null&&ss!==null&&now!==null&&ss>sr){
   const twilight=Math.min(Math.abs(now-sr),Math.abs(now-ss))<=75,night=now<sr||now>ss;
   let lightScore=p.activity==='lowlight'?(twilight?95:night?90:50):p.activity==='daylight'?(night?35:twilight?80:90):(twilight?95:night?60:55);
   // Winter daytime catches prevent a blanket "cold day = no bite" rule.
   const mildWinterWindow=!night&&Number.isFinite(input.dayMean)&&input.dayMean<15&&input.temperature>=input.dayMean+2;
   if(mildWinterWindow)lightScore=Math.max(lightScore,80);
   add('光照时段',lightScore,30);reasons.push(`${twilight?'晨昏附近':night?'夜间':'白天'} · 鱼种时段项 ${lightScore}分${mildWinterWindow?' · 低温日内回暖窗口':''}`);
  }else missing.push('日出日落，时段项未计入');
  // Only explicit weather codes affect this experimental item. Rain probability
  // is not rainfall intensity, oxygen concentration or evidence of fish activity.
  const weatherScores={0:75,1:85,2:85,3:85,45:60,48:45,51:80,53:75,55:65,56:30,57:20,61:70,63:55,65:35,66:25,67:15,71:40,73:30,75:20,77:30,80:60,81:45,82:25,85:30,86:20};
  if(finite(input.weatherCode)&&weatherScores[input.weatherCode]!==undefined){const score=weatherScores[input.weatherCode];add('天气现象',score,5);reasons.push(`天气现象代码 ${input.weatherCode} · 实验天气项 ${score}分`);}else missing.push('天气现象，天气项未计入');
  if(finite(input.dayChange)){
   const cooling=Math.max(0,-input.dayChange),sensitivity=p.style==='cover'?7:4;
   const stability=clamp(90-Math.max(0,cooling-2)*sensitivity);
   add('天气稳定性',stability,10);reasons.push(`日均气温较前日 ${input.dayChange>=0?'+':''}${input.dayChange.toFixed(1)}°C · 稳定性参考 ${Math.round(stability)}分（非水温变化）`);
  }
  const total=factors.reduce((n,f)=>n+f.weight,0),weighted=factors.reduce((n,f)=>n+f.score*f.weight,0)/total;
  // Conservatively compress uncalibrated weather heuristics; 85 is not 85% odds.
  const score=Math.round(clamp(Math.min(weighted,tempScore+30))*.85);
  reasons.push(finite(input.pressure)?`气压 ${input.pressure.toFixed(1)}hPa，仅展示，不据单点气压推断鱼口`:'气压未返回，不影响评分');
  reasons.push(finite(input.windDirection)?`风来自 ${Math.round(input.windDirection)}°；未设岸线朝向，风向不单独加减分`:'风向未返回，不影响评分');
  if(finite(input.precipitationChance))reasons.push(`降水概率 ${Math.round(input.precipitationChance*100)}%；不据此推断雨强或溶氧`);
  return {score,label:score>=70?'天气条件较有利':score>=45?'天气条件一般':'天气条件偏弱',reasons,missing,factors,version:'weather-0.4'};
 }
 function rank(profiles,hours,focusHour){return profiles.map((profile,index)=>{
  const results=hours.map(input=>({input,...evaluate(profile,input)}));
  const current=results.find(r=>Number(r.input.time.slice(11,13))===focusHour)||{score:null,label:'天气数据不足，暂不判断',reasons:[],missing:['逐小时天气']};
  const best=results.filter(r=>finite(r.score)).sort((a,b)=>b.score-a.score)[0];
  return {profile,index,results,current,best};
 }).sort((a,b)=>(b.current.score??-1)-(a.current.score??-1)||a.index-b.index);}
 const api={profiles,bands,evaluate,thermal,rank};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BiteModel=api;
})(globalThis);
