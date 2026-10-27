import { mkdir, readFile, writeFile } from "node:fs/promises";
await mkdir("www", { recursive: true });
let html = await readFile("../dist/index.html", "utf8");
html = html.replace(
  "width=device-width,initial-scale=1",
  "width=device-width,initial-scale=1,viewport-fit=cover",
);
html = html.replace(
  "</head>",
  "<style>body{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}@media(max-width:900px){.rail{padding-bottom:calc(12px + env(safe-area-inset-bottom))}}</style></head>",
);
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
document.querySelectorAll('#helpModal .help').forEach(e=>e.textContent='这是安卓与 iPhone 的 App 内测工程。天气、潮汐、地图和第三方账号服务尚未配置，当前不可用于实际预报判断。');
\n`;
html = html.replace("renderNav();renderHome();", "renderNav();");
html = html.replace(
  "未来 15 天，找到属于你的下一次黄金窗口。",
  "手动安排未来15天出钓；天气与潮汐暂不可用。",
);
html = html.replace("</body>", '<script src="app.js"></script></body>');
html = html.replace(
  "</head>",
  "<style>form label{display:block;margin:14px 0}form input,form textarea,form select{display:block;width:100%;padding:12px;background:#000;color:#fff;border:1px solid #454545;border-radius:6px;margin-top:6px}form{margin:12px 0}input,textarea,select{font-size:16px}.spot{flex-wrap:wrap;gap:12px}.spot>div{flex:1 1 180px}.card h3{overflow-wrap:anywhere}button{min-height:44px}.day{min-width:82px}.day b,.day small{white-space:nowrap}.recommend{display:block}@media(max-width:800px){.rail{height:calc(73px + env(safe-area-inset-bottom))}}.toast{bottom:calc(90px + env(safe-area-inset-bottom))}</style></head>",
);
js = js.replace("loadForecast();", "").replace(/renderHome\(\);\s*$/, "");
await writeFile("www/app.js", await readFile("scripts/app.js", "utf8"));
await writeFile("www/index.html", html);
await writeFile("www/upgrade.js", js);
if (
  /https:\/\/(api\.open-meteo|marine-api|unpkg|wi\.maptiles|tile\.openstreetmap)/.test(
    js,
  )
)
  throw Error("Overseas dependency remains");
console.log(
  "Prepared bundled offline preview; no overseas API or CDN requests.",
);
