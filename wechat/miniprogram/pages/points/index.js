const S=require('../../lib/state');
const A=require('../../lib/account');
const D=require('../../lib/decision'),profiles=require('../../lib/fish-profiles');
const options=(type,ids=[])=>profiles.filter(p=>p.domestic&&p.habitat===type).map(p=>({id:p.id,name:p.name,checked:ids.includes(p.id)}));

Page({
 data:{items:[],name:'',location:null,customSpeciesText:'',lat:'',lng:'',typeIndex:0,types:['淡水','海水'],waterIndex:0,waters:D.waters,species:[],fishOptions:options('fresh'),editingId:'',editingOriginal:null,signedIn:false,busy:false,loadError:''},
 onLoad(query={}){this._returnPick=query.pick==='1';if(query.current){this._prefillCurrent=true;const p=S.state.place;this.setData({name:p.name,location:p,customSpeciesText:(p.customSpecies||[]).join('、'),lat:String(p.lat),lng:String(p.lng),typeIndex:p.type==='sea'?1:0,waterIndex:p.water||0,species:p.species||[],fishOptions:options(p.type,p.species)});}},
 locations(){wx.navigateTo({url:'/pages/locations/index?pick=1'});},
 async onShow(){
  if(S.state.pickedPlace){const p=S.state.pickedPlace;delete S.state.pickedPlace;this.setData({location:p,lat:String(p.lat),lng:String(p.lng)});}

  const signedIn=A.signedIn();
  this.setData({signedIn,loadError:''});
  if(signedIn){
   this.setData({items:[]});
   return this.run(async()=>{this.setData({items:await A.list('points')});this.matchCurrent();},true);
  }
  const items=S.read('wx-lc-points',[]);
  this.setData({items:Array.isArray(items)?items.filter(S.valid).map((p,i)=>({...p,id:p.id||String(i)})):[]});this.matchCurrent();
 },
 matchCurrent(){if(!this._prefillCurrent)return;this._prefillCurrent=false;const p=S.state.place,index=this.data.items.findIndex(v=>v.lat===p.lat&&v.lng===p.lng&&v.type===p.type);if(index>=0)this.editPoint({currentTarget:{dataset:{index}}});},
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
 type(e){const typeIndex=Number(e.detail.value);this.setData({typeIndex,species:[],waterIndex:0,fishOptions:options(typeIndex?'sea':'fresh')});},
 water(e){this.setData({waterIndex:Number(e.detail.value)});},
 fish(e){const species=e.detail.value;this.setData({species,fishOptions:options(this.data.typeIndex?'sea':'fresh',species)});},
 editPoint(e){const p=this.data.items[Number(e.currentTarget.dataset.index)];if(!p)return;this.setData({editingId:p.id,editingOriginal:p,name:p.name,location:p,customSpeciesText:(p.customSpecies||[]).join('、'),lat:String(p.lat),lng:String(p.lng),typeIndex:p.type==='sea'?1:0,waterIndex:p.water||0,species:p.species||[],fishOptions:options(p.type,p.species)});wx.pageScrollTo({scrollTop:0,duration:200});},
 cancel(){this.setData({editingId:'',editingOriginal:null,name:'',location:null,customSpeciesText:'',lat:'',lng:'',species:[],waterIndex:0,fishOptions:options(this.data.typeIndex?'sea':'fresh')});},
 save(){
  const {name,lat,lng,typeIndex,species,waterIndex,editingId}=this.data;
  if(!name.trim()||!lat.trim()||!lng.trim())return wx.showToast({title:'请填写名称并选择地点',icon:'none'});
  const p={id:editingId||Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:name.trim().slice(0,60),lat:Number(lat),lng:Number(lng),type:typeIndex?'sea':'fresh',species,water:waterIndex,customSpecies:this.data.customSpeciesText.split(/[、,，;；\n]/).map(v=>v.trim()).filter(Boolean)};
  if(!require('../../lib/record-schema').point(p))return wx.showToast({title:'请检查地点及自填鱼种（最多20种，每种40字）',icon:'none'});
  return this.run(async()=>{
   const items=editingId?this.data.items.map(v=>v.id===editingId?p:v):[...this.data.items,p];
   if(this.data.signedIn)await A.request('points',editingId?'edit':'add',{id:p.id,record:p});
   else if(!S.write('wx-lc-points',items))return;
   const selected=S.state.place,original=this.data.editingOriginal||p;if(selected.lat===original.lat&&selected.lng===original.lng&&selected.type===original.type){S.choose(p);}
   this.setData({items});this.cancel();wx.showToast({title:'钓点已保存'});
  });
 },
 use(e){
  const point=this.data.items[Number(e.currentTarget.dataset.index)];
  if(point){if(this._returnPick){S.state.pickedPlace={...point};wx.navigateBack();return;}S.choose(point);wx.switchTab({url:'/pages/home/index'});}
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
    this.setData({items});if(this.data.editingId===point.id)this.cancel();
   });
  }});
 }
});
