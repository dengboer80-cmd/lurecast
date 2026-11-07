const S=require('../../lib/state');
const A=require('../../lib/account');

Page({
 data:{items:[],name:'',lat:'',lng:'',typeIndex:0,types:['淡水','海水'],signedIn:false,busy:false,loadError:''},
 async onShow(){
  const signedIn=A.signedIn();
  this.setData({signedIn,loadError:''});
  if(signedIn){
   this.setData({items:[]});
   return this.run(async()=>this.setData({items:await A.list('points')}),true);
  }
  const items=S.read('wx-lc-points',[]);
  this.setData({items:Array.isArray(items)?items.filter(S.valid).map((p,i)=>({...p,id:p.id||String(i)})):[]});
 },
 async run(task,loading=false){
  if(this.data.busy)return;
  this.setData({busy:true});
  try{await task();}
  catch(e){
   if(loading)this.setData({loadError:e.message||'钓点加载失败'});
   else A.error(e);
  }finally{this.setData({busy:false});}
 },
 input(e){this.setData({[e.currentTarget.dataset.field]:e.detail.value});},
 type(e){this.setData({typeIndex:Number(e.detail.value)});},
 save(){
  const {name,lat,lng,typeIndex}=this.data;
  if(!name.trim()||!lat.trim()||!lng.trim())return wx.showToast({title:'请填完整地点与坐标',icon:'none'});
  const p={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:name.trim().slice(0,60),lat:Number(lat),lng:Number(lng),type:typeIndex?'sea':'fresh'};
  if(!S.valid(p))return wx.showToast({title:'坐标无效',icon:'none'});
  return this.run(async()=>{
   const items=[...this.data.items,p];
   if(this.data.signedIn)await A.request('points','add',{record:p});
   else if(!S.write('wx-lc-points',items))return;
   this.setData({items,name:'',lat:'',lng:''});wx.showToast({title:'钓点已保存'});
  });
 },
 use(e){
  const point=this.data.items[Number(e.currentTarget.dataset.index)];
  if(point){S.choose(point);wx.switchTab({url:'/pages/home/index'});}
 },
 remove(e){
  const point=this.data.items[Number(e.currentTarget.dataset.index)];
  if(!point)return;
  wx.showModal({title:'删除钓点',content:this.data.signedIn?'这条钓点会从微信账号中删除。':'这条钓点会从本机删除。',success:r=>{
   if(!r.confirm)return;
   this.run(async()=>{
    const items=this.data.items.filter(p=>p.id!==point.id);
    if(this.data.signedIn)await A.request('points','remove',{id:point.id});
    else if(!S.write('wx-lc-points',items))return;
    this.setData({items});
   });
  }});
 }
});
