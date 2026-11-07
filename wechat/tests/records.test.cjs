const test=require('node:test');
const assert=require('node:assert/strict');
const {createRecords}=require('../cloudfunctions/lurecastData/records');

test('cloud records use the trusted account for every read, edit and delete',async()=>{
 const rows=new Map();
 const table={
  async add({data}){
   if(rows.has(data._id))throw Error('duplicate');
   rows.set(data._id,structuredClone(data));
  },
  where(query){
   const matches=()=>[...rows.values()].filter(row=>Object.keys(query).every(key=>row[key]===query[key]));
   const result={
    orderBy(){return result;},
    limit(){return result;},
    async get(){return {data:structuredClone(matches())};},
    async update({data}){
     const found=matches();
     for(const row of found){
      row.record.time=data['record.time'];
      row.record.note=data['record.note'];
     }
     return {stats:{updated:found.length}};
    },
    async remove(){for(const row of matches())rows.delete(row._id);}
   };
   return result;
  }
 };
 const records=createRecords({collection:()=>table});
 const plan={place:{name:'杭州',lat:30.27,lng:120.15,type:'fresh'},date:'2026-11-07'};
 const call=(operation,owner,params={})=>records({operation,kind:'plans',...params},owner);
 assert.ok((await call('list',undefined)).error);
 assert.ok((await call('add','account-a',{record:plan})).ok);
 assert.match((await call('add','account-a',{record:plan})).error.message,/已有/);
 const [saved]=(await call('list','account-a')).items;
 assert.deepEqual((await call('list','account-b',{owner:'account-a'})).items,[]);
 assert.ok((await call('edit','account-b',{id:saved.id,record:{time:'08:00',note:'他人'}})).error);
 await call('remove','account-b',{id:saved.id,owner:'account-a'});
 assert.ok((await call('edit','account-a',{id:saved.id,record:{time:'07:30',note:'出发'}})).ok);
 assert.equal((await call('list','account-a')).items[0].note,'出发');
 assert.ok((await call('add','account-b',{record:plan})).ok);
 await call('remove','account-a',{id:saved.id});
 assert.equal((await call('list','account-a')).items.length,0);
 assert.equal((await call('list','account-b')).items[0].note,'');
});
