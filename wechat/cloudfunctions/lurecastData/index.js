const cloud=require('wx-server-sdk');
cloud.init({env:cloud.DYNAMIC_CURRENT_ENV});
const service=require('./core').createService({context:()=>cloud.getWXContext()});
exports.main=event=>service(event);
