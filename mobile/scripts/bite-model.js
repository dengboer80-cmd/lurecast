/* Experimental, explainable condition index v0.1. Not a bite probability. */
(function(root){
 const profiles=[
  {id:'culter',name:'翘嘴鲌',habitat:'fresh',ideal:[18,28],tolerance:[6,34],dawn:true,bait:'米诺 / 亮片'},
  {id:'seabass',name:'中国花鲈',habitat:'sea',ideal:[15,25],tolerance:[5,32],dawn:true,bait:'米诺 / 软饵'},
  {id:'seabream',name:'黑鲷',habitat:'sea',ideal:[16,26],tolerance:[8,32],dawn:false,bait:'小型软饵 / 虾型饵'},
  {id:'bass',name:'大口黑鲈',habitat:'fresh',ideal:[18,27],tolerance:[5,34],dawn:true,bait:'软虫 / 摇摆饵'},
  {id:'mandarin',name:'鳜',habitat:'fresh',ideal:[18,28],tolerance:[5,34],dawn:true,bait:'软饵 / 沉水米诺'},
  {id:'snakehead',name:'乌鳢',habitat:'fresh',ideal:[22,30],tolerance:[10,36],dawn:true,bait:'雷蛙 / 软饵'}
 ];
 const finite=Number.isFinite,clamp=n=>Math.max(0,Math.min(100,n));
 function thermal(t,p){const [a,b]=p.ideal,[low,high]=p.tolerance;if(t>=a&&t<=b)return 100;return clamp(t<a?(t-low)/(a-low)*100:(high-t)/(high-b)*100);}
 function minutes(iso){if(typeof iso!=='string'||!iso.includes('T'))return null;const h=Number(iso.slice(11,13)),m=Number(iso.slice(14,16));return finite(h)&&finite(m)?h*60+m:null;}
 function evaluate(p,input){
  const reasons=[],missing=[];
  if(!p)return {score:null,label:'该鱼种尚未建立规则',reasons,missing:['鱼种参数']};
  if(input.habitat==='unknown')return {score:null,label:'请先确认淡水或海水',reasons,missing:['水域类型']};
  if(input.habitat&&p.habitat!==input.habitat)return {score:null,label:'与所选水域类型不匹配',reasons,missing:[]};
  if(finite(input.weatherCode)&&input.weatherCode>=95)return {score:null,label:'雷暴天气，暂停出钓建议',reasons:['天气代码显示雷暴'],missing:[]};
  if(!finite(input.waterTemperature))missing.push('水温');
  if(!finite(input.windSpeed))missing.push('逐小时风速');
  if(missing.length)return {score:null,label:'数据不足，暂不判断',reasons,missing};
  const tempScore=thermal(input.waterTemperature,p);reasons.push(`水温 ${input.waterTemperature.toFixed(1)}°C · 实验偏好区间 ${p.ideal.join('–')}°C，温度分 ${Math.round(tempScore)}`);
  const windScore=input.windSpeed<5?80:input.windSpeed<=18?100:clamp(100-(input.windSpeed-18)*4);reasons.push(`风速 ${input.windSpeed.toFixed(1)}km/h · 风况分 ${Math.round(windScore)}`);
  const sr=minutes(input.sunrise),ss=minutes(input.sunset),now=minutes(input.time);let lightScore=null;
  if(sr!==null&&ss!==null&&now!==null){const twilight=Math.min(Math.abs(now-sr),Math.abs(now-ss))<=90,night=now<sr||now>ss;lightScore=p.dawn?(twilight?100:night?75:60):(night?55:twilight?90:85);reasons.push(`${twilight?'晨昏附近':night?'夜间':'白天'} · 光照时段分 ${lightScore}`);}else missing.push('日出日落，光照项未计入');
  // Temperature is the limiting factor; a severe mismatch cannot earn a high total.
  const base=(tempScore*65+windScore*20+(lightScore??0)*15)/(lightScore===null?.85:1)/100;
  const score=Math.round(Math.min(base,tempScore+25));
  reasons.push(finite(input.windDirection)?`风来自 ${Math.round(input.windDirection)}°；未设岸线朝向，不将风向机械加减分`:'风向缺失，未计分');
  reasons.push(finite(input.precipitationChance)?`降水概率 ${Math.round(input.precipitationChance*100)}%；不据此推断溶氧或鱼群`:'降水概率缺失，未计分');
  return {score,label:score>=75?'有口条件较好':score>=50?'有口条件一般':'有口条件偏弱',reasons,missing,version:'experimental-0.1'};
 }
 const api={profiles,evaluate,thermal};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BiteModel=api;
})(globalThis);
