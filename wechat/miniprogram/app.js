const config = require('./config');
App({
  globalData: {cloudReady:false},
  onLaunch() {
    if (config.cloudEnv && wx.cloud) {
      wx.cloud.init({env:config.cloudEnv,traceUser:false});
      this.globalData.cloudReady=true;
    }
  }
});
