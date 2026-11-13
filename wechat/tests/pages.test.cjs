const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
function setup(page){const values=new Map();global.wx={getStorageSync:k=>values.get(k),setStorageSync:(k,v)=>values.set(k,v),showToast(){},navigateTo(){},navigateBack(){},switchTab(){},pageScrollTo(){},setClipboardData(){},showModal(){}};global.getApp=()=>({globalData:{cloudReady:false}});let spec;global.Page=s=>{spec=s;};const statePath=path.resolve(__dirname,'../miniprogram/lib/state.js'),pagePath=path.resolve(__dirname,'../miniprogram/'+page+'.js');delete require.cache[statePath];delete require.cache[pagePath];const S=require(statePath);require(pagePath);const instance={...spec,data:structuredClone(spec.data||{}),setData(next){Object.assign(this.data,next);}};return {S,instance,values};}
test('native fish page filters, reranks time, and paginates with individual JPEG artwork references',()=>{const {S,instance:p}=setup('pages/fish/index');const date=S.dateKeys()[0];S.state.date=date;S.state.weather={days:[{date,temperatureMin:20,temperatureMax:26,sunrise:date+'T06:00',sunset:date+'T18:00'}],hours:Array.from({length:24},(_,h)=>({time:date+'T'+String(h).padStart(2,'0')+':00',temperature:24,windSpeed:8,weatherCode:3}))};p.draw();assert.equal(p.data.rows.length,12);assert.equal(p.data.count,require('../miniprogram/lib/fish-profiles').filter(f=>f.domestic&&f.habitat===S.state.place.type).length);assert.ok(p.data.rows.every((r,i)=>i===0||Number(p.data.rows[i-1].score)>=Number(r.score)));const dawn=p.data.rows.map(r=>r.id);p.hour({detail:{value:'12'}});assert.notDeepEqual(p.data.rows.map(r=>r.id),dawn);p.next();assert.equal(p.data.rows[0].rank,13);p.search({detail:{value:'桂鱼'}});assert.equal(p.data.rows.length,1);assert.equal(p.data.rows[0].name,'鳜');p.search({detail:{value:''}});p.scope({detail:{value:'1'}});assert.equal(p.data.count,97);assert.ok(p.data.rows.every(r=>/^\/assets\/fish\/fish-\d{1,2}\.jpg$/.test(r.image)));});
test('native tide page selects official data and never fabricates unshipped years',()=>{const {S,instance:p}=setup('packages/tides/index');S.state.date='2026-11-07';p.onLoad();assert.ok(p.data.events.length>=2);assert.ok(p.data.bars.length>=23);assert.ok(Number(p.data.distance)>50);p.station({detail:{value:'1'}});assert.equal(p.data.name,'鲗鱼涌');S.state.date='2028-01-01';p.draw();assert.equal(p.data.bars.length,0);assert.equal(p.data.events.length,0);assert.match(p.data.message,/不可用/);});
test('manual points do not turn blank coordinates into zero',()=>{const {instance:p,values}=setup('pages/points/index');p.setData({name:'测试钓点',lat:'',lng:''});p.save();assert.equal(values.has('wx-lc-points'),false);p.setData({lat:'26.17',lng:'118.19'});p.save();assert.equal(values.get('wx-lc-points').length,1);assert.equal(values.get('wx-lc-points')[0].name,'测试钓点');});

test('home recommends the highest eligible local-weather score and clears stale recommendations',()=>{
 const {S}=setup('pages/home/index');
 const viewPath=path.resolve(__dirname,'../miniprogram/lib/view.js');
 delete require.cache[viewPath];
 const V=require(viewPath),B=require('../miniprogram/lib/bite-model'),profiles=require('../miniprogram/lib/fish-profiles');
 const now=Date.parse('2026-11-13T06:00:00Z'),date=S.dateKeys(now)[0];
 S.state.date=date;S.state.place={name:'杭州',lat:30.27,lng:120.15,type:'fresh'};
 S.state.weather={days:[{date,temperatureMin:16,temperatureMax:24}],hours:[{time:date+'T14:00',temperature:20,windSpeed:6,weatherCode:3}]};
 const expected=B.rank(profiles.filter(p=>p.domestic&&p.habitat==='fresh'),S.fishHours(),14)[0];
 assert.equal(V.recommendedFish(now).id,expected.profile.id);
 assert.equal(V.recommendedFish(now).score,expected.current.score);
 S.state.place={name:'三亚',lat:18.25,lng:109.5,type:'sea'};
 S.state.weather.hours[0].temperature=28;
 const marine=V.recommendedFish(now);
 assert.equal(profiles.find(p=>p.id===marine.id).habitat,'sea');
 S.state.loading=true;
 assert.equal(V.recommendedFish(now),null);
 S.state.loading=false;S.state.weather.hours[0].weatherCode=95;
 assert.equal(V.recommendedFish(now),null);
 S.state.weather=null;
 assert.equal(V.recommendedFish(now),null);
});
