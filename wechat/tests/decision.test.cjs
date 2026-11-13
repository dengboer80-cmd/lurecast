const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const D=require('../miniprogram/lib/decision'),schema=require('../miniprogram/lib/record-schema');
const {createRecords}=require('../cloudfunctions/lurecastData/records');
const place={name:'私密钓点',lat:30.27,lng:120.15,type:'fresh',species:['mandarin'],water:2};
const hours=Array.from({length:24},(_,h)=>({time:'2026-11-13T'+String(h).padStart(2,'0')+':00',habitat:'fresh',temperature:20,windSpeed:6,weatherCode:3,sunrise:'2026-11-13T06:00',sunset:'2026-11-13T18:00'}));
test('confirmed species constrain recommendations without inventing distribution; later windows exclude elapsed hours',()=>{
 const r=D.recommend(place,hours,14);
 assert.equal(r.id,'mandarin');assert.equal(r.confirmed,true);assert.ok(r.windowHour>=14);
 assert.ok(r.layer&&r.retrieve&&r.fallback&&r.reasons.length);
 assert.equal(D.recommend(place,hours.map(h=>({...h,weatherCode:95})),14),null);
 assert.equal(D.species({...place,type:'sea'}).length,0);
 assert.equal(D.recommend({...place,species:[]},hours,14).confirmed,false);
 const future=D.recommend(place,hours,12,0);
 assert.ok(future.windowHour<12); // morning remains eligible for a future date
 const snap=D.snapshot(r,{hours,days:[{date:'2026-11-13'}],retrievedAt:'2026-11-13T04:00:00Z'},'2026-11-13');
 assert.match(snap.weatherSummary,/20°C/);assert.equal(snap.fish,'鳜');
 hours[14].temperature=30;assert.match(snap.weatherSummary,/20°C/);hours[14].temperature=20;
});
test('shared validation rejects invented fish, conflicting catches and invalid effort; zero-catch sessions count',()=>{
 assert.equal(schema.point({...place,species:['seabass']}),null);
 assert.equal(schema.point({...place,species:['invented']}),null);
 assert.equal(schema.point({...place,water:6}),null);
 const base={targetId:'mandarin',minutes:120,contact:'no',caught:0,bait:'软饵',note:''};
 assert.ok(schema.review(base));assert.equal(schema.review({...base,caught:1}),null);
 assert.equal(schema.review({...base,minutes:0}),null);assert.equal(schema.review({...base,minutes:Infinity}),null);
 assert.equal(schema.review({...base,targetId:'bogus'}),null);
 const stats=D.stats([{place,review:base},{place,review:{...base,minutes:60,contact:'yes',caught:1}},{place,review:{...base,contact:'unknown'}},{place}]);
 assert.equal(stats.count,3);assert.equal(stats.contacts,1);assert.equal(stats.caught,1);assert.equal(stats.hours,5);assert.equal(stats.unknown,1);assert.equal(stats.groups.length,1);assert.match(stats.note,/较少/);
});
function database(){
 const rows=new Map();return {rows,collection(){return {
 async add({data}){if(rows.has(data._id))throw Error('duplicate');rows.set(data._id,structuredClone(data));},
 where(q){const matching=()=>[...rows.values()].filter(r=>Object.entries(q).every(([k,v])=>r[k]===v));const api={orderBy(){return api;},limit(){return api;},async get(){return {data:structuredClone(matching())};},async update({data}){const found=matching();for(const r of found)for(const [k,v] of Object.entries(data)){if(k.startsWith('record.'))r.record[k.slice(7)]=structuredClone(v);else r[k]=structuredClone(v);}return {stats:{updated:found.length}};},async remove(){matching().forEach(r=>rows.delete(r._id));}};return api;}
 };}};
}
test('cloud point edits and reviews remain isolated by trusted owner and retain immutable snapshots',async()=>{
 const db=database(),call=createRecords(db),owner='a';
 const point={...place,id:'private-1'};
 assert.ok((await call({kind:'points',operation:'add',record:point},owner)).ok);
 assert.ok((await call({kind:'points',operation:'edit',id:point.id,record:{...point,name:'stolen'}},'b')).error);
 assert.ok((await call({kind:'points',operation:'edit',id:point.id,record:{...point,water:1}},owner)).ok);
 assert.equal((await call({kind:'points',operation:'list'},owner)).items[0].water,1);
 const snapshot={fish:'鳜',score:70,window:'18:00',bait:'软饵',confirmed:true};
 assert.ok((await call({kind:'plans',operation:'add',record:{place,date:'2026-11-13',snapshot}},owner)).ok);
 const saved=(await call({kind:'plans',operation:'list'},owner)).items[0];
 const review={targetId:'mandarin',minutes:90,contact:'no',caught:0,bait:'软饵',note:'空军'};
 const request={kind:'plans',operation:'review',id:saved.id,record:review,owner:'a'};
 assert.ok((await call(request,'b')).error);
 assert.ok((await call({...request,record:{...review,targetId:'seabass'}},owner)).error);
 assert.ok((await call({...request,record:{...review,caught:2}},owner)).error);
 assert.ok((await call(request,owner)).ok);
 const after=(await call({kind:'plans',operation:'list'},owner)).items[0];
 assert.equal(after.review.caught,0);assert.equal(after.review.minutes,90);assert.ok(after.review.completedAt);assert.deepEqual(after.snapshot,saved.snapshot);
 assert.deepEqual((await call({kind:'plans',operation:'list'},'b')).items,[]);
 await call({kind:'plans',operation:'remove',id:saved.id},owner);
 assert.equal((await call({kind:'plans',operation:'list'},owner)).items.length,0);
});
function page(name){
 const base=path.resolve(__dirname,'../miniprogram');
 for(const key of Object.keys(require.cache))if(key.startsWith(base))delete require.cache[key];
 const values=new Map();global.wx={getStorageSync:k=>values.get(k),setStorageSync:(k,v)=>values.set(k,structuredClone(v)),showToast(){},pageScrollTo(){},switchTab(){}};global.getApp=()=>({globalData:{cloudReady:false}});
 let spec;global.Page=p=>spec=p;const S=require('../miniprogram/lib/state');require('../miniprogram/'+name+'/index');
 return {S,values,p:{...spec,data:structuredClone(spec.data),setData(v){Object.assign(this.data,v);}}};
}
test('guest point edits roundtrip species and guest reviews persist without changing plan details',async()=>{
 let {p,S,values}=page('pages/points');
 p.setData({name:place.name,lat:String(place.lat),lng:String(place.lng),species:place.species,waterIndex:2});await p.save();
 assert.deepEqual(values.get('wx-lc-points')[0].species,['mandarin']);
 p.editPoint({currentTarget:{dataset:{index:0}}});p.setData({name:'改名'});await p.save();
 assert.equal(values.get('wx-lc-points').length,1);assert.equal(values.get('wx-lc-points')[0].name,'改名');
 ({p,S,values}=page('pages/plans'));
 S.state.place=place;S.state.date=S.dateKeys()[0];S.addPlan({fish:'鳜',score:70});await p.onShow();
 const plan=p.data.plans[0],targetIndex=plan.reviewChoices.indexOf('mandarin')+1;
 const input=(field,value)=>p.reviewInput({currentTarget:{dataset:{id:plan.id,field}},detail:{value}});
 input('targetIndex',targetIndex);input('minutes','60');input('contactIndex',2);input('caught','');input('bait','米诺');
 await p.saveReview({currentTarget:{dataset:{id:plan.id}}});assert.equal(p.data.stats.count,0); // blank isn't zero
 input('caught','0');await p.saveReview({currentTarget:{dataset:{id:plan.id}}});
 assert.equal(p.data.stats.count,1);assert.equal(p.data.stats.hours,1);assert.equal(S.plans()[0].review.caught,0);assert.equal(S.plans()[0].time,'06:00');assert.equal(S.plans()[0].snapshot.fish,'鳜');
 await p.onShow();assert.equal(p.data.stats.count,1);
});

