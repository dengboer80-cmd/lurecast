Page({copy(e){wx.setClipboardData({data:e.currentTarget.dataset.url});},privacy(){wx.openPrivacyContract({fail(){wx.showToast({title:'尚未在微信后台配置隐私保护指引',icon:'none'});}});}});
