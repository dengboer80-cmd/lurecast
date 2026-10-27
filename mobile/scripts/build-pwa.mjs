import {
  mkdir,
  readFile,
  writeFile,
  copyFile,
  cp,
  rm,
  access,
} from "node:fs/promises";
import { createHash } from "node:crypto";
const output = "pwa-dist";
await mkdir(output, { recursive: true });
await rm(output + "/journal.js", { force: true });
let html = await readFile("www/index.html", "utf8");
html = html.replace(
  "</head>",
  `<link rel="manifest" href="./manifest.webmanifest"><link rel="apple-touch-icon" href="./icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="LureCast"></head>`,
);
html = html.replace("</body>", '<script src="./install.js"></script></body>');
await writeFile(`${output}/index.html`, html);
for (const f of [
  "upgrade.js",
  "app.js",
  "fish-data.js",
  "fish-art.js",
  "fish-library.js",
  "map.js",
  "free-data.js",
  "weather.js",
])
  await copyFile(`www/${f}`, `${output}/${f}`);
await cp("www/vendor", output + "/vendor", { recursive: true });
await copyFile(
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
  `${output}/icon.png`,
);
await writeFile(
  `${output}/manifest.webmanifest`,
  JSON.stringify(
    {
      id: "./",
      name: "LureCast",
      short_name: "LureCast",
      lang: "zh-CN",
      start_url: "./",
      scope: "./",
      display: "standalone",
      background_color: "#000000",
      theme_color: "#000000",
      icons: [
        {
          src: "./icon.png",
          sizes: "1024x1024",
          type: "image/png",
          purpose: "any",
        },
      ],
    },
    null,
    2,
  ),
);
await writeFile(
  `${output}/install.js`,
  `
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').catch(()=>toast('离线资源未保存，请保持网络连接后重试'));
}
const installed=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
const install=document.createElement('section');
install.className='card cardpad';
install.style.marginBottom='20px';
install.innerHTML='<h2>iPhone 网页安装版</h2><p class="sub">'+(installed?'已从主屏幕打开。':'使用 Safari 打开本页，点“分享”→“添加到主屏幕”→“添加”。')+'首次联网加载并完成缓存后可离线打开。本机收藏和计划不会上传。浏览器版本与主屏幕版本的数据可能分开，请在固定入口使用。</p><p class="sub">网页安装版，无需 Apple Developer 会员。天气采用免费非商业接口；海平面模型不等于本地潮表；地图需联网。</p>';
document.querySelector('.main').prepend(install);
`,
);
const files = [
  "index.html",
  "upgrade.js",
  "app.js",
  "fish-data.js",
  "fish-art.js",
  "fish-library.js",
  "map.js",
  "free-data.js",
  "weather.js",
  "vendor/leaflet/leaflet.js",
  "vendor/leaflet/leaflet.css",
  "vendor/leaflet/LICENSE",
  "vendor/leaflet/images/layers.png",
  "vendor/leaflet/images/layers-2x.png",
  "vendor/leaflet/images/marker-icon.png",
  "vendor/leaflet/images/marker-icon-2x.png",
  "vendor/leaflet/images/marker-shadow.png",
  "icon.png",
  "manifest.webmanifest",
  "install.js",
];
await mkdir(output + "/data", { recursive: true });
let forecastCache = { generatedAt: new Date(0).toISOString(), entries: [] };
try {
  forecastCache = JSON.parse(
    await readFile("forecast-output/free-forecast.json", "utf8"),
  );
} catch {}
await writeFile(
  output + "/data/free-forecast.json",
  JSON.stringify(forecastCache),
);
files.push("data/free-forecast.json");
const hash = createHash("sha256");
for (const f of files) hash.update(await readFile(`${output}/${f}`));
const version = hash.digest("hex").slice(0, 16);
await writeFile(
  `${output}/sw.js`,
  `
const prefix='lurecast-pwa:'+new URL(self.registration.scope).pathname+':';
const cacheName=prefix+'${version}';
const assets=${JSON.stringify(files.map((f) => "./" + f))};
const urls=assets.map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(urls)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(prefix)&&k!==cacheName).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 if(event.request.mode==='navigate'){event.respondWith(caches.open(cacheName).then(cache=>cache.match(new URL('./index.html',self.registration.scope).href)).then(cached=>cached||fetch(event.request)));return;}
 if(!urls.includes(url.href))return;
 event.respondWith(caches.open(cacheName).then(cache=>cache.match(event.request)).then(cached=>cached||fetch(event.request)));
});
`,
);
console.log(
  `Built ${output}/: iPhone home-screen web app, cache version ${version}. HTTPS hosting required; no deployment performed.`,
);
