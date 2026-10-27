# 数据服务与账号接入清单

当前鱼获、照片、收藏和计划无需账号，记录只在本机保存。地图按需连接OpenStreetMap/Nominatim/Overpass；用户已选择的Apple天气需要WeatherKit授权和独立后端，目前未接通，保持不可用。最新行为和安全配置见 [FEATURES.md](FEATURES.md)。

以下是后续接入的候选方案，不代表已购买或已接通；实施前核对供应商最新套餐、地域覆盖和移动端使用授权。

| 能力 | 官方入口 | 后续所需配置 | 安全填写方式 |
| --- | --- | --- | --- |
| Apple 天气 / 10天预报 | [WeatherKit](https://developer.apple.com/weatherkit/) | WeatherKit资格、Team ID、Services ID、Key ID、签名私钥和独立HTTPS后端 | 私钥仅在后端机密管理/私有文件中，前端只填写后端地址；详见FEATURES.md |
| 当前河湖地图 | [OpenStreetMap](https://www.openstreetmap.org/)、[Nominatim使用政策](https://operations.osmfoundation.org/policies/nominatim/)、[瓦片使用政策](https://operations.osmfoundation.org/policies/tiles/) | 无Key，手动搜索与小范围河湖查询；外部网络可用性以服务响应为准 | 不批量抓取或预缓存瓦片，保留署名；个人钓点和照片不上传 |
| 国内天气 / 潮汐 | [和风开发平台](https://dev.qweather.com/)、[潮汐文档](https://dev.qweather.com/docs/api/ocean/tide/) | 项目、API Host、认证配置、天气及海洋数据权限；潮位站和基准面映射。先确认目标站点覆盖、商业授权及预报天数；公开10天潮汐不能补成15天 | 密钥或 JWT 私钥只放未来后端的机密管理 / 环境设置；App 只请求后端 HTTPS 地址。不要放网页 JS、APK、Git 或聊天。后端尚未实现，因此现在不收集凭据 |
| 国内地图 | [高德开放平台控制台](https://console.amap.com/)、[JS API](https://lbs.amap.com/api/javascript-api-v2/guide/abc/prepare) | 先决定原生 SDK 或 WebView 方案，再申请匹配平台的 Key；Android 包名和证书 SHA-1、iOS Bundle ID 或 Web 域名白名单；坐标系转换 | 按最终集成方式配置平台白名单；Web 安全密钥通过后端代理。不要把服务端安全密钥编入客户端。当前临时应用 ID 为 com.lurecast.preview，正式接入前统一正式 ID |
| 账号与云同步 | [微信开放平台](https://open.weixin.qq.com/)、[Sign in with Apple](https://developer.apple.com/sign-in-with-apple/) | 微信移动应用 AppID、签名 / 包名或 Bundle ID；Apple App ID、能力和后端登录验证配置。网页授权才按方案另配 Services ID 与回调 | 微信 AppSecret、Apple 私钥和会话签名密钥留在后端机密管理；不在客户端保存。当前离线功能不需要登录 |
| iPhone 编译 / 分发 | [Xcode](https://developer.apple.com/xcode/)、[Apple Developer](https://developer.apple.com/programs/) | macOS + Xcode；本机调试按 Xcode 的个人团队能力配置；TestFlight 需相应开发者会员、签名和 App Store Connect 配置 | 在本地 Xcode / Keychain 登录，或使用 CI 的受保护签名存储；不要把账号密码、p12、私钥、描述文件发到聊天或提交 Git |

地图本身不提供经核实的野钓 / 黑坑名录；公共钓点需另有合法来源、开放规则和审核流程。当前不提供卫星图层，也不声称授权其他图源。

服务接入时逐项确认覆盖和费用，再实现后端配置入口与连通性检查。没有经过实际请求和数据语义验证前，保持“不可用”；任何缺失日期、站点或字段均不以模拟值替代。

## 当前变更：Apple天气与无Key地图

本轮用户明确选择Apple天气。已准备10天展示及WeatherKit Node后端，但尚无苹果服务授权和独立后端部署，因此真实预报仍不可用。当前地图改为按需连接OpenStreetMap/Nominatim/Overpass，无需Key；鱼获照片只在本机保存。上方“全部无网络”的描述属于最初离线版本，当前行为、官方入口和安全配置以 [FEATURES.md](FEATURES.md) 为准。
