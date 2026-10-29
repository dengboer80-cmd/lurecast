# 2026-10-29 更新

本项目当前优先iPhone，新增功能与真实数据覆盖范围见 [UPDATE-2026-10-29.md](UPDATE-2026-10-29.md)。原始工程沿用，尚未执行Xcode编译/签名或真机安装。

# iPhone 测试版交接

继续使用本仓库的现有 Capacitor iPhone 工程，没有创建新项目。苹果安装文件是 IPA；安卓 APK 无法在 iPhone 上安装。本次没有生成 IPA，也没有执行 iOS 原生编译或设备安装。

## 已完成与验证边界

- 启动页改为纯黑背景，iOS 窗口和系统界面指定深色模式；保留两种鱼的共享 SVG 插画。
- WebView 由 CSS `env(safe-area-inset-*)` 处理安全区，关闭重复的原生自动 content inset；表单字体至少16px，减少 iPhone 输入时自动放大。以上原生/安全区效果仍待 iPhone 实机验证。
- 完善15天手动日期选择、收藏、手动钓点、时间/备注编辑；存储失败时明确提示，且不把未保存的修改显示为成功。
- 浏览器业务测试包含375px竖屏、844px横屏、存储额度失败、损坏记录恢复；测试引擎是 Chromium，不能替代 Safari / WKWebView。
- `ios:check` 使用 plist 和 Xcode 工程解析器检查工程、App target、Bundle ID、最低系统版本、锁定的 Capacitor Swift 包、同步资源及离线入口。不是原生编译测试。
- 补充共享 App scheme，便于在 Mac 上执行命令行模拟器构建和签名归档。

## 当前阻塞

1. 当前机器为 Linux，没有 `xcodebuild`、`xcrun` 或苹果 SDK；也没有可调用的远程 Mac 构建服务。仅把网页压成 IPA 或改扩展名不能生成可运行应用。
2. 真机安装需要有效苹果签名和对应设备/分发授权；当前没有配置开发团队、证书和描述文件。不在 Linux 上收集账号或伪造签名。
3. 天气、潮汐、地图及云账号没有接通，始终显示不可用。此项不阻塞离线页面测试，不需要为了当前测试先购买数据服务。

## 在 Mac 上先做无需开发者账号的步骤

从 [Apple 官网](https://developer.apple.com/xcode/)安装兼容 Capacitor 8 的完整 Xcode，完成首次启动和 iOS 平台组件安装。使用 Node.js 22+，在当前项目运行：

```bash
cd mobile
npm ci
npm run sync
npm run ios:check
npm run ios:simulator
```

`ios:simulator` 使用 `CODE_SIGNING_ALLOWED=NO`。产物为模拟器 App.app，不能安装到实体 iPhone。本机脚本会在不支持的平台直接报错，不会生成假安装包。

Mac 如需运行共享网页测试：`npx playwright install chromium` 后执行 `npm test`。Linux 云环境使用 npm 随包安装的无界面 Chromium。

## 连接 iPhone 测试

运行 `npm run ios`，在 Xcode 的 App target → Signing & Capabilities 中登录自己的 Apple ID、选择 Team，并连接和信任 iPhone。个人团队可按 Apple 当前限制进行本机调试，不必先为模拟器购买会员；设备可能需要开启 Developer Mode。若临时 Bundle ID 不可注册，先统一修改 Capacitor appId、Android applicationId 和 iOS Bundle ID，再重新 sync 和核对配置。

点击 Run 安装测试。账号密码仅在 Xcode 登录，不发聊天、不写代码。Xcode/Keychain 管理本地证书与私钥。

## 导出 IPA / TestFlight（确有分发需求再配置）

官方入口：[Apple Developer 会员](https://developer.apple.com/programs/)、[App Store Connect](https://appstoreconnect.apple.com/)、[TestFlight](https://developer.apple.com/testflight/)。需要匹配用途的团队权限、注册 App ID、签名和描述文件；Ad Hoc 还需注册测试设备。TestFlight 需要相应会员和 App Store Connect 配置。

可以直接在 Xcode Product → Archive → Organizer 中配置分发。也提供辅助脚本：

```bash
# Team ID 是团队标识，不是账号密码；只在 Mac 本地设置。
export LURECAST_APPLE_TEAM_ID=你的团队ID
npm run ios:archive
# 使用 Xcode 针对当前团队和导出方式生成/配置的本地 ExportOptions.plist。
export LURECAST_IOS_EXPORT_OPTIONS=/本机路径/ExportOptions.plist
npm run ios:ipa
```

归档路径 `ios/App/output/LureCast.xcarchive`；成功导出后 IPA 在 `ios/App/output/ipa/`。这些目录已被 Git 忽略。脚本原生构建和签名步骤尚未在 Mac 执行，因此不保证未经实机运行的工程已能编译。

不要提交证书、p12、私钥、描述文件或账号密码；云 CI 若将来需要签名，只通过其受保护的机密存储和受限 Keychain 配置，不放前端或公开构建日志。

## 真机验收

冷启动没有白屏闪烁；竖屏/横屏与刘海/底部安全区正常；键盘不遮挡保存操作；两种鱼插画显示；未配置接口均不可用；断网可启动；收藏和计划在杀进程重开后保留；存储失败有提示；卸载/清数据会丢失本机记录。尚未开启系统提醒、定位采集或云同步。

天气/潮汐/地图等供应商所需配置与安全填写方式见 [SERVICES.md](SERVICES.md)。
