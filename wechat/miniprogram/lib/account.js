const S=require('./state');
const sessionKey='wx-lc-account-enabled';
const signedIn=()=>S.read(sessionKey,false)===true;
const request=(kind,operation,data={})=>S.call('records',{kind,operation,...data});

async function list(kind){
 const items=[];
 let cursor='';
 do{
  const page=await request(kind,'list',{cursor});
  items.push(...page.items);
  cursor=page.cursor;
 }while(cursor);
 return items;
}

async function login(){
 const items=await list('plans');
 if(!S.write(sessionKey,true))throw Error('无法保存登录状态');
 return items;
}

async function displayProfile(record){
 if(!record)return null;
 const {nickname,avatar,avatarKey,extension}=record;
 if(!/^[a-f0-9]{64}$/.test(avatarKey)||!['png','jpg'].includes(extension))throw Error('头像格式无效');
 const avatarPath=wx.env.USER_DATA_PATH+'/lurecast-avatar-'+avatarKey+'.'+extension;
 const fs=wx.getFileSystemManager();
 try{fs.accessSync(avatarPath);}
 catch(_){await new Promise((resolve,reject)=>fs.writeFile({filePath:avatarPath,data:avatar,encoding:'base64',success:resolve,fail:reject}));}
 return {nickname,avatarPath};
}

async function getProfile(){
 const result=await S.call('profile',{operation:'get'});
 return displayProfile(result.profile);
}

async function createProfile(nickname,avatarPath){
 const fs=wx.getFileSystemManager();
 const read=path=>new Promise((resolve,reject)=>fs.readFile({filePath:path,encoding:'base64',success:r=>resolve(r.data),fail:reject}));
 let avatar=await read(avatarPath);
 if(avatar.length>262144){
  const image=await new Promise((resolve,reject)=>wx.compressImage({src:avatarPath,quality:65,compressedWidth:256,success:resolve,fail:reject}));
  avatar=await read(image.tempFilePath);
 }
 if(avatar.length>262144)throw Error('头像过大，请重新选择');
 const result=await S.call('profile',{operation:'create',nickname,avatar});
 return displayProfile(result.profile);
}

function logout(){return S.write(sessionKey,false);}
function error(e){wx.showToast({title:e.message||'操作失败，请重试',icon:'none'});}
module.exports={signedIn,request,list,login,logout,error,getProfile,createProfile};
