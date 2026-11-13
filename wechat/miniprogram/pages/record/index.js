const S=require('../../lib/state'),A=require('../../lib/account'),F=require('../../lib/free-data'),schema=require('../../lib/record-schema'),profiles=require('../../lib/fish-profiles');
const contacts=['请选择','有口','无口','不确定'],hooks=['请选择','有中鱼','未中鱼'];
const id=()=> 'trip-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
function weatherSummary(h){
 const v=[];if(Number.isFinite(h.temperature))v.push('气温 '+h.temperature+'°C');if(Number.isFinite(h.windSpeed))v.push('风速 '+h.windSpeed+'km/h');if(Number.isFinite(h.pressure))v.push('气压 '+h.pressure+'hPa');
 const code=h.weatherCode;v.push(code>=95?'雷暴':code>=80?'阵性降水':code>=71?'雪':code>=51?'降水':code>=45?'雾':code===3?'阴':code===1||code===2?'多云':code===0?'晴':'天气现象缺失');return v.join(' · ');
}
Page({
 data:{name:'',place:null,date:'',today:'',time:'',targetName:'',fishType:'',targetIndex:0,fishNames:['请选择或直接自填'],minutes:'',contactIndex:0,hookIndex:0,contacts,hooks,bait:'',note:'',observed:'',weather:null,weatherStatus:'',weatherLoading:false,busy:false,signedIn:false},
 onLoad(){
  this._entryId=id();this._request=0;delete S.state.pickedPlace;
  const time=new Date(Date.now()+8*3600000).toISOString().slice(11,16),place={...S.state.place};
  this.setData({name:place.name,place,date:S.dateKeys()[0],today:S.dateKeys()[0],time,signedIn:A.signedIn()});this.choices();
 },
 onShow(){
  if(S.state.pickedPlace){const place=S.state.pickedPlace;delete S.state.pickedPlace;this.setData({place,targetIndex:0});this.choices();}
  return this.fetchWeather();
 },
 onUnload(){this._request++;},
 choices(){this._fish=profiles.filter(p=>p.domestic&&p.habitat===this.data.place.type);this.setData({fishNames:['请选择或直接自填',...this._fish.map(p=>p.name)]});},
 locations(){wx.navigateTo({url:'/pages/locations/index?pick=1'});},
 points(){wx.navigateTo({url:'/pages/points/index?pick=1'});},
 input(e){const field=e.currentTarget.dataset.field;if(['name','targetName','fishType','minutes','bait','note','observed'].includes(field))this.setData({[field]:e.detail.value});},
 target(e){this.setData({targetIndex:Number(e.detail.value),targetName:''});},
 contact(e){this.setData({contactIndex:Number(e.detail.value)});},
 hooked(e){this.setData({hookIndex:Number(e.detail.value)});},
 date(e){this.setData({date:e.detail.value});return this.fetchWeather();},
 time(e){this.setData({time:e.detail.value});return this.fetchWeather();},
 skipWeather(){this._request++;this.setData({weather:null,weatherLoading:false,weatherStatus:'已跳过自动获取，可填写当时现场天气。'});},
 async fetchWeather(){
  const request=++this._request,{date,time,place}=this.data;this.setData({weather:null,weatherLoading:false});
  if(date!==S.dateKeys()[0]){this.setData({weatherStatus:'历史日期暂未接入天气回溯，请填写当时天气；不会用今天的天气替代。'});return;}
  this.setData({weatherLoading:true,weatherStatus:'正在获取所选地点与时段的天气预报…'});
  try{
   const result=await S.call('forecast',{lat:place.lat,lng:place.lng,habitat:place.type});if(request!==this._request)return;
   const data=F.normalizeWeather(result.weather,result.retrievedAt),h=data.hours.find(h=>h.time.startsWith(date+'T'+time.slice(0,2)+':'));
   if(!h)throw Error('所选时段缺少天气数据');
   this.setData({weather:{source:'forecast',summary:weatherSummary(h),date,time,retrievedAt:result.retrievedAt},weatherStatus:'已获取所选时段预报，保存后不会自动刷新。'});
  }catch(e){if(request===this._request)this.setData({weatherStatus:S.serviceError(e).message+'；可直接补充现场天气。'});}
  finally{if(request===this._request)this.setData({weatherLoading:false});}
 },
 async save(){
  if(this.data.busy)return;
  const d=this.data;if(d.weatherLoading)return wx.showToast({title:'请等待天气，或点击跳过自动获取',icon:'none'});
  const place=schema.point({...d.place,name:d.name}),fish=this._fish[d.targetIndex-1];
  const review=schema.review({targetId:fish&&fish.id,targetName:d.targetName,fishType:d.fishType,minutes:String(d.minutes).trim()?Number(d.minutes):NaN,contact:['','yes','no','unknown'][d.contactIndex],hooked:d.hookIndex===1,caught:d.hookIndex===1?null:0,bait:d.bait,note:d.note});
  const known=review&&profiles.find(f=>f.id===review.targetId);
  if(known&&known.habitat!==d.place.type)return wx.showToast({title:'目标鱼与所选淡水／海水不匹配',icon:'none'});
  if(!place||!review||!d.hookIndex||!d.contactIndex||!d.date||d.date>d.today)return wx.showToast({title:'请补全名称、目标鱼、时长、鱼口、中鱼及主要饵',icon:'none'});
  if(A.signedIn()!==d.signedIn)return wx.showToast({title:'登录状态变化，请返回后重新进入',icon:'none'});
  const weather=schema.weather({...d.weather,source:d.weather?'forecast':d.observed.trim()?'manual':'unavailable',date:d.date,time:d.time,observed:d.observed});
  const record={entryId:this._entryId,place,date:d.date,time:d.time,review,weather};
  this.setData({busy:true});
  try{
   if(d.signedIn)await A.request('plans','add',{record});
   else{
    const items=S.plans();if(!items.some(p=>p.id===this._entryId)&&!S.write('wx-lc-plans',[...items,{...record,id:this._entryId,note:'',review:{...review,completedAt:new Date().toISOString()}}]))return;
   }
   wx.showToast({title:'出钓记录已保存'});wx.navigateBack();
  }catch(e){A.error(e);}finally{this.setData({busy:false});}
 }
});
