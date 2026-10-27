let appleWeather = null,
  appleWeatherState = "unconfigured",
  appleWeatherError = "",
  appleWeatherRequest = 0;
function configuredWeatherEndpoint() {
  try {
    const s = localStorage.getItem("lc-weather-api") || "";
    if (!s) return "";
    const u = new URL(s);
    if (
      u.protocol !== "https:" &&
      !(
        u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname)
      )
    )
      return "";
    return u.href;
  } catch {
    return "";
  }
}
function weatherLocation() {
  return (
    selectedWaterLocation || {
      name: locs[locationIndex][0],
      lat: locs[locationIndex][2],
      lng: locs[locationIndex][3],
    }
  );
}
function weatherDay(i = selected) {
  return appleWeather?.days.find((d) => d.date === dateKey(dates[i]));
}
const weatherNumber = (n) =>
  Number.isFinite(n) ? Math.round(n * 10) / 10 : "—";
function appleAttribution() {
  if (!appleWeather) return "";
  const a = appleWeather.attribution;
  return `<div class="appleattribution"><span>天气数据：Apple Weather</span>${a.combinedMarkDarkURL ? `<img alt="Apple Weather" src="${esc(a.combinedMarkDarkURL)}">` : ""}<a href="${esc(a.legalPageURL)}" target="_blank" rel="noopener">数据来源与法律声明</a><span class="sub">更新于 ${esc(new Date(appleWeather.retrievedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }))}（北京时间）</span></div>`;
}
function weatherStateText() {
  return {
    unconfigured: "Apple WeatherKit 未配置 · 不可用",
    loading: "正在请求 Apple WeatherKit 实际预报…",
    ready: "Apple WeatherKit · 已获取真实预报",
    error: "Apple WeatherKit 暂不可用：" + appleWeatherError,
  }[appleWeatherState];
}
loadForecast = async function () {
  const endpoint = configuredWeatherEndpoint(),
    request = ++appleWeatherRequest;
  appleWeather = null;
  appleWeatherError = "";
  if (!endpoint) {
    appleWeatherState = "unconfigured";
    renderHome();
    if (page === "weather") renderWeather();
    return;
  }
  appleWeatherState = "loading";
  renderHome();
  if (page === "weather") renderWeather();
  try {
    const p = weatherLocation(),
      u = new URL(endpoint);
    u.searchParams.set("lat", p.lat);
    u.searchParams.set("lng", p.lng);
    const r = await fetch(u, {
      signal: requestTimeout(20000),
      headers: { Accept: "application/json" },
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.message || `服务返回${r.status}`);
    if (
      data.provider !== "Apple WeatherKit" ||
      !Array.isArray(data.days) ||
      !data.attribution?.legalPageURL ||
      !data.attribution?.combinedMarkDarkURL ||
      !Number.isFinite(Date.parse(data.retrievedAt))
    )
      throw Error("天气服务返回不完整，无法确认来源与署名");
    for (const field of ["legalPageURL", "combinedMarkDarkURL"]) {
      const u = new URL(data.attribution[field]);
      if (u.protocol !== "https:" || u.hostname !== "weatherkit.apple.com")
        throw Error("Apple 天气署名地址不合法");
    }
    const days = data.days
      .slice(0, 10)
      .filter(
        (d) =>
          /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
          Number.isFinite(d.temperatureMin) &&
          Number.isFinite(d.temperatureMax),
      );
    if (!days.length) throw Error("没有返回有效的逐日预报");
    if (request !== appleWeatherRequest) return;
    appleWeather = { ...data, days };
    appleWeatherState = "ready";
  } catch (e) {
    if (request !== appleWeatherRequest) return;
    appleWeatherState = "error";
    appleWeatherError = e.message || "网络请求失败";
  }
  if (request === appleWeatherRequest) {
    renderHome();
    if (page === "weather") renderWeather();
  }
};
renderDates = function () {
  document.getElementById("dates").innerHTML = dates
    .map((d, i) => {
      const w = weatherDay(i);
      return `<button class="day ${i === selected ? "selected" : ""}" aria-pressed="${i === selected}" onclick="selectDay(${i})"><span>${i === 0 ? "今天" : weekday(d)}</span><b>${fmt(d)}</b><small>${w ? `${weatherNumber(w.temperatureMin)}° / ${weatherNumber(w.temperatureMax)}°` : "预报不可用"}</small></button>`;
    })
    .join("");
};
renderWeather = function () {
  const p = weatherLocation();
  document.getElementById("weather").innerHTML =
    `<h1>未来10天天气</h1><p class="sub">${esc(p.name)} · ${esc(weatherStateText())}</p><div class="card">${dates
      .map((d, i) => {
        const w = weatherDay(i);
        return `<div class="trendrow"><span>${fmt(d)} ${weekday(d)}</span><span>${w ? `${weatherNumber(w.temperatureMin)}° / ${weatherNumber(w.temperatureMax)}°` : "预报不可用"}</span><span>${w && Number.isFinite(w.precipitationChance) ? Math.round(w.precipitationChance * 100) + "%" : "—"}</span><button onclick="selectDay(${i});switchPage('home')">详情</button></div>`;
      })
      .join(
        "",
      )}</div>${appleAttribution()}<button class="pill" onclick="loadForecast()">刷新真实预报</button><details class="card cardpad"><summary>配置 Apple 天气服务</summary><p class="sub">网页不能读取手机“天气”App。WeatherKit 需要有效苹果服务授权和独立 HTTPS 后端；GitHub Pages 无法保存签名私钥。这里只填写你部署的后端接口地址，不能填写 Key、私钥或苹果密码。</p><form id="weatherConfigForm"><label>WeatherKit 后端地址<input name="endpoint" type="url" value="${esc(configuredWeatherEndpoint())}" placeholder="https://你的后端域名/api/weather"></label><button class="pill">保存接口地址</button></form><p class="sub">清空地址可停用请求。未授权、超时、缺少字段或超出返回日期时不补模拟数据。Apple 天气不提供此处所需的当地潮汐表。</p></details>`;
  document.getElementById("weatherConfigForm").onsubmit = (e) => {
    e.preventDefault();
    const value = String(new FormData(e.target).get("endpoint")).trim();
    try {
      if (value) {
        const u = new URL(value);
        if (
          u.protocol !== "https:" &&
          !(
            u.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(u.hostname)
          )
        )
          throw Error("请使用 HTTPS 后端地址");
        if (u.username || u.password) throw Error("地址不能包含账号或密码");
      }
      localStorage.setItem("lc-weather-api", value);
      loadForecast();
    } catch (e) {
      toast("配置未保存：" + e.message);
    }
  };
};
renderMetrics = function () {
  const d = weatherDay(),
    current = selected === 0 ? appleWeather?.current : null;
  document.getElementById("metrics").innerHTML = [
    [
      "最高 / 最低气温",
      d
        ? `${weatherNumber(d.temperatureMax)}° / ${weatherNumber(d.temperatureMin)}°`
        : "—",
    ],
    [
      "当前风速",
      current && Number.isFinite(current.windSpeed)
        ? `${weatherNumber(current.windSpeed)} km/h`
        : "—",
    ],
    [
      "当前气压",
      current && Number.isFinite(current.pressure)
        ? `${weatherNumber(current.pressure)} hPa`
        : "—",
    ],
    [
      "日降水概率",
      d && Number.isFinite(d.precipitationChance)
        ? `${Math.round(d.precipitationChance * 100)}%`
        : "—",
    ],
  ]
    .map(
      ([name, value]) =>
        `<div class="card metric"><div>${name}</div><div class="metricvalue">${value}</div><p class="sub">${d ? "Apple WeatherKit；无对应字段显示 —" : "未配置或无对应日期 · 不可用"}</p></div>`,
    )
    .join("");
};
renderHours = function () {
  document.getElementById("hours").innerHTML =
    '<div class="empty">本版本准备10天逐日预报；逐小时数据未请求，不可用。</div>';
};
renderRecommend = function () {
  document.getElementById("recommend").innerHTML =
    `<div class="eyebrow">PLAN YOUR NEXT CAST</div><h2>记录杭州的下一竿。</h2><p>${esc(weatherStateText())}。出钓计划由你手动安排，不提供未经验证的鱼口评分。</p><button class="planbtn" onclick="addPlan()">加入当日出钓计划</button><button class="planbtn" onclick="switchPage('fish')">记录鱼获与公斤重量</button>`;
};
const weatherCoreHome = renderHome;
renderHome = function () {
  weatherCoreHome();
  document.querySelector('.headmeta').textContent = weatherStateText();
  document.querySelector('.bottominfo').textContent = weatherStateText() + ' · 潮汐未配置 · 个人鱼获与照片仅存本机';
};
navs[1][2] = "10天天气";
navs[2][2] = "鱼种 / 鱼获";
renderNav();
renderHome();
if (configuredWeatherEndpoint()) loadForecast();
