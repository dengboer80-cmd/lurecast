// Structural validation only. This does not compile Swift or verify iOS behavior.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const plist = require("plist");
const xcode = require("xcode");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const config = JSON.parse(read("capacitor.config.json"));
const info = plist.parse(read("ios/App/App/Info.plist"));
const project = xcode.project(
  path.join(root, "ios/App/App.xcodeproj/project.pbxproj"),
);
project.parseSync();
const objects = project.hash.project.objects;
const target = Object.values(objects.PBXNativeTarget).find(
  (v) => typeof v === "object" && v.name === "App",
);
assert.ok(target, "App native target exists");
const configurations =
  objects.XCConfigurationList[target.buildConfigurationList]
    .buildConfigurations;
for (const c of configurations) {
  const settings = objects.XCBuildConfiguration[c.value].buildSettings;
  assert.equal(settings.PRODUCT_BUNDLE_IDENTIFIER, config.appId);
  assert.ok(Number(settings.IPHONEOS_DEPLOYMENT_TARGET) >= 15);
  assert.ok(fs.existsSync(path.join(root, "ios/App", settings.INFOPLIST_FILE)));
}
assert.equal(info.UIUserInterfaceStyle, "Dark");
const spm = read("ios/App/CapApp-SPM/Package.swift");
const iosVersion = JSON.parse(
  read("node_modules/@capacitor/ios/package.json"),
).version;
assert.ok(
  spm.includes(`exact: "${iosVersion}"`),
  "Swift package matches locked Capacitor iOS dependency",
);
for (const f of ["index.html", "upgrade.js", "app.js", "fish-data.js", "journal.js", "map.js", "weather.js"])
  assert.deepEqual(
    fs.readFileSync(path.join(root, "www", f)),
    fs.readFileSync(path.join(root, "ios/App/App/public", f)),
  );
const bundled = JSON.parse(read("ios/App/App/capacitor.config.json"));
assert.equal(bundled.appId, config.appId);
assert.equal(bundled.ios.contentInset, "never");
assert.ok(
  !bundled.server.url,
  "App loads bundled resources rather than a hosted site",
);
console.log(
  "PASS: Xcode project parses; App target, bundle ID, deployment target, Info.plist, locked Swift package and synced resources agree. Native build and installation remain UNRUN.",
);
