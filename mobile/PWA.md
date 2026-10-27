# 无需 Apple Developer 会员的 iPhone 主屏幕版本

这是现有 LureCast 的网页安装版（PWA），不是 IPA。保留同一套黑色页面、翘嘴鲌/中国花鲈插画、手动钓点、收藏和计划。天气、潮汐、地图及账号未配置，仍显示不可用。原生 Android/iPhone 工程不受替换。

## 当前结果

生成命令：在 mobile 运行 `npm ci`，随后 `npm run build:pwa`。部署目录为 `mobile/pwa-dist/`。运行 `npm run test:pwa` 验证子路径加载、安装元数据、Service Worker 控制、断网重新打开、离线计划保存、页面导航、鱼插画和零外部请求。测试使用 Chromium，不代表已在 iPhone Safari 实测。

需要把目录部署到有效 HTTPS 网站，再用 iPhone Safari 打开网站链接。不能把 ZIP 或本地 HTML 当作 iPhone 安装包。当前只完成生成与本机测试，没有发布网站或生成线上安装链接。

## 安装

1. Safari 打开实际发布后的 HTTPS 链接。
2. 点击分享，选择“添加到主屏幕”，再点“添加”。不同 iOS 版本的按钮位置可能略有不同。
3. 首次联网完成资源缓存后，从主屏幕图标打开。离线打开也会明确显示预报不可用，不会生成假天气。

记录只存于当前设备浏览器存储；主屏幕应用与 Safari 的数据可能分开。建议固定使用主屏幕入口。卸载、清理网站数据或系统回收存储可能导致记录丢失。没有云同步或系统提醒。

## 5人链接与访问权限

普通链接可以分享给5名朋友，但不能保证仅这5人访问，也不能阻止转发。当前没有身份验证、邀请验证或人数限制。若“仅5人”是严格访问限制，需要另外配置带身份验证的 HTTPS 托管入口；不能把前端口令当作有效的服务端访问控制。用户已确认接受公开链接，仅分享给5人；这不构成5人访问限制。

## 无需苹果账号的发布方案

仓库已补充支持主分支更新和手动触发的 GitHub Pages 工作流 `.github/workflows/pwa-pages.yml`。实际发布状态以 GitHub Actions 部署结果为准；配置文件存在不代表已有线上安装链接。

使用已有 GitHub 仓库账号即可，不需要 Apple Developer 会员、苹果证书或 Mac。是否能免费使用 Pages 取决于 GitHub 当前仓库可见性及套餐；公开仓库通常可用。

公开发布配置：

1. 将本轮源文件及工作流提交/推送到现有仓库。
2. 在仓库 Settings → Pages → Build and deployment 中选择 GitHub Actions。
3. 在 Actions 手动运行“Publish LureCast home-screen web app”。工作流先测试，再发布。
4. 只有发布成功后，使用工作流 deployment 输出的实际 page_url 作为安装链接，不预先猜测地址。

官方入口：[GitHub Pages 文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。工作流使用 GitHub 自带的临时授权，不需要填写苹果凭据或额外 PAT。当前云环境没有 GitHub Pages 管理工具，也没有调用此发布流程；文件准备不等于已发布。
