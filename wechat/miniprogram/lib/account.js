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

function logout(){return S.write(sessionKey,false);}
function error(e){wx.showToast({title:e.message||'操作失败，请重试',icon:'none'});}
module.exports={signedIn,request,list,login,logout,error};
