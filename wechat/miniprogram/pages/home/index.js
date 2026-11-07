const S=require('../../lib/state'),V=require('../../lib/view'),A=require('../../lib/account');
Page({data:{...V.home()},async onShow(){if(!S.dateKeys().includes(S.state.date))S.setDate(S.dateKeys()[0]);this.setData(V.home());await this.refresh();},async refresh(){const task=S.load();this.setData(V.home());await task;this.setData(V.home());},async retry(){const task=S.load(true);this.setData(V.home());await task;this.setData(V.home());},selectDate(e){S.setDate(e.currentTarget.dataset.date);this.setData(V.home());},locations(){wx.navigateTo({url:'/pages/locations/index'});},tides(){wx.navigateTo({url:'/packages/tides/index'});},fish(){wx.switchTab({url:'/pages/fish/index'});},async addPlan(){
 if(!A.signedIn()){const r=S.addPlan();wx.showToast({title:r.message,icon:r.ok?'success':'none'});return;}
 if(this.addingPlan)return;
 this.addingPlan=true;
 try{
  await A.request('plans','add',{record:{place:S.state.place,date:S.state.date}});
  wx.showToast({title:'已保存到微信账号'});
 }catch(e){A.error(e);}
 finally{this.addingPlan=false;}
 },about(){wx.navigateTo({url:'/pages/about/index'});}});
