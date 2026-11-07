const {createHash}=require('node:crypto');
const maxAvatarBytes=192*1024;
const pngHeader=Buffer.from([137,80,78,71,13,10,26,10]);

function createProfileService(db){
 return async function profile(event,owner){
  if(!owner)return {error:{message:'请从微信小程序登录'}};
  if(!['get','create'].includes(event.operation))return {error:{message:'不支持的资料操作'}};
  const table=db.collection('lurecast_records');
  const id=createHash('sha256').update(JSON.stringify([owner,'profile'])).digest('hex').slice(0,32);
  async function find(){
   const {data}=await table.where({_id:id,owner,kind:'profile'}).limit(1).get();
   return data.length?data[0].record:null;
  }
  try{
   const existing=await find();
   if(existing||event.operation==='get')return {profile:existing};
   const nickname=typeof event.nickname==='string'?event.nickname.trim():'';
   if(!nickname||nickname.length>64)return {error:{message:'请填写有效的微信昵称'}};
   const avatar=event.avatar;
   if(typeof avatar!=='string'||!avatar.length||avatar.length>Math.ceil(maxAvatarBytes/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(avatar)){
    return {error:{message:'头像过大或格式不支持，请重新选择'}};
   }
   const bytes=Buffer.from(avatar,'base64');
   const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
   const png=bytes.subarray(0,8).equals(pngHeader);
   if(bytes.length>maxAvatarBytes||(!jpeg&&!png))return {error:{message:'请选用 PNG 或 JPEG 头像'}};
   const avatarKey=createHash('sha256').update(bytes).digest('hex');
   const record={nickname,avatar,avatarKey,extension:jpeg?'jpg':'png'};
   try{
    await table.add({data:{_id:id,owner,kind:'profile',record}});
    return {profile:record};
   }catch(e){
    const first=await find();
    if(first)return {profile:first};
    throw e;
   }
  }catch(e){
   console.error('Profile operation failed',event.operation,e.errCode||e.code||'unknown');
   return {error:{message:'微信资料暂不可用，请稍后重试'}};
  }
 };
}
module.exports={createProfileService};
