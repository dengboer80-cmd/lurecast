# 杭州路亚记录与10天天气

## 本轮行为

- 默认区域为杭州。原有区域列表索引保持不变，避免把已收藏区域改成另一个地点。
- 天气日期和逐日列表均为10天。Apple WeatherKit 未配置时显示不可用，不再展示15天列表；缺少日期或字段不补数值。
- 常见淡水、近海、海水洄游路亚鱼种库，支持搜索、筛选和自定义补录。它不是全球所有可路亚鱼种的完整分类学名录，也不代表杭州存在该鱼或允许捕捞。保留翘嘴鲌、中国花鲈原有2D插画。
- 鱼获一鱼一条，记录鱼种、公斤重量（最多3位小数）、日期、关联钓点、备注和最多4张照片。可编辑和删除，总重量按实际记录求和。照片在浏览器内缩放至最长1600px并转为JPEG，删除原图的EXIF定位等元数据。
- 鱼获和照片使用设备 IndexedDB；区域收藏和钓点沿用原有本机存储。没有上传到服务器、其他4名使用者的手机或公开仓库。清除网站数据/卸载/存储回收可能丢失记录；本轮未提供云备份。

## 河流、湖泊与钓点

- 使用随应用打包的 Leaflet，不依赖第三方脚本CDN；点击“打开地图”才加载 OpenStreetMap 在线底图。
- 点击搜索按钮手动查询 Nominatim；没有自动补全或批量抓取，应用限制连续请求频率。查找当前区域河湖使用 Overpass，只查询地图中心附近小范围、限制结果数和超时时间。不预下载或离线缓存地图瓦片。
- 可搜索“杭州西湖”“钱塘江”，将实际返回的水域中心收集到本机。数据来源清楚标记；水域中心不是实际岸钓点。
- 点击地图填写坐标，再输入名称保存自己的钓点。也可按需使用定位，拒绝定位不会阻止手动记录。GPS和地图均采用WGS84，不混用高德GCJ-02坐标。
- 可将钓点用于天气位置、出钓计划或关联鱼获，并可跳转苹果地图。地图不是Apple MapKit；“苹果地图打开”是普通地图链接，不需要苹果开发者账号。
- 地图、搜索、定位对应功能需要联网/设备权限；错误会显示不可用，不用示例河湖或虚构钓点替代。
- 河湖存在不等于可进入或允许垂钓；请核对当地禁渔期、保护区、放流和开放要求。

## Apple WeatherKit 的具体阻塞与配置

官网：[WeatherKit](https://developer.apple.com/weatherkit/)、[REST API](https://developer.apple.com/documentation/weatherkitrestapi)、[Apple Developer Program](https://developer.apple.com/programs/)。

WeatherKit 服务授权与“网页添加到主屏幕免会员”是两回事。网页不能读取手机自带天气App中的数据。若坚持Apple天气，需具备 Apple Developer Program 中的 WeatherKit 使用资格、服务标识和签名Key；没有这些就不能提供真实Apple预报。不要把私钥放进公开网页或GitHub Pages。

已实现可单独部署的无第三方依赖 Node 后端 `server/weatherkit.mjs`，不是GitHub Pages上的函数。其请求真正的Apple REST接口，签发ES256 JWT、验证署名信息、短时内存缓存、基本限流和CORS。运行需Node.js 22+和有效HTTPS入口。本轮只完成本机服务测试；没有部署独立后端，没有真实Apple授权，也没有成功请求真实Apple预报。

后端配置（在后端平台的机密管理/环境设置填写，不发到聊天）：

| 名称 | 来源 / 安全方式 |
| --- | --- |
| WEATHERKIT_TEAM_ID | 开发者团队标识；后端配置 |
| WEATHERKIT_SERVICE_ID | 已启用WeatherKit的Services ID；后端配置 |
| WEATHERKIT_KEY_ID | 对应签名Key标识；后端配置 |
| WEATHERKIT_PRIVATE_KEY_PATH | 后端私有文件系统中 `.p8` 的路径，推荐挂载为只读机密文件 |
| WEATHERKIT_PRIVATE_KEY | 或使用平台机密管理注入真实多行PEM；两种私钥来源择一，不是前端变量，也不能使用代理占位符代替本地签名私钥 |
| LURECAST_ALLOWED_ORIGIN | 当前网页的origin：`https://dengboer80-cmd.github.io`（不含 `/lurecast/` 路径） |
| PORT | 后端监听端口，默认8787，由托管平台反向代理HTTPS |

在 `mobile` 目录运行 `npm run weather:server`；`GET /healthz` 只返回是否配置，不返回凭据。业务接口为 `GET /api/weather?lat=30.2741&lng=120.1551`。未配置返回503；Apple失败或署名数据不完整返回502且不返回假天气。健康检查的configured=true仅表示字段齐全，不证明Apple授权有效。

配置完成并实际验证后，在应用“10天天气 → 配置Apple天气服务”填 `https://你的后端/api/weather`。这里只填写公开HTTPS业务地址，不能填写Key、私钥或账号密码。客户端实际收到的署名会显示 Apple Weather 标记和法律声明链接；未获得完整署名数据不展示预报。天气按北京时间显示，当前主要适用于杭州/中国使用场景。

目前无需为鱼获、照片、河湖地图功能开通付费服务。需要真实Apple天气时再配置上述授权和独立后端；本轮没有擅自接入其他预报提供商。

## 验证

- `npm test`：原有收藏、计划、10天日期、横竖屏与存储异常回归。
- `npm run test:features`：明确标记的测试网络响应，验证真实图片编码和IndexedDB持久化、编辑、删除、容量错误、河湖搜索/收集/手动点、天气成功和失败路径。测试数据仅在tests中，不打入发布资源。
- `npm run test:weather`：4项服务端测试，验证JWT签名、日期/缺失数据、凭据不外泄、缓存和503/502错误；Apple上游使用明确的测试响应，不能称为真实Apple接通。
- `npm run test:pwa`：安装资源和离线重开，不缓存外部地图或天气请求。
- 发布工作流另做少量真实杭州河湖请求诊断；服务不可用会发出警告，不能把测试响应当作真实地图服务成功。
- Android构建与iOS资源同步继续维护；iOS原生构建和Safari实机测试仍需对应设备环境。
