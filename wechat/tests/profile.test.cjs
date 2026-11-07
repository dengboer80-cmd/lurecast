const test=require('node:test');
const assert=require('node:assert/strict');
const {createProfileService}=require('../cloudfunctions/lurecastData/profile');

test('the first profile wins, including concurrent saves, and stays private',async()=>{
 const rows=new Map();
 const table={
  where(query){return {limit(){return {async get(){
   const row=rows.get(query._id);
   return {data:row&&row.owner===query.owner&&row.kind===query.kind?[row]:[]};
  }};}};},
  async add({data}){
   if(rows.has(data._id))throw Error('duplicate key');
   rows.set(data._id,data);
  }
 };
 const profile=createProfileService({collection:()=>table});
 const avatar=Buffer.from([255,216,255,217]).toString('base64');
 const get=(owner,fields={})=>profile({operation:'get',...fields},owner);
 const save=(owner,nickname)=>profile({operation:'create',nickname,avatar},owner);
 assert.ok((await get()).error);
 assert.equal((await get('a')).profile,null);
 assert.ok((await profile({operation:'create',nickname:'测试',avatar:'bad'},'a')).error);
 const [first,second]=await Promise.all([save('a','首次昵称'),save('a','另一个昵称')]);
 assert.equal(first.profile.nickname,'首次昵称');
 assert.deepEqual(second,first);
 assert.deepEqual(await save('a','更新后的微信昵称'),first);
 assert.equal((await get('b',{owner:'a'})).profile,null);
 assert.equal((await save('b','第二位用户')).profile.nickname,'第二位用户');
 assert.equal((await get('a')).profile.nickname,'首次昵称');
});
