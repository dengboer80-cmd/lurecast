import { mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
await mkdir("www", { recursive: true });
await rm("www/journal.js", { force: true });
let html = await readFile("../dist/index.html", "utf8");
html = html.replace(
  "width=device-width,initial-scale=1",
  "width=device-width,initial-scale=1,viewport-fit=cover",
);
html = html.replace(
  "</head>",
  "<style>body{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}@media(max-width:900px){.rail{padding-bottom:calc(12px + env(safe-area-inset-bottom))}}</style></head>",
);
// Keep the original 15-day planning and weather horizon.
let js = await readFile("../dist/upgrade.js", "utf8");
// The installable preview must not silently depend on overseas services.
let start = js.indexOf("async function loadForecast()"),
  end = js.indexOf("renderDates=function()", start);
js =
  js.slice(0, start) +
  `async function loadForecast(){liveWeather=null;liveMarine=null;renderHome();document.querySelector('.headmeta').textContent='国内数据服务待接入 · App 内测工程';}\n` +
  js.slice(end);
start = js.indexOf("const css=document.createElement");
js =
  js.slice(0, start) +
  `renderSpots=function(){document.getElementById('spots').innerHTML='<h1>发现钓点</h1><div class="card cardpad"><h2>国内地图服务待接入</h2><p class="viewdesc">电子地图、卫星地图和星图卫星将使用授权图源。当前内测工程未配置地图账号。</p><p class="sub">已有钓点保留在本机，接入地图后可继续查看。</p></div>'};\n`;
js = js
  .replaceAll(
    "真实天气 · Open-Meteo<br>海洋数据覆盖范围以接口返回为准",
    "国内数据服务待接入 · App 内测工程",
  )
  .replaceAll("LIVE FORECAST", "APP PREVIEW");
js = js.replace(
  /document\.querySelector\('\.bottominfo'\)\.innerHTML=.*?;/,
  "document.querySelector('.bottominfo').innerHTML='<span>内测工程 · 天气、潮汐及账号服务尚未配置</span>';",
);
js += `\nrenderRecommend=function(){document.getElementById('recommend').innerHTML='<div class="eyebrow">LURECAST APP PREVIEW</div><h2>潮起，即刻出发。</h2><p>国内天气与潮汐服务尚未配置。可以先浏览鱼种、收藏和安排出钓。</p><button class="planbtn" onclick="addPlan()">加入当日出钓计划</button>'};
renderWeather=function(){document.getElementById('weather').innerHTML='<h1>未来15天天气</h1><div class="card cardpad"><p class="viewdesc">国内天气服务待配置，当前不提供预报数据。</p></div>'};
renderTide=function(){document.getElementById('tidecontent').innerHTML='<div class="empty">国内潮汐服务待接入。<br>完整15天潮表尚未获得授权数据源。</div>'};
renderHours=function(){document.getElementById('hours').innerHTML='<div class="empty">国内逐小时天气服务待接入。</div>'};
document.querySelectorAll('#helpModal .help').forEach(e=>e.textContent='天气使用免费非商业Open-Meteo接口；海平面模型包含潮汐影响，但不是当地潮位站潮表。地图按需联网，河湖不代表可垂钓许可。鱼获模块已移除，收藏和计划仍保存在本机。');
\n`;
html = html.replace("renderNav();renderHome();", "renderNav();");
html = html.replace(
  "未来 15 天，找到属于你的下一次黄金窗口。",
  "未来15天看天气，选择官方站点查潮汐。",
);
html = html.replace(
  "</body>",
  '<script src="app.js"></script><script src="fish-data.js"></script><script src="fish-art.js"></script><script src="fish-library.js"></script><script src="vendor/leaflet/leaflet.js"></script><script src="map.js"></script><script src="free-data.js"></script><script src="weather.js"></script><script src="tide-data.js"></script><script src="stations.js"></script><script src="bite-model.js"></script><script src="bite-ui.js"></script></body>',
);
html = html.replace(
  "</head>",
  "<style>form label{display:block;margin:14px 0}form input,form textarea,form select{display:block;width:100%;padding:12px;background:#000;color:#fff;border:1px solid #454545;border-radius:6px;margin-top:6px}form{margin:12px 0}input,textarea,select{font-size:16px}.spot{flex-wrap:wrap;gap:12px}.spot>div{flex:1 1 180px}.card h3{overflow-wrap:anywhere}button{min-height:44px}.day{min-width:82px}.day b,.day small{white-space:nowrap}.recommend{display:block}@media(max-width:800px){.rail{height:calc(73px + env(safe-area-inset-bottom))}}.toast{bottom:calc(90px + env(safe-area-inset-bottom))}</style></head>",
);
js = js.replace("loadForecast();", "").replace(/renderHome\(\);\s*$/, "");
for (const name of [
  "app.js",
  "fish-data.js",
  "fish-art.js",
  "fish-library.js",
  "map.js",
  "free-data.js",
  "weather.js",
  "tide-data.js",
  "stations.js",
  "bite-model.js",
  "bite-ui.js",
])
  await writeFile("www/" + name, await readFile("scripts/" + name, "utf8"));
await mkdir("www/vendor/leaflet", { recursive: true });
for (const name of ["leaflet.js", "leaflet.css"])
  await cp("node_modules/leaflet/dist/" + name, "www/vendor/leaflet/" + name);
await cp("node_modules/leaflet/LICENSE", "www/vendor/leaflet/LICENSE");
await cp("node_modules/leaflet/dist/images", "www/vendor/leaflet/images", {
  recursive: true,
});
html = html.replace(
  "</head>",
  '<link rel="stylesheet" href="./vendor/leaflet/leaflet.css"><style>.fishlibrary{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin:18px 0}.speciesart,.speciescard>svg{width:100%;height:160px}.speciescard h3{margin:8px 0}.speciescard .sub{line-height:1.7}.catchphotos{display:flex;gap:12px;flex-wrap:wrap}.catchphotos img{width:140px;height:140px;object-fit:cover;border-radius:8px}.catchentry{margin:14px 0}.maptools{display:flex;flex-wrap:wrap;gap:8px}.waterresult{padding:14px 0;border-bottom:1px solid #333}.appleattribution{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:16px 0}.appleattribution img{height:24px;max-width:140px}#waterMap{isolation:isolate;z-index:0}.leaflet-control a{color:#111}input,select,textarea{max-width:100%}#fish>label{display:block;margin:12px 0}#fish>label input,#fish>label select{background:#000;color:#fff;border:1px solid #555;padding:12px;width:100%}input[type=checkbox]{width:auto;display:inline-block}.metricvalue{white-space:normal;font-size:22px}details summary{cursor:pointer;min-height:44px}</style></head>',
);
await cp("assets", "www/assets", {recursive:true});
await cp("data/tides", "www/data/tides", {recursive:true});
html = html.replace("</head>", `<link rel="stylesheet" href="./assets/iphone.css"></head>`);
await writeFile("www/index.html", html);
await writeFile("www/upgrade.js", js);
if (
  /https:\/\/(api\.open-meteo|marine-api|unpkg|wi\.maptiles|tile\.openstreetmap)/.test(
    js,
  )
)
  throw Error("Overseas dependency remains");
console.log(
  "Prepared bundled assets; online maps load only on user request, and unconfigured weather stays unavailable.",
);
