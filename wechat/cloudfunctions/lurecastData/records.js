const {createHash}=require('node:crypto');
const F=require('./lib/free-data');
const collection='lurecast_records';
const kinds=new Set(['plans','points']);
const timePattern=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const datePattern=/^\d{4}-\d{2}-\d{2}$/;

const schema=require('./lib/record-schema');
const place=schema.point;

function createRecords(db){
 return async function records(event,owner){
  if(!owner)return {error:{message:'请从微信小程序登录'}};
  const {kind,operation}=event;
  if(!kinds.has(kind))return {error:{message:'记录类型无效'}};
  const table=db.collection(collection);
  const invalid=message=>({error:{message}});
  try{
   if(operation==='list'){
    const cursor=event.cursor;
    if(cursor&&!/^[a-f0-9]{32}$/.test(cursor))return invalid('分页参数无效');
    const query={owner,kind};
    if(cursor)query._id=db.command.gt(cursor);
    const {data}=await table.where(query).orderBy('_id','asc').limit(20).get();
    return {items:data.map(row=>row.record),cursor:data.length===20?data[19]._id:''};
   }
   const record=event.record||{};
   let id=event.id;
   let value;
   if(operation==='add'){
    const point=place(kind==='plans'?record.place:record);
    if(!point)return invalid('地点或坐标无效');
    if(kind==='plans'){
     if(typeof record.date!=='string'||!datePattern.test(record.date))return invalid('日期无效');
     id=F.locationKey(point)+':'+record.date;
     value={id,date:record.date,place:point,time:'06:00',note:'',snapshot:schema.snapshot(record.snapshot)};
    }else{
     id=record.id;
     value={...point,id};
    }
   }
   if(typeof id!=='string'||!id||id.length>120)return invalid('记录编号无效');
   const key=createHash('sha256').update(JSON.stringify([owner,kind,id])).digest('hex').slice(0,32);
   if(operation==='add'){
    try{
     await table.add({data:{_id:key,owner,kind,record:value}});
    }catch(e){
     const existing=await table.where({_id:key,owner,kind}).limit(1).get();
     if(!existing.data.length)throw e;
     return invalid(kind==='plans'?'该地点当天已有计划':'该钓点已保存');
    }
   }else if(operation==='edit'&&kind==='plans'){
    if(typeof record.time!=='string'||!timePattern.test(record.time)||typeof record.note!=='string')return invalid('时间或备注无效');
    const result=await table.where({_id:key,owner,kind}).update({data:{
     'record.time':record.time,'record.note':record.note.slice(0,300)
    }});
    if(!result.stats.updated){
     const existing=await table.where({_id:key,owner,kind}).limit(1).get();
     if(!existing.data.length)return invalid('计划已移除，请刷新');
    }
   }else if(operation==='edit'&&kind==='points'){
    const point=place(record);if(!point)return invalid('钓点或已知鱼种无效');
    const result=await table.where({_id:key,owner,kind}).update({data:{record:{...point,id}}});
    if(!result.stats.updated){const existing=await table.where({_id:key,owner,kind}).limit(1).get();if(!existing.data.length)return invalid('钓点已移除，请刷新');}
   }else if(operation==='review'&&kind==='plans'){
    const review=schema.review(record);
    if(!review)return invalid('请填写目标鱼、1–1440分钟作钓时长、鱼口、尾数和拟饵；有中鱼时应选有口');
    const existing=await table.where({_id:key,owner,kind}).limit(1).get();
    if(!existing.data.length)return invalid('计划已移除，请刷新');
    const fish=require('./lib/fish-profiles').find(p=>p.id===review.targetId);
    if(fish.habitat!==existing.data[0].record.place.type)return invalid('目标鱼与水域类型不匹配');
    review.completedAt=new Date().toISOString();
    await table.where({_id:key,owner,kind}).update({data:{'record.review':review}});
    return {ok:true,review};
   }else if(operation==='remove'){
    await table.where({_id:key,owner,kind}).remove();
   }else return invalid('不支持的记录操作');
   return {ok:true};
  }catch(e){
   console.error('Record operation failed',kind,operation,e.errCode||e.code||'unknown');
   return invalid('账号记录暂不可用，请稍后重试');
  }
 };
}
module.exports={createRecords};
