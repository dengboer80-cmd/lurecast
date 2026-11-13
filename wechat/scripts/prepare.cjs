const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'wechat/miniprogram');
function write(file,text){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);}
function source(name){return fs.readFileSync(path.join(root,'mobile/scripts',name),'utf8');}
for(const name of ['bite-model.js','free-data.js','tide-data.js','nation-data.js']){
 const safe=source(name).replace(/\}\)\(globalThis\);?\s*$/, "})(typeof globalThis==='undefined'?{}:globalThis);\n");
 write(path.join(out,'lib',name),safe);
 if(['free-data.js','nation-data.js'].includes(name))write(path.join(root,'wechat/cloudfunctions/lurecastData/lib',name),safe);
}
const context=vm.createContext({});for(const n of ['fish-data.js','bite-model.js','species-rules.js'])vm.runInContext(source(n),context);
write(path.join(out,'lib/fish-profiles.js'),'// Generated from the existing LureCast source. Run npm run prepare in wechat/.\nmodule.exports='+JSON.stringify(context.BiteModel.profiles)+';\n');
const tides=require(path.join(out,'lib/tide-data.js'));
for(const station of tides.stations)for(const year of [2026,2027]){
 const read=kind=>fs.readFileSync(path.join(root,`mobile/data/tides/${station.id}-${year}-${kind}.csv`),'utf8');
 write(path.join(out,`packages/tides/data/${station.id}-${year}.js`),'// Official HKO annual CSV, preserved without interpolation.\nmodule.exports='+JSON.stringify({year,station:station.id,hourlyCSV:read('HHOT'),extremesCSV:read('HLT')})+';\n');
}
console.log('Prepared shared weather rules, 97 fish profiles, and official offline tide years 2026–2027.');

write(path.join(out,'packages/tides/tide-years.js'),'module.exports={'+tides.stations.map(s=>JSON.stringify(s.id)+':{'+[2026,2027].map(y=>JSON.stringify(y)+':require(\"./data/'+s.id+'-'+y+'.js\")').join(',')+'}').join(',')+'};\n');

for(const name of ["record-schema.js","fish-profiles.js"])write(path.join(root,"wechat/cloudfunctions/lurecastData/lib",name),fs.readFileSync(path.join(out,"lib",name),"utf8"));
