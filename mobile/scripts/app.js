// Keep in-memory state unchanged if WebKit refuses a local storage write.
function commitList(key, next, apply) {
  try {
    localStorage.setItem(key, JSON.stringify(next));
    apply(next);
    return true;
  } catch {
    toast("保存失败：本机存储不可用或空间不足。此次修改未保存。");
    return false;
  }
}
function list(k) {
  try {
    const x = JSON.parse(localStorage.getItem(k) || "[]");
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}
saved = list("lc-plans").filter((p) => p && typeof p.date === "string");
favorites = list("lc-favorites").filter((i) => Number.isInteger(i) && locs[i]);
userPoints = list("lc-points").filter((p) => p && typeof p.name === "string");
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const missing = (name, detail) =>
  `<div class="card cardpad"><h2>${name} · 不可用</h2><p class="viewdesc">${detail}</p><p class="sub">未配置服务，不提供模拟预报。出发前请核对官方天气、潮位与当地规定。</p></div>`;
navs[2][2] = "鱼种参考";
renderNav();
renderDates = function () {
  document.getElementById("dates").innerHTML = dates
    .map(
      (d, i) =>
        `<button class="day ${i === selected ? "selected" : ""}" aria-pressed="${i === selected}" onclick="selectDay(${i})"><span>${weekday(d)}</span><b>${fmt(d)}</b><small>预报不可用</small></button>`,
    )
    .join("");
};
renderMetrics = function () {
  document.getElementById("metrics").innerHTML = [
    "气温",
    "风速",
    "气压",
    "降水概率",
  ]
    .map(
      (n) =>
        `<div class="card metric"><div>${n}</div><div class="metricvalue">—</div><div class="sub">未配置 · 不可用</div></div>`,
    )
    .join("");
};
renderTide = function () {
  document.getElementById("tidedate").textContent = fmt(dates[selected]);
  document.getElementById("btn15").hidden = true;
  document.getElementById("tidecontent").innerHTML = missing(
    "当地潮汐",
    "尚未配置授权数据和潮位站，无法提供潮高、高低潮时间及15天潮表。",
  );
};
renderWeather = function () {
  document.getElementById("weather").innerHTML =
    "<h1>天气预报</h1>" +
    missing(
      "天气",
      "尚未配置天气接口。下列日期仅用于手动计划，不代表适宜出钓。",
    ) +
    '<div class="card">' +
    dates
      .map(
        (d, i) =>
          `<div class="trendrow"><span>${fmt(d)} ${weekday(d)}</span><span>预报不可用</span><span>—</span><button onclick="selectDay(${i});switchPage('home')">选择日期</button></div>`,
      )
      .join("") +
    "</div>";
};
renderSpots = function () {
  document.getElementById("spots").innerHTML =
    "<h1>发现钓点</h1>" +
    missing(
      "地图与公共钓点",
      "尚未配置地图及钓点名录。以下仅为参考区域，未核实垂钓开放情况。",
    ) +
    locs
      .map(
        (l, i) =>
          `<div class="card spot"><div><h3>${esc(l[0])}</h3><p class="sub">参考区域 · 非核实钓点</p><button onclick="chooseLocation(${i});switchPage('home')">选择区域</button></div><button class="star" aria-label="${favorites.includes(i) ? "取消收藏" : "收藏"} ${esc(l[0])}" aria-pressed="${favorites.includes(i)}" onclick="toggleFav(${i})">${favorites.includes(i) ? "★" : "☆"}</button></div>`,
      )
      .join("") +
    '<h2>本机钓点记录</h2><form id="pointForm" class="card cardpad"><label>名称<input name="name" required maxlength="60"></label><label>类型<select name="type"><option value="wild">野钓</option><option value="pond">黑坑</option></select></label><label>纬度 (WGS84)<input name="lat" type="number" min="-90" max="90" step="any" required></label><label>经度 (WGS84)<input name="lng" type="number" min="-180" max="180" step="any" required></label><button class="pill">保存钓点</button></form>' +
    userPoints
      .map(
        (p, i) =>
          `<div class="card spot"><div><strong>${esc(p.name)}</strong><p>${p.type === "pond" ? "黑坑" : "野钓"} · ${esc(p.lat)}, ${esc(p.lng)} · 未核实</p></div><button onclick="favoritePoint(${i})" aria-label="收藏本机钓点" aria-pressed="${!!p.favorite}">${p.favorite ? "★" : "☆"}</button><button onclick="pointPlan(${i})">加入所选日期计划</button><button onclick="deletePoint(${i})">删除</button></div>`,
      )
      .join("");
  document.getElementById("pointForm").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target),
      name = String(f.get("name")).trim();
    if (!name) return;
    const lat = Number(f.get("lat")),
      lng = Number(f.get("lng"));
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    )
      return toast("请输入有效坐标");
    const next = [...userPoints, { name, type: f.get("type"), lat, lng }];
    if (commitList("lc-points", next, (v) => (userPoints = v))) renderSpots();
  };
};
function deletePoint(i) {
  if (
    commitList(
      "lc-points",
      userPoints.filter((_, j) => j !== i),
      (v) => (userPoints = v),
    )
  )
    renderSpots();
}
renderProfile = function () {
  document.getElementById("profile").innerHTML =
    `<h1>我的出钓</h1><p class="sub">免登录本机模式 · 登录和云同步不可用。清除应用数据或卸载会丢失记录。</p><h2>出钓计划 (${saved.length})</h2>${saved.map((p, i) => `<form class="card cardpad" onsubmit="savePlan(event,${i})"><h3>${esc(p.loc)} · ${esc(p.date)}</h3><label>出发时间<input name="time" type="time" value="${/^\d{2}:\d{2}$/.test(p.window) ? p.window : ""}"></label><label>备注<textarea name="note" maxlength="300">${esc(p.note)}</textarea></label><button class="pill">保存修改</button> <button type="button" onclick="removePlan(${i})">移除计划</button><p class="sub">手动计划，不代表适宜出钓；未启用系统提醒。</p></form>`).join("") || '<div class="empty">暂无计划，在首页选择日期后加入。</div>'}<h2>收藏区域 (${favorites.length})</h2>${
      favorites
        .filter((i) => locs[i])
        .map(
          (i) =>
            `<div class="card spot"><strong>${esc(locs[i][0])}</strong><button onclick="chooseLocation(${i});switchPage('home')">选择区域</button><button onclick="unfavorite(${i})">取消收藏</button></div>`,
        )
        .join("") || '<div class="empty">到发现钓点收藏区域。</div>'
    }<h2>收藏本机钓点</h2>${
      userPoints
        .filter((p) => p.favorite)
        .map(
          (p) =>
            `<div class="card spot"><strong>${esc(p.name)}</strong><span class="sub">未核实 · 本机记录</span></div>`,
        )
        .join("") || '<div class="empty">暂无收藏本机钓点</div>'
    }<p class="sub">自建钓点在发现页面管理。微信和 Apple 登录未配置。</p>`;
};
function savePlan(e, i) {
  e.preventDefault();
  const f = new FormData(e.target);
  const next = saved.map((p, j) =>
    j === i
      ? {
          ...p,
          window: String(f.get("time") || "出发时间待定"),
          note: String(f.get("note") || "").slice(0, 300),
        }
      : p,
  );
  if (commitList("lc-plans", next, (v) => (saved = v))) toast("计划已保存");
}
function unfavorite(i) {
  if (
    commitList(
      "lc-favorites",
      favorites.filter((v) => v !== i),
      (v) => (favorites = v),
    )
  )
    renderProfile();
}
toggleFav = function (i) {
  const next = favorites.includes(i)
    ? favorites.filter((v) => v !== i)
    : [...favorites, i];
  if (commitList("lc-favorites", next, (v) => (favorites = v))) renderSpots();
};
addPlan = function () {
  const key = dateKey(dates[selected]) + "-" + locationIndex;
  if (saved.some((p) => p.key === key)) return toast("该区域当天已有计划");
  const next = [
    ...saved,
    {
      key,
      loc: locs[locationIndex][0],
      date: dateKey(dates[selected]),
      window: "出发时间待定",
      note: "",
    },
  ];
  if (commitList("lc-plans", next, (v) => (saved = v)))
    toast("计划已保存，可在我的出钓编辑");
};
removePlan = function (i) {
  if (
    commitList(
      "lc-plans",
      saved.filter((_, j) => j !== i),
      (v) => (saved = v),
    )
  )
    renderProfile();
};
renderLocations = function (q) {
  document.getElementById("locations").innerHTML =
    locs
      .map((l, i) => ({ l, i }))
      .filter((x) => x.l.join("").includes(q))
      .map(
        ({ l, i }) =>
          `<button class="locationoption" onclick="chooseLocation(${i})">${esc(l[0])}<small>参考区域 · 未配置潮位站</small></button>`,
      )
      .join("") || "<p>未找到区域</p>";
};
document.querySelector("#locationModal .sub").textContent =
  "选择参考区域；非核实钓点或潮位站";
renderHome();

function favoritePoint(i) {
  const next = userPoints.map((p, j) =>
    j === i ? { ...p, favorite: !p.favorite } : p,
  );
  if (commitList("lc-points", next, (v) => (userPoints = v))) renderSpots();
}
function pointPlan(i) {
  const p = userPoints[i];
  const key = dateKey(dates[selected]) + "-point-" + p.lat + "-" + p.lng;
  if (saved.some((v) => v.key === key)) return toast("已有该钓点当日计划");
  const next = [
    ...saved,
    {
      key,
      loc: p.name,
      date: dateKey(dates[selected]),
      window: "出发时间待定",
      note: "",
    },
  ];
  if (commitList("lc-plans", next, (v) => (saved = v)))
    toast("已加入 " + fmt(dates[selected]) + " 的计划");
}
