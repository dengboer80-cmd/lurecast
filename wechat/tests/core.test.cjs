const {test}=require('node:test'),assert=require('node:assert/strict');
const B=require('../miniprogram/lib/bite-model'),profiles=require('../miniprogram/lib/fish-profiles'),T=require('../miniprogram/lib/tide-data');
const {createService}=require('../cloudfunctions/lurecastData/core');
const raw={daily:{time:['2026-11-07'],temperature_2m_min:[10],temperature_2m_max:[20]},hourly:{time:['2026-11-07T06:00'],temperature_2m:[16],wind_speed_10m:[8]}};
test('WeChat fish rules match existing 97-species catalogue and rank globally without water input',()=>{assert.equal(profiles.length,97);assert.equal(profiles.filter(p=>p.domestic).length,40);const input={habitat:'fresh',time:'2026-11-07T06:00',temperature:22,windSpeed:8,sunrise:'2026-11-07T06:10',sunset:'2026-11-07T17:10',weatherCode:3};const ranked=B.rank(profiles,[input],6);assert.equal(ranked.length,97);assert.ok(ranked.every((r,i)=>i===0||(ranked[i-1].current.score??-1)>=(r.current.score??-1)));assert.ok(ranked[0].current.score>0);assert.ok(ranked.at(-1).current.score===null);assert.ok(B.rank(profiles,[{...input,weatherCode:95}],6).every(r=>r.current.score===null));});
test('cloud service rejects untrusted requests and invalid coordinates before external calls',async()=>{let calls=0;const service=createService({context:()=>({OPENID:'test'}),enabled:()=>true,fetchJSON:async()=>{calls++;return raw;}});for(const event of [{action:'forecast',lat:'30',lng:120,habitat:'fresh'},{action:'forecast',lat:91,lng:120,habitat:'fresh'},{action:'search',query:'a'},{action:'search',query:'杭州',province:'invalid'},{action:'http',url:'http://127.0.0.1'}])assert.ok((await service(event)).error);assert.equal(calls,0);assert.equal((await createService({context:()=>({}),enabled:()=>true})({action:'forecast'})).error.code,'AUTH');assert.equal((await createService({context:()=>({OPENID:'x'}),enabled:()=>false})({action:'forecast'})).error.code,'NOT_CONFIGURED');});
test('freshwater skips marine; successful weather cache expires; marine failure does not fabricate data',async()=>{let calls=0,time=0;const urls=[];const service=createService({context:()=>({OPENID:'test'}),enabled:()=>true,now:()=>time,fetchJSON:async url=>{calls++;urls.push(url);if(url.includes('marine-api'))throw Error('unavailable');return raw;}});const event={action:'forecast',lat:30.2741,lng:120.1551,habitat:'fresh'};assert.ok((await service(event)).weather);assert.equal((await service(event)).marine,null);assert.equal(calls,1);time=600001;await service(event);assert.equal(calls,2);const coast=await service({...event,habitat:'sea'});assert.ok(coast.weather);assert.equal(coast.marine,null);assert.ok(urls.every(url=>new URL(url).protocol==='https:'));assert.ok(urls.some(url=>new URL(url).searchParams.get('latitude')==='30.274'));});
test('nationwide geocoder filters ambiguous province and provider failures have no fake results',async()=>{const service=createService({context:()=>({OPENID:'test'}),enabled:()=>true,fetchJSON:async url=>new URL(url).searchParams.get('countryCode')==='CN'?{results:[{name:'杭州',admin1:'浙江省',country_code:'CN',latitude:30.29,longitude:120.16},{name:'杭州',admin1:'四川省',country_code:'CN',latitude:30.06,longitude:102.19}]}:{results:[]}});const r=await service({action:'search',query:'杭州',province:'浙江'});assert.equal(r.results.length,1);assert.equal(r.results[0].lng,120.16);const failed=createService({context:()=>({OPENID:'x'}),enabled:()=>true,fetchJSON:async()=>{throw Error('down');}});assert.ok((await failed({action:'search',query:'杭州'})).error);assert.ok((await failed({action:'forecast',lat:30,lng:120,habitat:'fresh'})).error);});
test('cloud in-process limit bounds repeated warm-instance calls',async()=>{const service=createService({context:()=>({OPENID:'test'}),enabled:()=>true,now:()=>0,fetchJSON:async()=>raw});for(let i=0;i<20;i++)assert.ok(!(await service({action:'forecast',lat:30,lng:120,habitat:'fresh'})).error);assert.equal((await service({action:'forecast',lat:30,lng:120,habitat:'fresh'})).error.code,'RATE_LIMIT');});
test('offline official HKO data parses for every shipped station and year',()=>{const tables=require('../miniprogram/packages/tides/tide-years');for(const station of T.stations)for(const year of [2026,2027]){const data=tables[station.id][year],hours=T.hourly(data.hourlyCSV,year),events=T.extremes(data.extremesCSV,year);assert.equal(hours.length,8760);assert.ok(events.length>700);assert.ok(hours.every(h=>h.value===null||Number.isFinite(h.value)));}assert.ok(T.nearest({lat:30.2741,lng:120.1551})[0].distance>50);});

test('weather transient connections retry once and provider errors remain diagnosable',async()=>{
 const event={action:'forecast',lat:30.274,lng:120.155,habitat:'fresh'};
 let calls=0;
 const recovering=createService({context:()=>({OPENID:'x'}),enabled:()=>true,fetchJSON:async()=>{
  calls++;
  if(calls===1)throw Object.assign(Error('reset'),{code:'ECONNRESET'});
  return raw;
 }});
 assert.ok((await recovering(event)).weather);
 assert.equal(calls,2);
 for(const code of ['ENOTFOUND','SOURCE_HTTP_400','SOURCE_HTTP_429','SOURCE_TIMEOUT']){
  let attempts=0;
  const failing=createService({context:()=>({OPENID:'x'}),enabled:()=>true,fetchJSON:async()=>{
   attempts++;throw Object.assign(Error('upstream'),{code});
  }});
  const result=await failing(event);
  assert.equal(result.error.code,code);
  assert.ok(result.error.message.includes(code));
  assert.equal(attempts,code==='SOURCE_TIMEOUT'?2:1);
  assert.equal(result.weather,undefined);
 }
});
