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

## 本轮本机功能测试版

新增手机端区域 / 自建钓点收藏、野钓 / 黑坑分类、钓点坐标记录、计划时间和备注编辑。未配置接口明确不可用；保留黑色界面与翘嘴鲌、中国花鲈插画。浏览器功能测试通过，Android APK 构建通过；iOS 仅同步资源，未在 Xcode 验证。旧文档“尚未编译”的 Android 状态由本节更新。

- [测试、构建与安装步骤](TESTING.md)
- [服务官网、所需配置和安全填写方式](SERVICES.md)
- `npm test`：运行手机页面的离线功能测试。

## iPhone 工程后续维护

补充黑色启动页、强制深色模式、安全区配置、共享 App scheme，以及 `ios:check` / `ios:simulator` / `ios:archive` / `ios:ipa` 命令。iOS 原生编译和签名尚未执行，当前没有可安装 IPA。详见 [iPhone 测试版交接](IOS.md)。

## 不购买 Apple Developer 会员的路线

新增同源的 iPhone 主屏幕网页版本：`npm run test:pwa`。生成文件、安装步骤及公开链接与5人访问限制的区别见 [PWA.md](PWA.md)。这不是原生 IPA；部署和 Safari 真机安装尚未执行。

## 杭州、10天天气、鱼获与河湖

新增常见路亚鱼种库、自定义鱼种、公斤重量与本机照片鱼获记录、OpenStreetMap河湖搜索和自建钓点。天气改为10天，准备Apple WeatherKit的独立服务端接入，未配置时不可用。详见 [FEATURES.md](FEATURES.md)，其中明确区分真实外部服务、测试响应和未完成授权。

## 当前版本：免费数据与全鱼种插画

默认改为Open-Meteo免费非商业10天天气与海洋模型参考，无需Apple账号/Key；杭州缺失潮位不补算。鱼获模块已从界面移除，鱼种库每项配2D示意插画。地图增加OpenTopoMap地形图。当前数据源、免费限制与真实核验以 [FREE-SOURCES.md](FREE-SOURCES.md) 为准，先前Apple天气/鱼获说明为历史版本。
