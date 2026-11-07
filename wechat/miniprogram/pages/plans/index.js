const S=require('../../lib/state');
const A=require('../../lib/account');

Page({
 data:{plans:[],signedIn:false,busy:false,loadError:''},
 onShow(){return this.refresh();},
 async refresh(){
  const signedIn=A.signedIn();
  this.setData({signedIn,plans:signedIn?[]:S.plans(),loadError:''});
  if(!signedIn)return;
  return this.run(async()=>this.setData({plans:await A.list('plans')}),true);
 },
 async run(task,loading=false){
  if(this.data.busy)return;
  this.setData({busy:true});
  try{await task();}
  catch(e){
   if(loading)this.setData({loadError:e.message||'计划加载失败'});
   else A.error(e);
  }finally{this.setData({busy:false});}
 },
 login(){
  return this.run(async()=>{
   const plans=await A.login();
   this.setData({signedIn:true,plans,loadError:''});
  });
 },
 logout(){
  if(!this.data.busy&&A.logout())this.refresh();
 },
 edit(e){
  const {id,field}=e.currentTarget.dataset;
  if(this.data.busy||!['time','note'].includes(field))return;
  const value=String(e.detail.value).slice(0,300);
  this.setData({plans:this.data.plans.map(p=>p.id===id?{...p,[field]:value}:p)});
 },
 save(e){
  const id=e.currentTarget.dataset.id,p=this.data.plans.find(item=>item.id===id);
  if(!p)return;
  return this.run(async()=>{
   const record={time:p.time,note:p.note};
   if(this.data.signedIn)await A.request('plans','edit',{id,record});
   else if(!S.write('wx-lc-plans',S.plans().map(v=>v.id===id?{...v,...record}:v)))return;
   wx.showToast({title:'计划已保存'});
  });
 },
 remove(e){
  const id=e.currentTarget.dataset.id,signedIn=this.data.signedIn;
  wx.showModal({title:'移除出钓计划',content:signedIn?'这条计划会从微信账号中删除。':'这条计划会从本机删除。',success:r=>{
   if(!r.confirm||signedIn!==this.data.signedIn)return;
   this.run(async()=>{
    if(signedIn)await A.request('plans','remove',{id});
    else if(!S.write('wx-lc-plans',S.plans().filter(v=>v.id!==id)))return;
    this.setData({plans:this.data.plans.filter(v=>v.id!==id)});
   });
  }});
 },
 weather(e){
  const p=this.data.plans.find(v=>v.id===e.currentTarget.dataset.id);
  if(!p)return;
  S.choose(p.place);S.setDate(p.date);wx.switchTab({url:'/pages/home/index'});
 },
 points(){wx.navigateTo({url:'/pages/points/index'});},
 about(){wx.navigateTo({url:'/pages/about/index'});}
});