test('cloud independent trips accept custom fish and weather while allowing same-day sessions without cross-account reads',async()=>{
 const call=createRecords(database());
 const review={targetName:'本地鱼',fishType:'俗名',minutes:120,contact:'yes',hooked:true,caught:null,bait:'亮片'};
 const record={entryId:'trip-session-one',place,date:'2026-11-13',time:'09:20',review,weather:{source:'manual',date:'2026-11-13',time:'09:20',observed:'晴，微风'}};
 assert.ok((await call({kind:'plans',operation:'add',record},'a')).ok);
 assert.ok((await call({kind:'plans',operation:'add',record:{...record,entryId:'trip-session-two'}},'a')).ok);
 const list=await call({kind:'plans',operation:'list'},'a');assert.equal(list.items.length,2);assert.equal(list.items[0].review.hooked,true);assert.equal(list.items[0].review.caught,null);assert.equal(list.items[0].weather.observed,'晴，微风');assert.equal(list.items[0].time,'09:20');
 assert.deepEqual((await call({kind:'plans',operation:'list'},'b')).items,[]);
 assert.ok((await call({kind:'plans',operation:'review',id:list.items[0].id,record:{...review,minutes:60}},'b')).error);
 assert.ok((await call({kind:'plans',operation:'review',id:list.items[0].id,record:{...review,minutes:60}},'a')).ok);
 assert.ok((await call({kind:'plans',operation:'add',record:{...record,entryId:'invalid-id'}},'a')).error);
});
