let waterMap = null,
  waterMarkers = null,
  mapVisible = false,
  mapView = null,
  waterResults = [],
  waterBaseLayer = null,
  waterBaseKind = "street",
  waterBusy = false,
  lastWaterRequest = 0;
let selectedWaterLocation = null;
const coreRenderSpots = renderSpots;
function destroyWaterMap() {
  if (waterMap) {
    mapView = { center: waterMap.getCenter(), zoom: waterMap.getZoom() };
    waterMap.remove();
    waterMap = null;
  }
}
renderSpots = function () {
  destroyWaterMap();
  coreRenderSpots();
  document.querySelector("#spots .card.cardpad")?.remove();
  const panel = document.createElement("section");
  panel.className = "card cardpad";
  panel.innerHTML = `<h2>河流、湖泊与我的钓点</h2><p class="sub">OpenStreetMap 地图与公共河湖数据。河湖中心点不是可垂钓许可；请核对禁渔规定、岸线通行和水情。地图和搜索需联网，会向地图服务发送查询区域。</p><form id="waterSearchForm"><label>搜索河流 / 湖泊<input id="waterQuery" placeholder="如：钱塘江、西湖或所在城市" maxlength="100" required></label><button class="pill">搜索地图水域</button></form><div class="maptools"><button class="pill" onclick="openWaterMap()">打开地图</button><button class="pill" onclick="mapLayerFree('street')">标准地图</button><button class="pill" onclick="mapLayerFree('topo')">免费地形图</button><button class="pill" onclick="locateWaterMap()">定位到我</button><button class="pill" onclick="discoverWaters()">查找当前区域河湖</button></div><p id="waterStatus" role="status" class="sub">尚未加载在线地图。离线仍可查看下面已保存的钓点。</p><div id="waterMap" aria-label="河流湖泊地图" style="height:360px;display:none"></div><p class="sub">点击地图可填写钓点坐标，再在下方确认名称后保存。GPS和地图使用 WGS84 坐标。</p><div id="waterResults"></div>`;
  document
    .getElementById("spots")
    .insertBefore(panel, document.getElementById("spots").children[1]);
  const types = document.querySelector("#pointForm [name=type]");
  types.insertAdjacentHTML(
    "beforeend",
    '<option value="river">河流</option><option value="lake">湖泊</option><option value="reservoir">水库</option>',
  );
  const form = document.getElementById("pointForm");
  form.elements.name.placeholder = "点击地图填写坐标，或手动记录";
  document.getElementById("waterSearchForm").onsubmit = (e) => {
    e.preventDefault();
    searchWaters(document.getElementById("waterQuery").value);
  };
  document.querySelectorAll("#spots .spot").forEach((row) => {
    const deleteButton = row.querySelector('[onclick^="deletePoint"]');
    if (!deleteButton) return;
    const i = Number(deleteButton.getAttribute("onclick").match(/\d+/)[0]),
      p = userPoints[i];
    const sub = row.querySelector("p");
    sub.textContent = `${{ river: "河流", lake: "湖泊", reservoir: "水库", pond: "黑坑", wild: "野钓" }[p.type] || "自建钓点"} · ${p.lat}, ${p.lng}${p.waterCenter ? " · 水域参考中心，非实测钓点" : " · 自行记录，开放情况未核实"}`;
    const b = document.createElement("button");
    b.className = "textbtn";
    b.textContent = "地图查看";
    b.onclick = () => {
      openWaterMap();
      waterMap.setView([p.lat, p.lng], 15);
      markWaterPoint(p);
    };
    row.append(b);
    const weather = document.createElement("button");
    weather.className = "textbtn";
    weather.textContent = "此处天气";
    weather.onclick = () => selectWaterWeather(p);
    row.append(weather);
    const a = document.createElement("a");
    a.className = "textbtn";
    a.textContent = "苹果地图打开";
    a.href = `https://maps.apple.com/?ll=${encodeURIComponent(p.lat + "," + p.lng)}&q=${encodeURIComponent(p.name)}`;
    a.target = "_blank";
    a.rel = "noopener";
    row.append(a);
  });
  if (mapVisible) openWaterMap();
  renderWaterResults();
};
function waterStatus(text) {
  const el = document.getElementById("waterStatus");
  if (el) el.textContent = text;
}
function openWaterMap() {
  if (waterMap) return waterMap;
  if (!window.L) {
    waterStatus("地图组件不可用，请联网更新应用后重试");
    return null;
  }
  mapVisible = true;
  const box = document.getElementById("waterMap");
  box.style.display = "block";
  waterMap = L.map(box, { preferCanvas: true }).setView(
    mapView
      ? [mapView.center.lat, mapView.center.lng]
      : [locs[locationIndex][2], locs[locationIndex][3]],
    mapView?.zoom || 11,
  );
  mapLayerFree(waterBaseKind);
  waterMarkers = L.layerGroup().addTo(waterMap);
  userPoints.forEach(markWaterPoint);
  waterMap.on("click", (e) => {
    const f = document.getElementById("pointForm");
    f.elements.lat.value = e.latlng.lat.toFixed(6);
    f.elements.lng.value = e.latlng.lng.toFixed(6);
    waterStatus("坐标已填入下方钓点表，请输入名称并确认保存。");
    L.circleMarker(e.latlng, { radius: 7, color: "#c5f765" }).addTo(
      waterMarkers,
    );
  });
  waterStatus("在线地图已打开。可点击记录位置，或搜索并收集河流与湖泊。");
  return waterMap;
}
function markWaterPoint(p) {
  if (
    !waterMarkers ||
    !Number.isFinite(Number(p.lat)) ||
    !Number.isFinite(Number(p.lng))
  )
    return;
  const text = document.createElement("span");
  text.textContent = p.name;
  L.circleMarker([p.lat, p.lng], {
    radius: 7,
    color: p.waterCenter ? "#70d8ed" : "#c5f765",
  })
    .bindPopup(text)
    .addTo(waterMarkers);
}
function locateWaterMap() {
  if (!navigator.geolocation)
    return waterStatus("此浏览器无法定位，请搜索水域或手动输入坐标");
  waterStatus("正在请求定位权限…");
  navigator.geolocation.getCurrentPosition(
    (p) => {
      if (!document.getElementById("waterMap")) return;
      const map = openWaterMap();
      if (!map) return;
      map.setView([p.coords.latitude, p.coords.longitude], 14);
      const f = document.getElementById("pointForm");
      f.elements.lat.value = p.coords.latitude.toFixed(6);
      f.elements.lng.value = p.coords.longitude.toFixed(6);
      waterStatus(
        `当前位置坐标已填写，精度约${Math.round(p.coords.accuracy)}米；点击保存才记录到本机。`,
      );
    },
    () => waterStatus("未获定位权限或定位失败，请使用水域搜索和手动坐标"),
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
  );
}
async function waterRequest(url) {
  if (waterBusy) throw Error("搜索正在进行，请稍候");
  if (Date.now() - lastWaterRequest < 1100)
    throw Error("搜索过于频繁，请稍候再试");
  waterBusy = true;
  lastWaterRequest = Date.now();
  try {
    const urls = Array.isArray(url) ? url : [url];
    let lastError;
    for (let i = 0; i < urls.length; i++) {
      try {
        if (i) waterStatus("主河湖服务暂不可用，正在尝试备用数据服务…");
        const r = await fetch(urls[i], {
          signal: requestTimeout(urls.length > 1 ? (i ? 15000 : 8000) : 20000),
          headers: { Accept: "application/json" },
        });
        if (!r.ok) throw Error(`地图服务暂不可用（${r.status}）`);
        const data = await r.json();
        if (urls.length > 1 && !Array.isArray(data.elements))
          throw Error("河湖返回格式不可用");
        return data;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  } finally {
    waterBusy = false;
  }
}
async function searchWaters(query) {
  const q = query.trim();
  if (!q) return;
  waterResults = [];
  renderWaterResults();
  waterStatus("搜索实际地图数据中…");
  try {
    const params = new URLSearchParams({
      q,
      format: "jsonv2",
      limit: "10",
      addressdetails: "1",
      "accept-language": "zh-CN",
    });
    const data = await waterRequest(
      "https://nominatim.openstreetmap.org/search?" + params,
    );
    if (!Array.isArray(data)) throw Error("地图返回格式不可用");
    waterResults = data
      .filter(
        (p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)),
      )
      .map((p) => ({
        name: p.name || p.display_name.split(",")[0],
        detail: p.display_name,
        lat: Number(p.lat),
        lng: Number(p.lon),
        kind:
          (p.class || p.category) === "waterway" ||
          ["river", "stream", "canal"].includes(p.type)
            ? "river"
            : ["lake", "water", "reservoir", "pond"].includes(p.type) ||
                (p.class || p.category) === "water"
              ? "lake"
              : "place",
        source: "OpenStreetMap / Nominatim",
      }));
    renderWaterResults();
    waterStatus(
      waterResults.length
        ? "搜索完成。只有标记为河流/湖泊的条目可收集为水域，其他地点可用于定位地图。"
        : "没有检索到匹配结果，请补充城市或水域名称。",
    );
  } catch (e) {
    waterStatus("搜索不可用：" + e.message);
  }
}
async function discoverWaters() {
  const map = openWaterMap();
  if (!map) return;
  if (map.getZoom() < 11) return waterStatus("请放大地图后搜索当前区域河湖");
  const c = map.getCenter(),
    span = 0.045,
    bbox = [c.lat - span, c.lng - span, c.lat + span, c.lng + span].join(",");
  const query = `[out:json][timeout:15];(nwr["waterway"~"^(river|stream|canal)$"]["name"](${bbox});nwr["natural"="water"]["name"](${bbox}););out body center 60;`;
  waterResults = [];
  renderWaterResults();
  waterStatus("查询当前地图中心附近约10公里内河流、湖泊与水库…");
  try {
    const data = await waterRequest(
      [
        "https://overpass-api.de/api/interpreter?",
        "https://overpass.private.coffee/api/interpreter?",
      ].map((base) => base + new URLSearchParams({ data: query })),
    );
    if (!Array.isArray(data.elements)) throw Error("河湖返回格式不可用");
    waterResults = data.elements
      .filter(
        (p) =>
          p.tags?.name &&
          (Number.isFinite(p.lat) || Number.isFinite(p.center?.lat)),
      )
      .map((p) => ({
        name: p.tags.name,
        detail: p.tags.waterway
          ? "河流水系"
          : p.tags.water === "reservoir"
            ? "水库"
            : "湖泊 / 水面",
        lat: p.lat ?? p.center.lat,
        lng: p.lon ?? p.center.lon,
        kind: p.tags.waterway
          ? "river"
          : p.tags.water === "reservoir"
            ? "reservoir"
            : "lake",
        source: "OpenStreetMap / Overpass",
      }));
    renderWaterResults();
    waterStatus(
      waterResults.length
        ? `检索到${waterResults.length}处有名称水域；中心坐标不代表岸边钓点。`
        : "当前区域没有返回有名称水域，可移动地图或手动记录。",
    );
  } catch (e) {
    waterStatus("河湖检索不可用：" + e.message);
  }
}
function renderWaterResults() {
  const el = document.getElementById("waterResults");
  if (!el) return;
  el.innerHTML = waterResults
    .map(
      (p, i) =>
        `<article class="waterresult"><h3>${esc(p.name)}</h3><p class="sub">${esc(p.detail)} · ${esc(p.source)}</p><button class="pill" onclick="viewWaterResult(${i})">地图查看</button>${p.kind !== "place" ? ` <button class="pill" onclick="saveWaterResult(${i})">收集此水域</button>` : ""}</article>`,
    )
    .join("");
}
function viewWaterResult(i) {
  const p = waterResults[i],
    map = openWaterMap();
  if (map) {
    map.setView([p.lat, p.lng], 13);
    markWaterPoint(p);
  }
}
function saveWaterResult(i) {
  const p = waterResults[i];
  if (!p || p.kind === "place") return;
  if (
    userPoints.some(
      (v) =>
        v.name === p.name &&
        Math.abs(v.lat - p.lat) < 0.0001 &&
        Math.abs(v.lng - p.lng) < 0.0001,
    )
  )
    return toast("该水域已收藏");
  const next = [
    ...userPoints,
    {
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      type: p.kind,
      source: p.source,
      waterCenter: true,
      favorite: true,
    },
  ];
  if (commitList("lc-points", next, (v) => (userPoints = v))) {
    renderSpots();
    toast("水域已收集到本机；实际钓点请另点地图保存");
  }
}
function selectWaterWeather(p) {
  selectedWaterLocation = {
    name: p.name,
    lat: Number(p.lat),
    lng: Number(p.lng),
    type: p.type,
  };
  document.getElementById("placename").textContent = p.name;
  switchPage("weather");
  loadForecast();
}
const mapChooseLocation = chooseLocation;
chooseLocation = function (i) {
  selectedWaterLocation = null;
  mapChooseLocation(i);
};
const mapAddPlan = addPlan;
addPlan = function () {
  if (!selectedWaterLocation) return mapAddPlan();
  const p = selectedWaterLocation,
    key = dateKey(dates[selected]) + "-point-" + p.lat + "-" + p.lng;
  if (saved.some((v) => v.key === key)) return toast("已有该区域当日计划");
  if (
    commitList(
      "lc-plans",
      [
        ...saved,
        {
          key,
          loc: p.name,
          date: dateKey(dates[selected]),
          window: "出发时间待定",
          note: "",
        },
      ],
      (v) => (saved = v),
    )
  )
    toast("计划已保存");
};

function mapLayerFree(kind) {
  if (!waterMap) {
    waterBaseKind = kind;
    openWaterMap();
    return;
  }
  if (waterBaseLayer) waterBaseLayer.remove();
  waterBaseKind = kind;
  const topo = kind === "topo";
  waterBaseLayer = L.tileLayer(
    topo
      ? "https://a.tile.opentopomap.org/{z}/{x}/{y}.png"
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: topo ? 17 : 19,
      attribution: topo
        ? 'Map data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>, SRTM | Map style &copy; <a href="https://opentopomap.org/about" target="_blank" rel="noopener">OpenTopoMap (CC-BY-SA)</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
    },
  ).addTo(waterMap);
  waterBaseLayer.once("tileerror", () => {
    if (topo) {
      mapLayerFree("street");
      waterStatus("地形图服务暂不可用，已切回标准地图。");
    } else waterStatus("底图暂不可用；仍可搜索水域或手动记录坐标。");
  });
}
