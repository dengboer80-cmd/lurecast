const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const places=require('../scripts/nation-data.js');
test('Chinese search keeps ambiguous places separate and filters province',()=>{const raw={results:[{name:'杭州',admin1:'浙江省',country_code:'CN',latitude:30.29,longitude:120.16,population:1000},{name:'杭州',admin1:'四川省',country_code:'CN',latitude:30.06,longitude:102.19},{name:'外部',country_code:'US',latitude:30,longitude:120}]};assert.equal(places.normalize([raw]).length,2);assert.equal(places.normalize([raw],'浙江')[0].lng,120.16);assert.equal(places.normalize([raw],'四川')[0].lng,102.19);assert.equal(new URL(places.url('北京')).searchParams.get('countryCode'),'CN');assert.equal(places.provinces.length,34);});
test('invalid coordinates cannot become selectable locations',()=>{for(const p of [{lat:null,lng:120},{lat:91,lng:120},{lat:30,lng:NaN},{lat:'30',lng:120}])assert.equal(places.valid(p),false);assert.equal(places.valid({lat:0,lng:0}),true);});
const context=vm.createContext({});for(const file of ['fish-data.js','bite-model.js','species-rules.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../scripts',file),'utf8'),context);const model=context.BiteModel;
test('every catalogue entry has a unique atlas slot and valid experiment parameters',()=>{assert.equal(model.profiles.length,97);assert.equal(new Set(model.profiles.map(p=>p.id)).size,97);assert.equal(new Set(model.profiles.map(p=>p.artIndex)).size,97);for(const p of model.profiles){assert.ok(model.bands[p.climate]);assert.ok(['twilight','daylight','lowlight'].includes(p.activity));assert.ok(p.group);assert.ok(fs.existsSync(require('node:path').join(__dirname,'../assets/fish-species-'+Math.floor(p.artIndex/15)+'.webp')));}});
test('same location weather produces different fish responses; location weather changes conditions',()=>{const base={habitat:'fresh',time:'2026-10-29T06:00',sunrise:'2026-10-29T06:15',sunset:'2026-10-29T17:15',windSpeed:8,temperature:12};const snake=model.profiles.find(p=>p.id==='snakehead'),trout=model.profiles.find(p=>p.name==='虹鳟');assert.ok(model.evaluate(trout,base).score>model.evaluate(snake,base).score);assert.ok(model.evaluate(snake,{...base,temperature:26}).score>model.evaluate(snake,base).score);assert.ok(model.evaluate(trout,{...base,windSpeed:40}).score<model.evaluate(trout,base).score);assert.equal(model.evaluate(snake,{...base,habitat:'unknown'}).score,null);});
test('weather ranking compares all candidates before slicing, puts unavailable last, and ties stay stable',()=>{
 const hours=[{habitat:'fresh',time:'2026-11-04T12:00',sunrise:'2026-11-04T06:00',sunset:'2026-11-04T18:00',temperature:24,windSpeed:8,weatherCode:3}];
 const profiles=model.profiles.filter(p=>p.domestic),ranked=model.rank(profiles,hours,12);
 assert.ok(ranked.length>12);assert.ok(ranked.every((r,i)=>i===0||(ranked[i-1].current.score??-1)>=(r.current.score??-1)));
 const firstMissing=ranked.findIndex(r=>r.current.score===null);assert.ok(firstMissing>0);assert.ok(ranked.slice(firstMissing).every(r=>r.current.score===null));
 const ties=model.rank([profiles[0],profiles[0]],hours,12);assert.deepEqual(Array.from(ties,r=>r.index),[0,1]);
 const dawn=model.rank(profiles,[{...hours[0],time:'2026-11-04T06:00'}],6);assert.notDeepEqual(Array.from(ranked,r=>r.profile.id),Array.from(dawn,r=>r.profile.id));
 const missing=model.rank(profiles,[],12);assert.ok(missing.every(r=>r.current.score===null));
});
test('domestic experience differentiates low light, light tackle wind, and cooling without treating air as water',()=>{
 const mandarin=model.profiles.find(p=>p.id==='mandarin'),snake=model.profiles.find(p=>p.id==='snakehead'),stream=model.profiles.find(p=>p.name==='马口鱼');
 const day={habitat:'fresh',time:'2026-11-04T12:00',sunrise:'2026-11-04T06:00',sunset:'2026-11-04T18:00',temperature:24,windSpeed:8,weatherCode:3};
 assert.ok(model.evaluate(mandarin,{...day,time:'2026-11-04T20:00'}).score>model.evaluate(mandarin,day).score);
 assert.ok(model.evaluate(snake,day).score>model.evaluate(snake,{...day,time:'2026-11-04T20:00'}).score);
 assert.ok(model.evaluate(stream,{...day,windSpeed:25}).score<model.evaluate(stream,day).score);
 assert.ok(model.evaluate(snake,{...day,dayChange:-8}).score<model.evaluate(snake,{...day,dayChange:0}).score);
 assert.ok(model.evaluate(mandarin,{...day,temperature:8}).score>0);
 assert.equal(model.evaluate(mandarin,{...day,waterTemperature:40}).score,model.evaluate(mandarin,day).score);
 assert.ok(model.profiles.find(p=>p.id==='bass').origin.includes('引入'));
 assert.ok(!model.profiles.find(p=>p.name==='巨骨舌鱼').domestic);
});
