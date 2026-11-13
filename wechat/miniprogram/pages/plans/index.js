const S=require('../../lib/state');
const A=require('../../lib/account');
const D=require('../../lib/decision'),schema=require('../../lib/record-schema'),profiles=require('../../lib/fish-profiles');
const contacts=['未确认鱼口','有口','无口（空军也请记录）'],contactKeys=['unknown','yes','no'];
function decorate(plans){return plans.map(p=>{
 const choices=profiles.filter(f=>f.domestic&&f.habitat===p.place.type);
 const review=p.review||{};
 return {...p,reviewOpen:false,reviewChoices:choices.map(f=>f.id),reviewNames:['请选择目标鱼',...choices.map(f=>f.name)],
 reviewDraft:{targetIndex:review.targetId?choices.findIndex(f=>f.id===review.targetId)+1:0,minutes:review.minutes||'',contactIndex:Math.max(0,contactKeys.indexOf(review.contact)),caught:review.caught===undefined?'':String(review.caught),bait:review.bait||'',note:review.note||''}};
});}


Page({
 data:{contacts,stats:D.stats([]),plans:[],signedIn:false,busy:false,loadError:'',profile:null,profileReady:false,profileError:'',avatarDraft:'',nicknameDraft:''},
 setPlans(plans){this.setData({plans:decorate(plans),stats:D.stats(plans)});},
 onShow(){return this.refresh();},
 async refresh(){
  const signedIn=A.signedIn();
  this.setData({signedIn,loadError:''});this.setPlans(signedIn?[]:S.plans());
  if(!signedIn){this.setData({profile:null,profileReady:false,profileError:'',avatarDraft:'',nicknameDraft:''});return;}
  return this.run(async()=>{
   await this.loadProfile();
   this.setPlans(await A.list('plans'));
  },true);
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
   this.setData({signedIn:true,loadError:''});this.setPlans(plans);
   await this.loadProfile();
  });
 },
 async loadProfile(){
  this.setData({profileReady:false,profileError:''});
  try{this.setData({profile:await A.getProfile(),profileReady:true});}
  catch(e){this.setData({profile:null,profileError:e.message||'微信资料加载失败'});}
 },
 retryProfile(){return this.run(()=>this.loadProfile());},
 chooseAvatar(e){
  const avatarDraft=e.detail.avatarUrl;
  if(avatarDraft)this.setData({avatarDraft});
 },
 nicknameChange(e){this.setData({nicknameDraft:e.detail.value});},
 saveProfile(e){
  if(!this.data.signedIn||!this.data.profileReady||this.data.profile)return;
  const nickname=String(e.detail.value.nickname||'').trim(),avatar=this.data.avatarDraft;
  if(!nickname||!avatar)return wx.showToast({title:'请先选择头像并填写昵称',icon:'none'});
  return this.run(async()=>{
   const profile=await A.createProfile(nickname,avatar);
   this.setData({profile,avatarDraft:'',nicknameDraft:''});
   wx.showToast({title:'微信资料已保存'});
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
 toggleReview(e){const id=e.currentTarget.dataset.id;this.setData({plans:this.data.plans.map(p=>p.id===id?{...p,reviewOpen:!p.reviewOpen}:p)});},
 reviewInput(e){const {id,field}=e.currentTarget.dataset;if(!['targetIndex','minutes','contactIndex','caught','bait','note'].includes(field))return;this.setData({plans:this.data.plans.map(p=>p.id===id?{...p,reviewDraft:{...p.reviewDraft,[field]:e.detail.value}}:p)});},
 saveReview(e){
  const id=e.currentTarget.dataset.id,p=this.data.plans.find(p=>p.id===id);if(!p)return;
  const d=p.reviewDraft;
  const value=schema.review({targetId:p.reviewChoices[Number(d.targetIndex)-1],minutes:String(d.minutes).trim()?Number(d.minutes):NaN,contact:contactKeys[Number(d.contactIndex)],caught:String(d.caught).trim()?Number(d.caught):NaN,bait:d.bait,note:d.note});
  if(!value)return wx.showToast({title:'请填目标鱼、时长、鱼口、尾数及拟饵；中鱼应选有口',icon:'none'});
  return this.run(async()=>{
   let review={...value,completedAt:new Date().toISOString()};
   if(this.data.signedIn)review=(await A.request('plans','review',{id,record:value})).review;
   else if(!S.write('wx-lc-plans',S.plans().map(p=>p.id===id?{...p,review}:p)))return;
   this.setPlans(this.data.plans.map(p=>p.id===id?{...p,review}:p));
   wx.showToast({title:'复盘已保存'});
  });
 },
 remove(e){
  const id=e.currentTarget.dataset.id,signedIn=this.data.signedIn;
  wx.showModal({title:'移除出钓计划',content:signedIn?'这条计划会从微信账号中删除。':'这条计划会从本机删除。',success:r=>{
   if(!r.confirm||signedIn!==this.data.signedIn)return;
   this.run(async()=>{
    if(signedIn)await A.request('plans','remove',{id});
    else if(!S.write('wx-lc-plans',S.plans().filter(v=>v.id!==id)))return;
    this.setPlans(this.data.plans.filter(v=>v.id!==id));
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
