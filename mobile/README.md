# LureCast 中国大陆双端 App 工程

状态：原生 Android / iOS 工程已生成，尚未编译、签名、真机测试或上架。不是正式可用的预报 App。

## 已完成
- 复用黑色界面和翘嘴鲌、中国花鲈 2D 插画。
- 本地打包网页资源，不通过远程网站加载主界面。
- 独立的 App 预览生成流程移除海外天气、地图和 CDN 请求；缺失能力明确待接入。
- Android 禁用混合内容；适配屏幕安全区域。
- 现有线上网站保持原有功能。

## 开发
```
cd mobile
npm ci
npm run sync
npm run android
npm run ios
```
Android 需配置 Android Studio / SDK / JDK；iOS 需 macOS / Xcode。当前环境只验证了工程生成、资源同步及 JS 语法。
`com.lurecast.preview` 是临时包名，正式主体确定后必须在申请服务、备案、签名前统一设定正式包名与 Bundle ID。

## 上线阻塞项
1. 确定主办者主体、联系方式和正式品牌包名。
2. 国内服务器、域名、HTTPS、网站及 App 备案按适用要求办理。
3. 购买天气与潮汐数据授权；和风公开潮汐接口为10天，不足15天，不可自行补假数据。
4. 高德或其他授权地图服务，星图云卫星图源独立授权；核对各数据源坐标系。
5. 国内后端实现天气潮汐代理、缓存、限流与错误处理；密钥只保存在服务端。
6. 微信开放平台移动应用配置、Apple Developer 账号；后端验证登录、会话、账号注销、云同步。
7. 钓点数据授权或审核机制；当前无真实野钓/黑坑名录。
8. 按实际 SDK 和数据行为完成隐私政策、权限按需请求、账号注销和用户协议；不可用空白协议声称合规。
9. Android 正式签名、iOS 证书与描述文件；国内网络和两端真机测试。
10. App 备案及应用商店审核完成后才能称为正式上线。

不要将密钥、证书、身份证、银行卡或支付凭据提交到此仓库。

## 官方参考
- https://capacitorjs.com/docs/getting-started
- https://dev.qweather.com/docs/api/ocean/tide/
- https://developer.amap.com/api/javascript-api-v2/guide/abc/jscode
- https://www.miit.gov.cn/jgsj/xgj/wjfb/art/2023/art_dd783a581c9644a4aee10afa582811db.html
