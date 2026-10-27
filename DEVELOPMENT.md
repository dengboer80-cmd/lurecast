# LureCast 开发入口

本仓库导入现有 LureCast 源码，原 README 保留。

- `dist/`：现有网页版，直接运行静态服务器可预览。
- `mobile/`：Capacitor 安卓及 iPhone 内测工程。
- `mobile/README.md`：功能状态、开发步骤及上线缺项。

## 初始化手机工程

需要 Node.js 22 或更高版本。在仓库根目录执行：

```sh
cd mobile
npm ci
npm run sync
```

安卓：安装 JDK 和 Android SDK 后，在 `mobile/android` 运行 `./gradlew assembleDebug`。
iPhone：在 macOS 上运行 `npm run ios`，使用 Xcode 配置签名和构建。

网页资源的源文件位于 `dist/`；`mobile/scripts/prepare.mjs` 生成移除海外接口依赖的手机内测版本。不要直接修改生成目录 `mobile/www/`。

当前未完成国内天气潮汐、国内地图、微信/Apple登录或商店发布。不要用模拟数据替代真实预报，不要把凭据提交到仓库。原 Sites 托管配置未导入此仓库。
