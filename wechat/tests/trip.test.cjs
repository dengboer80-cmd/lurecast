const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
function setup(name){
 const base=path.resolve(__dirname,'../miniprogram');for(const key of Object.keys(require.cache))if(key.startsWith(base))delete require.cache[key];
 const values=new Map();global.wx={getStorageSync:k=>values.get(k),setStorageSync:(k,v)=>values.set(k,structuredClone(v)),showToast(){},navigateBack(){},navigateTo(){},pageScrollTo(){}};global.getApp=()=>({globalData:{cloudReady:false}});
 let spec;global.Page=p=>spec=p;const S=require('../miniprogram/lib/state');require('../miniprogram/'+name+'/index');const p={...spec,data:structuredClone(spec.data),setData(v){Object.assign(this.data,v);}};return {p,S,values};
}
test('location forms hide coordinates and picker returns a location without changing home',()=>{
 for(const file of ['points','locations','record'])assert.doesNotMatch(fs.readFileSync(path.resolve(__dirname,'../miniprogram/pages/'+file+'/index.wxml'),'utf8'),/(?:data-field="(?:lat|lng)"|WGS84|\{\{item\.(?:lat|lng)\}\})/);
 const {p,S}=setup('pages/locations'),original={...S.state.place};p.onLoad({pick:'1'});p.use({name:'尤溪',lat:26.17,lng:118.19,type:'fresh'});
 assert.equal(S.state.pickedPlace.name,'尤溪');assert.deepEqual(S.state.place,original);
});
test('trip journal supports custom fish, manual past weather, effort, bite and hooked separately and multiple sessions',async()=>{
 const {p,S}=setup('pages/record');p.onLoad();
 let requests=0;S.call=async()=>{requests++;throw Error('offline');};
 p.setData({date:'2025-01-01'});await p.fetchWeather();assert.equal(requests,0);assert.match(p.data.weatherStatus,/历史/);
 p.setData({name:'秘密标点',targetName:'本地自填鱼',fishType:'当地俗名',minutes:'90',contactIndex:1,hookIndex:1,bait:'3克亮片',observed:'阴天微风'});
 await p.save();const saved=S.plans()[0];assert.equal(saved.place.name,'秘密标点');assert.equal(saved.date,'2025-01-01');assert.equal(saved.review.minutes,90);assert.equal(saved.review.targetName,'本地自填鱼');assert.equal(saved.review.hooked,true);assert.equal(saved.review.caught,null);assert.equal(saved.weather.source,'manual');assert.equal(saved.weather.observed,'阴天微风');
 p.onLoad();p.setData({date:'2025-01-01',targetName:'另一种鱼',observed:'',weather:null,minutes:'60',contactIndex:2,hookIndex:2,bait:'软虫',weatherLoading:false});await p.save();assert.equal(S.plans().length,2);assert.equal(S.plans()[1].review.hooked,false);assert.equal(S.plans()[1].weather.source,'unavailable');
});
test('weather snapshot is frozen at selected date/hour and stale location response cannot overwrite new location',async()=>{
 const {p,S}=setup('pages/record');p.onLoad();p.setData({time:'09:20'});
 const raw=t=>({daily:{time:[p.data.date],temperature_2m_min:[t],temperature_2m_max:[t+2]},hourly:{time:[p.data.date+'T09:00'],temperature_2m:[t],wind_speed_10m:[8],weather_code:[3]}});
 const pending=[];S.call=()=>new Promise(resolve=>pending.push(resolve));const first=p.fetchWeather();p.setData({place:{name:'北京',lat:39.9,lng:116.4,type:'fresh'}});const second=p.fetchWeather();
 pending[1]({weather:raw(12),retrievedAt:'2026-11-13T01:30:00Z'});await second;pending[0]({weather:raw(25),retrievedAt:'2026-11-13T01:00:00Z'});await first;
 assert.match(p.data.weather.summary,/12°C/);assert.equal(p.data.weather.time,'09:20');
 p.setData({targetName:'马口鱼',minutes:'60',contactIndex:2,hookIndex:2,bait:'亮片'});await p.save();const saved=S.plans()[0];assert.equal(saved.weather.source,'forecast');assert.equal(saved.place.name,'杭州'); // custom name remains independently editable
 assert.equal(saved.place.lat,39.9);p.setData({weather:null});assert.match(saved.weather.summary,/12°C/);
});
test('custom fish schema does not silently assign an unrelated model or invent caught counts',()=>{
 const schema=require('../miniprogram/lib/record-schema');const review=schema.review({targetId:'mandarin',targetName:'本地未知鱼',minutes:60,contact:'yes',hooked:true,caught:null,bait:'米诺'});
 assert.equal(review.targetId,'');assert.equal(review.caught,null);assert.equal(schema.review({...review,contact:'no'}),null);
 assert.deepEqual(schema.point({name:'钓点',lat:30,lng:120,type:'fresh',customSpecies:['白条']}).customSpecies,['白条']);
});
