#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mode="${1:-simulator}"
case "$mode" in simulator|archive|export) ;; *) echo 'Usage: bash scripts/ios-build.sh [simulator|archive|export]' >&2; exit 2 ;; esac
if [[ "$(uname -s)" != Darwin ]] || ! command -v xcodebuild >/dev/null; then
  echo '无法构建 iOS：需要 macOS 与完整 Xcode（Linux 无法生成可运行的 iOS 二进制）。' >&2
  exit 3
fi
xcodebuild -version
if [[ "$mode" == export ]]; then
  if [[ ! -d ios/App/output/LureCast.xcarchive ]] || [[ ! -f "${LURECAST_IOS_EXPORT_OPTIONS:-}" ]]; then
    echo '导出 IPA 需要已有签名归档，并以 LURECAST_IOS_EXPORT_OPTIONS 指向本地 ExportOptions.plist。请先在 Xcode Organizer 配置导出方式。' >&2
    exit 5
  fi
  xcodebuild -exportArchive -archivePath ios/App/output/LureCast.xcarchive \
    -exportOptionsPlist "$LURECAST_IOS_EXPORT_OPTIONS" -exportPath ios/App/output/ipa -allowProvisioningUpdates
  echo 'IPA 导出完成：ios/App/output/ipa。可安装设备范围取决于签名和导出方式。'
  exit 0
fi
npm ci
npm run sync
project=ios/App/App.xcodeproj
if [[ "$mode" == simulator ]]; then
  xcodebuild -project "$project" -scheme App -configuration Debug \
    -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath ios/DerivedData CODE_SIGNING_ALLOWED=NO build
  echo '模拟器产物：ios/DerivedData/Build/Products/Debug-iphonesimulator/App.app；不能安装到实体 iPhone。'
else
  if [[ -z "${LURECAST_APPLE_TEAM_ID:-}" ]]; then
    echo '缺少 LURECAST_APPLE_TEAM_ID；先在本地 Xcode 登录并选择签名团队。不要把证书或账号密码发到聊天。' >&2
    exit 4
  fi
  xcodebuild -project "$project" -scheme App -configuration Release \
    -destination 'generic/platform=iOS' -archivePath ios/App/output/LureCast.xcarchive \
    DEVELOPMENT_TEAM="$LURECAST_APPLE_TEAM_ID" -allowProvisioningUpdates archive
  echo '已生成签名归档；在 Xcode Organizer 按团队权限选择 Development / Ad Hoc / TestFlight 导出或分发。归档不等于已导出可安装 IPA。'
fi
