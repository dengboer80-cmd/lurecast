let freeWeather = null,
  freeMarine = null,
  weatherState = "loading",
  marineState = "loading",
  weatherError = "",
  marineError = "",
  freeRequest = 0;
const memoryForecasts = new Map();
function weatherLocation() {
  return (
    selectedWaterLocation || {
      name: locs[locationIndex][0],
      lat: locs[locationIndex][2],
      lng: locs[locationIndex][3],
    }
  );
}
const weatherNumber = (v) =>
  Number.isFinite(v) ? Math.round(v * 10) / 10 : "—";
function weatherDay(i = selected) {
  return freeWeather?.days.find((d) => d.date === dateKey(dates[i]));
}
function weatherStateText() {
  return {
    loading: "正在获取免费15天天气…",
    ready: "Open-Meteo · 真实模型天气",
    error: "天气暂不可用：" + weatherError,
  }[weatherState];
}
function marineStateText() {
  return {
    loading: "正在获取海洋模型…",
    ready: "海平面模型（含潮汐影响）",
    error: "此处海平面预报不可用：" + marineError,
  }[marineState];
}
function updatedAt(data) {
  return data
    ? new Date(data.retrievedAt).toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
      })
    : "—";
}
function weatherAttribution() {
  return `<p class="sub">数据：<a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> · 免费非商业API · 数据署名：CC BY 4.0<br>${freeWeather ? "获取于 " + esc(updatedAt(freeWeather)) + "（北京时间）" + (freeWeather.cached ? " · 最近发布缓存，非实时刷新" : "") : esc(weatherStateText())}</p>`;
}
async function publicData(url) {
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: requestTimeout(12000),
  });
  let d;
  try {
    d = await r.json();
  } catch {
    throw Error("服务未返回有效JSON");
  }
  if (!r.ok || d.error) throw Error(d.reason || `数据服务返回${r.status}`);
  return d;
}
async function defaultCache(kind, p) {
  try {
    const r = await fetch("./data/free-forecast.json", {
      signal: requestTimeout(4000),
    });
    if (!r.ok) return null;
    const cache = await r.json(),
      entry = cache.entries?.find(
        (v) => v.kind === kind && v.locationKey === FreeForecast.locationKey(p),
      );
    if (!entry) return null;
    const age = Date.now() - Date.parse(entry.retrievedAt);
    if (!Number.isFinite(age) || age < 0 || age > 3 * 3600000) return null;
    return entry;
  } catch {
    return null;
  }
}
async function fetchForecast(kind, p, force = false) {
  const key = kind + ":" + FreeForecast.locationKey(p),
    previous = memoryForecasts.get(key);
  if (
    !force &&
    previous &&
    Date.now() - Date.parse(previous.retrievedAt) < 600000
  )
    return previous;
  const normalize =
    kind === "weather"
      ? (raw) => FreeForecast.normalizeWeather(raw)
      : (raw) => FreeForecast.normalizeMarine(raw, p);
  try {
    const data = normalize(
      await publicData(
        kind === "weather"
          ? FreeForecast.weatherURL(p)
          : FreeForecast.marineURL(p),
      ),
    );
    memoryForecasts.set(key, data);
    return data;
  } catch (error) {
    const cached = await defaultCache(kind, p);
    if (cached) {
      try {
        const data =
          kind === "weather"
            ? FreeForecast.normalizeWeather(cached.data, cached.retrievedAt)
            : FreeForecast.normalizeMarine(cached.data, p, cached.retrievedAt);
        data.cached = true;
        return data;
      } catch {}
    }
    throw error;
  }
}
function renderForecastViews() {
  renderHome();
  if (page === "weather") renderWeather();
}
loadForecast = async function (force = false) {
  const id = ++freeRequest,
    p = weatherLocation();
  freeWeather = null;
  freeMarine = null;
  weatherState = "loading";
  marineState = "loading";
  weatherError = "";
  marineError = "";
  renderForecastViews();
  const marineAllowed = !["river", "lake", "reservoir", "pond"].includes(
    p.type,
  );
  if (!marineAllowed) {
    marineState = "error";
    marineError =
      "海洋模型不能代替河流、湖泊或水库水位，也不能提供钱塘江本地站潮表";
    renderForecastViews();
  }
  await Promise.allSettled([
    fetchForecast("weather", p, force)
      .then((d) => {
        if (id !== freeRequest) return;
        freeWeather = d;
        weatherState = "ready";
        renderForecastViews();
      })
      .catch((e) => {
        if (id !== freeRequest) return;
        weatherState = "error";
        weatherError = e.message || "网络不可用";
        renderForecastViews();
      }),
    ...(marineAllowed
      ? [
          fetchForecast("marine", p, force)
            .then((d) => {
              if (id !== freeRequest) return;
              freeMarine = d;
              marineState = "ready";
              renderForecastViews();
            })
            .catch((e) => {
              if (id !== freeRequest) return;
              marineState = "error";
              marineError = e.message || "网络不可用";
              renderForecastViews();
            }),
        ]
      : []),
  ]);
};
renderDates = function () {
  document.getElementById("dates").innerHTML = dates
    .map((d, i) => {
      const w = weatherDay(i),
        available =
          w?.temperatureMin !== null && w?.temperatureMax !== null && w;
      return `<button class="day ${i === selected ? "selected" : ""}" aria-pressed="${i === selected}" onclick="selectDay(${i})"><span>${i === 0 ? "今天" : weekday(d)}</span><b>${fmt(d)}</b><small>${available ? `${weatherNumber(w.temperatureMin)}° / ${weatherNumber(w.temperatureMax)}°` : "预报不可用"}</small></button>`;
    })
    .join("");
};
renderWeather = function () {
  document.getElementById("weather").innerHTML =
    `<h1>未来15天天气</h1><p class="sub">${esc(weatherLocation().name)} · ${esc(weatherStateText())}</p><div class="card">${dates
      .map((d, i) => {
        const w = weatherDay(i),
          available =
            w && w.temperatureMin !== null && w.temperatureMax !== null;
        return `<div class="trendrow"><span>${fmt(d)} ${weekday(d)}</span><span>${available ? `${weatherNumber(w.temperatureMin)}° / ${weatherNumber(w.temperatureMax)}°` : "预报不可用"}<small class="weatherfacts">日出 ${w?.sunrise?.slice(11,16)||"—"} · 日落 ${w?.sunset?.slice(11,16)||"—"} · UV ${weatherNumber(w?.uvIndex)}</small></span><span>${Number.isFinite(w?.precipitationChance) ? Math.round(w.precipitationChance * 100) + "%" : "—"}</span><button onclick="selectDay(${i});switchPage('home')">详情</button></div>`;
      })
      .join(
        "",
      )}</div>${weatherAttribution()}<button class="pill" onclick="loadForecast(true)">刷新天气与海洋数据</button><p class="sub">无需Key，适用于当前5人非商业测试；免费接口有额度且无可用性保证。缺失日期/字段不补模拟值。当前值对应数据获取时间，远期预报存在不确定性。</p>`;
};
function compassDirection(v){if(!Number.isFinite(v))return '—';return ['北','北东北','东北','东东北','东','东东南','东南','南东南','南','南西南','西南','西西南','西','西西北','西北','北西北'][Math.round(((v%360+360)%360)/22.5)%16]+'风 '+Math.round(v)+'°';}
function selectedWeatherHour(){const key=dateKey(dates[selected]);const current=selected===0?freeWeather?.current:null;const hour=current?.time?.slice(11,13)||'12';return {value:freeWeather?.hours.find(h=>h.time.startsWith(key+'T'+hour+':'))||null,hour};}
renderMetrics = function () {
 const d=weatherDay(),pick=selectedWeatherHour(),c=pick.value,key=dateKey(dates[selected]),p=weatherLocation(),fresh=['river','lake','reservoir','pond'].includes(p.type)||p.name.includes('杭州'),water=fresh?null:freeMarine?.hours.find(h=>h.time.startsWith(key+'T'+pick.hour+':'))?.waterTemperature;
 const metrics=[
 ['气温',c?.temperature,'°C','体感 '+weatherNumber(c?.apparentTemperature)+'°C'],
 ['风速',c?.windSpeed,'km/h',compassDirection(c?.windDirection)+' · 来向'],
 ['气压',c?.pressure,'hPa','海平面气压'],
 ['降水概率',Number.isFinite(c?.precipitationChance)?c.precipitationChance*100:null,'%','选定小时预报'],
 ['日出',null,'',d?.sunrise?.slice(11,16)||'—'],
 ['日落',null,'',d?.sunset?.slice(11,16)||'—'],
 ['紫外线',d?.uvIndex,'','当日最大UV指数'],
 [fresh?'水温未接入':'海表水温',water,'°C',fresh?'河湖不套用海温':'模型海温 · 非现场实测']
 ];
 document.getElementById('metrics').innerHTML=metrics.map(([name,v,u,note])=>`<div class="card metric"><div class="metrichead">${name}</div><div class="metricvalue">${name==='日出'||name==='日落'?esc(note):weatherNumber(v)+(Number.isFinite(v)?' <small>'+u+'</small>':'')}</div><p class="sub">${name==='日出'||name==='日落'?'当地时间（UTC+8）':esc(note)}<br>${key} ${name==='日出'||name==='日落'||name==='紫外线'?'':pick.hour+':00'} · 缺失显示 —</p></div>`).join('');
};
renderHours = function () {
 const rows=freeWeather?.hours.filter(h=>h.time.startsWith(dateKey(dates[selected])))||[];
 document.getElementById('hours').innerHTML=rows.length?rows.map(h=>`<div class="hour"><div>${esc(h.time.slice(11))}</div><div>${weatherNumber(h.temperature)}° / 体感 ${weatherNumber(h.apparentTemperature)}°</div><div>${weatherNumber(h.windSpeed)}km/h · ${compassDirection(h.windDirection)}</div><div>${Number.isFinite(h.precipitationChance)?Math.round(h.precipitationChance*100)+'%':'—'}</div></div>`).join(''):'<div class="empty">逐小时天气暂不可用，不显示模拟数值。</div>';
};
renderTide = function () {
  document.getElementById("tidedate").textContent = fmt(dates[selected]);
  document.getElementById("btn15").hidden = true;
  const title = document
    .querySelector("#tidecontent")
    ?.closest(".card")
    ?.querySelector("h2");
  if (title?.firstChild?.nodeType === Node.TEXT_NODE)
    title.firstChild.nodeValue = "潮汐与海平面模型参考 ";
  const rows =
      freeMarine?.hours.filter((h) =>
        h.time.startsWith(dateKey(dates[selected])),
      ) || [],
    valid = rows.filter((h) => h.value !== null);
  if (!valid.length) {
    document.getElementById("tidecontent").innerHTML =
      `<div class="empty"><h3>${marineState === "loading" ? "海洋数据加载中" : "此日期 / 位置无可用海平面预报"}</h3><p>${esc(marineStateText())}</p><p>杭州河道潮位和钱塘江涌潮不在此免费模型验证范围内。可选择舟山等沿海参考区域查询模型数据，不代替本地潮位站表。</p><button class="textbtn" onclick="openLocations()">切换参考区域</button></div>`;
    return;
  }
  const min = Math.min(...valid.map((v) => v.value)),
    max = Math.max(...valid.map((v) => v.value)),
    span = Math.max(0.2, max - min),
    x = (h) => 35 + (Number(h.time.slice(11, 13)) * 650) / 23,
    y = (v) => 165 - ((v - min) / span) * 125;
  let path = "",
    connected = false;
  for (const h of rows) {
    if (h.value === null) {
      connected = false;
      continue;
    }
    path += (connected ? " L" : " M") + x(h) + "," + y(h.value);
    connected = true;
  }
  document.getElementById("tidecontent").innerHTML =
    `<p class="viewdesc">海平面高度（含潮汐与其他海洋影响）<br>相对全球平均海平面MSL，单位m；不是本地潮位站潮表。</p><svg viewBox="0 0 720 205" role="img" aria-label="实际返回的海平面模型曲线，缺失时段不连线"><text x="3" y="30" fill="#91a39c" font-size="11">${max.toFixed(2)}m</text><text x="3" y="178" fill="#91a39c" font-size="11">${min.toFixed(2)}m</text><path d="${path}" fill="none" stroke="#70d8ed" stroke-width="2.5"/>${valid.map((h) => `<circle cx="${x(h)}" cy="${y(h.value)}" r="2" fill="#70d8ed"/>`).join("")}<text x="35" y="199" fill="#91a39c" font-size="11">00:00</text><text x="645" y="199" fill="#91a39c" font-size="11">23:00</text></svg><p class="sub">当前日有效${valid.length}/${rows.length}小时；缺失不插值。模型网格 ${freeMarine.grid.lat.toFixed(3)}, ${freeMarine.grid.lng.toFixed(3)}，距选择位置约${freeMarine.distance.toFixed(1)}公里。<br>来源：<a href="https://open-meteo.com/en/docs/marine-weather-api" target="_blank" rel="noopener">Open-Meteo Marine</a> · 获取于${esc(updatedAt(freeMarine))}${freeMarine.cached ? " · 最近发布缓存" : ""}。<br>不适用于航行、河道潮位或涌潮安全判断；本版本不计算高潮/低潮时刻。</p>`;
};
renderRecommend = function () {
  document.getElementById("recommend").innerHTML =
    `<div class="eyebrow">PLAN YOUR NEXT CAST</div><h2>下一竿，先看条件。</h2><p>${esc(weatherStateText())}。站点潮汐请在左侧单独选择，鱼口条件可按鱼种逐小时查看。</p><button class="planbtn" onclick="addPlan()">加入当日出钓计划</button><button class="planbtn" onclick="switchPage('fish')">查看鱼种钓鱼指数</button>`;
};
const forecastCoreHome = renderHome;
renderHome = function () {
  forecastCoreHome();
  document.querySelector(".headmeta").textContent = weatherStateText();
  document.querySelector(".bottominfo").textContent =
    "天气与海洋数据：Open-Meteo · 免费非商业API · 收藏和钓点仅存本机";
};
navs[1][2] = "15天天气";
navs[2][2] = "钓鱼指数";
renderNav();
renderHome();
loadForecast();
