const cloud=require('wx-server-sdk');
const {createService}=require('./core');
const {createRecords}=require('./records');
cloud.init({env:cloud.DYNAMIC_CURRENT_ENV});
const service=createService({context:()=>cloud.getWXContext()});
const records=createRecords(cloud.database());
exports.main=event=>{
 if(event&&event.action==='records')return records(event,cloud.getWXContext().OPENID);
 return service(event);
};
