(function (root) {
  const WEATHER = "https://api.open-meteo.com/v1/forecast",
    MARINE = "https://marine-api.open-meteo.com/v1/marine";
  function locationKey(p) {
    return Number(p.lat).toFixed(4) + "," + Number(p.lng).toFixed(4);
  }
  function weatherURL(p) {
    return (
      WEATHER +
      "?" +
      new URLSearchParams({
        latitude: p.lat,
        longitude: p.lng,
        forecast_days: 10,
        timezone: "Asia/Shanghai",
        temperature_unit: "celsius",
        wind_speed_unit: "kmh",
        precipitation_unit: "mm",
        daily:
          "temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code",
        current: "temperature_2m,wind_speed_10m,pressure_msl",
        hourly:
          "temperature_2m,wind_speed_10m,pressure_msl,precipitation_probability",
      })
    );
  }
  function marineURL(p) {
    return (
      MARINE +
      "?" +
      new URLSearchParams({
        latitude: p.lat,
        longitude: p.lng,
        forecast_days: 10,
        timezone: "Asia/Shanghai",
        hourly: "sea_level_height_msl",
        cell_selection: "sea",
      })
    );
  }
  const number = (v) => (Number.isFinite(v) ? v : null);
  function normalizeWeather(raw, retrievedAt = new Date().toISOString()) {
    if (raw.error || !Array.isArray(raw.daily?.time) || !raw.daily.time.length)
      throw Error(raw.reason || "未返回逐日天气");
    const d = raw.daily,
      h = raw.hourly;
    const days = d.time
      .slice(0, 10)
      .map((date, i) => ({
        date,
        temperatureMin: number(d.temperature_2m_min?.[i]),
        temperatureMax: number(d.temperature_2m_max?.[i]),
        precipitationChance: Number.isFinite(
          d.precipitation_probability_max?.[i],
        )
          ? d.precipitation_probability_max[i] / 100
          : null,
        weatherCode: number(d.weather_code?.[i]),
      }))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date));
    if (
      !days.some((d) => d.temperatureMin !== null && d.temperatureMax !== null)
    )
      throw Error("没有有效的逐日温度，暂不可用");
    return {
      provider: "Open-Meteo",
      retrievedAt,
      days,
      grid: { lat: raw.latitude, lng: raw.longitude },
      current: raw.current
        ? {
            time: raw.current.time,
            temperature: number(raw.current.temperature_2m),
            windSpeed: number(raw.current.wind_speed_10m),
            pressure: number(raw.current.pressure_msl),
          }
        : null,
      hours: Array.isArray(h?.time)
        ? h.time.map((time, i) => ({
            time,
            temperature: number(h.temperature_2m?.[i]),
            windSpeed: number(h.wind_speed_10m?.[i]),
            pressure: number(h.pressure_msl?.[i]),
            precipitationChance: Number.isFinite(
              h.precipitation_probability?.[i],
            )
              ? h.precipitation_probability[i] / 100
              : null,
          }))
        : [],
    };
  }
  function distanceKm(p, q) {
    const rad = (v) => (v * Math.PI) / 180,
      a = ((q.lat - p.lat) * Math.PI) / 180,
      b = ((q.lng - p.lng) * Math.PI) / 180,
      v =
        Math.sin(a / 2) ** 2 +
        Math.cos(rad(p.lat)) * Math.cos(rad(q.lat)) * Math.sin(b / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, v)));
  }
  function normalizeMarine(raw, p, retrievedAt = new Date().toISOString()) {
    if (
      raw.error ||
      !Array.isArray(raw.hourly?.time) ||
      !Array.isArray(raw.hourly?.sea_level_height_msl)
    )
      throw Error(raw.reason || "未返回海平面数据");
    const grid = { lat: raw.latitude, lng: raw.longitude };
    if (!Number.isFinite(grid.lat) || !Number.isFinite(grid.lng))
      throw Error("缺少模型网格位置");
    const distance = distanceKm(p, grid);
    if (distance > 25)
      throw Error(
        `最近模型网格距所选位置约${Math.round(distance)}公里，不能作为此处潮位`,
      );
    const hours = raw.hourly.time.map((time, i) => ({
      time,
      value: number(raw.hourly.sea_level_height_msl[i]),
    }));
    if (!hours.some((h) => h.value !== null))
      throw Error("所选位置没有有效海平面预报；不提供推算潮位或示例曲线");
    return {
      provider: "Open-Meteo Marine",
      retrievedAt,
      grid,
      distance,
      hours,
    };
  }
  const api = {
    weatherURL,
    marineURL,
    normalizeWeather,
    normalizeMarine,
    locationKey,
    distanceKm,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FreeForecast = api;
})(globalThis);
