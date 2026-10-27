# 本轮测试与构建

沿用仓库已有的 Capacitor Android / iOS 工程；没有重新创建项目。网页资源原文件仍是 dist/，手机专用功能维护在 scripts/app.js；scripts/prepare.mjs 生成 www/，cap sync 将它同步到双端的忽略目录。

## 云环境

工具保留在 /workspace/toolchains。新 shell 先运行：

```bash
source /workspace/toolchains/lurecast-env.sh
cd /workspace/lurecast/mobile
npm ci
npm test
npm run sync
android/gradlew -p android assembleDebug :app:testDebugUnitTest --no-daemon --max-workers=2
```

浏览器测试使用 npm 安装的无界面 Chromium，检查日期、天气 / 潮汐不可用状态、黑色背景、两种鱼插画、收藏、手动钓点、计划去重、时间 / 备注编辑及重载持久化、脚本注入文本转义、零页面错误和零外部请求。截图输出到 /tmp/lurecast-home.png 和 /tmp/lurecast-profile.png。该测试针对 Linux 云环境；其他系统可改用本机 Playwright 浏览器执行相同流程。

Android 的现有单元测试是模板算术测试，不能证明 App 业务功能。业务交互由浏览器测试覆盖；APK 构建与签名检查也不能替代 Android 真机验证。

## 安卓安装

构建输出：android/app/build/outputs/apk/debug/app-debug.apk。使用 Debug 签名，不需要你的开发者账号；仅供测试，不适合作为商店正式包。最低 Android 7.0 / API 24，应用 ID com.lurecast.preview。

将 APK 传到安卓手机，允许对应文件管理器 / 浏览器“安装未知应用”，打开 APK 安装。也可在已连接且开启 USB 调试的电脑运行 `adb install -r app-debug.apk`。若同包名的旧应用使用不同签名，不能覆盖；先备份本机记录，再决定是否卸载，卸载会删除记录。

真机待验：冷启动、系统返回键、刘海 / 底部安全区、键盘遮挡、深色界面、断网启动、清除后台后记录保留。此云环境没有连接安卓设备，也没有 /dev/kvm，尚未执行真机或模拟器安装测试。计划暂不提供系统提醒。

## iPhone

`npm run sync` 同步共享页面，并维护现有 Swift Package 工程。Linux 无法运行 Xcode，因此本轮未编译、签名或真机验证 iOS。在 macOS 安装依赖、sync 后运行 `npm run ios`，在 Xcode 检查签名、选择设备并构建。不要把 Android 构建成功描述为 iOS 已通过。

天气、潮汐、地图、公共钓点、账号和云同步仍不可用；本机记录不需要网络。不应据此测试版做航行或垂钓安全判断。服务配置入口及安全方式见 SERVICES.md。

## 上一轮安卓验证结果

- 冻结锁文件安装 `npm ci`、浏览器业务流程 `npm test`、Android / iOS 资源同步均通过。
- Android `assembleDebug` 通过；现有模板单元测试 1 项通过，0 失败 / 0 跳过（业务验证仍以浏览器测试为准）。
- 最终 APK：4,151,980 字节；apksigner 验证 v2 签名通过。
- SHA-256：`97da3cfb35380b212aecd151d500f25912ea77e958d2a11060a045bad887f834`。
- APK 内 index.html、upgrade.js、app.js 与最终生成文件逐字节一致；iOS 同步文件也一致。
- AndroidManifest.xml、iOS Info.plist 解析通过。没有执行安卓设备测试或 iOS 构建。


## iPhone 工程维护后的复验

冻结依赖安装、扩展后的 Chromium 业务测试、双端同步和 `ios:check` 均通过。新增横竖屏、存储失败不虚报成功、损坏数据恢复测试。原生 XML 和共享 scheme 引用检查通过。Android 再次构建并通过 APK 签名验证；包内资源与最终生成文件一致。最新 APK SHA-256：`35fe7a0535fc771b82cd730da01122e000f40290965b443fea4ec0f9897fc519`。iOS 原生编译、Safari/WKWebView 和真机安装未执行，Mac 构建脚本仅完成语法与 Linux 前置条件失败路径检查。详见 [IOS.md](IOS.md)。
