import { createServer } from "node:http";
import { createPrivateKey, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const base = "https://weatherkit.apple.com";
const encoded = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
export function weatherToken(config, now = Math.floor(Date.now() / 1000)) {
  const header = {
    alg: "ES256",
    kid: config.keyId,
    id: config.teamId + "." + config.serviceId,
    typ: "JWT",
  };
  const payload = {
    iss: config.teamId,
    iat: now - 5,
    exp: now + 1800,
    sub: config.serviceId,
  };
  const body = encoded(header) + "." + encoded(payload);
  const key = createPrivateKey(config.privateKey);
  if (
    key.asymmetricKeyType !== "ec" ||
    key.asymmetricKeyDetails?.namedCurve !== "prime256v1"
  )
    throw Error("WeatherKit requires an ES256 P-256 signing key");
  return (
    body +
    "." +
    sign("sha256", Buffer.from(body), {
      key,
      dsaEncoding: "ieee-p1363",
    }).toString("base64url")
  );
}
export async function configFromEnv(env = process.env) {
  return {
    teamId: env.WEATHERKIT_TEAM_ID,
    serviceId: env.WEATHERKIT_SERVICE_ID,
    keyId: env.WEATHERKIT_KEY_ID,
    privateKey:
      env.WEATHERKIT_PRIVATE_KEY ||
      (env.WEATHERKIT_PRIVATE_KEY_PATH
        ? await readFile(env.WEATHERKIT_PRIVATE_KEY_PATH, "utf8")
        : ""),
    allowedOrigin:
      env.LURECAST_ALLOWED_ORIGIN || "https://dengboer80-cmd.github.io",
  };
}
const dateInChina = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export function normalizeWeather(data, attribution, now = new Date()) {
  const legalPageURL = attribution.legalPageURL,
    combinedMarkDarkURL = attribution.combinedMarkDarkURL;
  for (const value of [legalPageURL, combinedMarkDarkURL]) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "weatherkit.apple.com")
      throw Error("Incomplete WeatherKit attribution");
  }
  const days = (data.forecastDaily?.days || [])
    .slice(0, 10)
    .map((d) => ({
      date: dateInChina(d.forecastStart),
      temperatureMin: d.temperatureMin,
      temperatureMax: d.temperatureMax,
      conditionCode: d.conditionCode,
      precipitationChance:
        Number.isFinite(d.precipitationChance) &&
        d.precipitationChance >= 0 &&
        d.precipitationChance <= 1
          ? d.precipitationChance
          : null,
    }))
    .filter(
      (d) =>
        Number.isFinite(d.temperatureMin) && Number.isFinite(d.temperatureMax),
    );
  if (!days.length) throw Error("WeatherKit returned no daily forecasts");
  const c = data.currentWeather;
  return {
    provider: "Apple WeatherKit",
    retrievedAt: now.toISOString(),
    days,
    current: c
      ? {
          temperature: Number.isFinite(c.temperature) ? c.temperature : null,
          pressure: Number.isFinite(c.pressure) ? c.pressure : null,
          windSpeed: Number.isFinite(c.windSpeed) ? c.windSpeed : null,
        }
      : null,
    attribution: { legalPageURL, combinedMarkDarkURL },
  };
}
export function makeWeatherServer(
  config,
  { fetchImpl = fetch, now = () => Date.now() } = {},
) {
  const cache = new Map(),
    pending = new Map(),
    rates = new Map();
  const configured = () =>
    !!(config.teamId && config.serviceId && config.keyId && config.privateKey);
  const server = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vary", "Origin");
    const origin = req.headers.origin;
    const send = (status, data) => {
      res.writeHead(status);
      res.end(JSON.stringify(data));
    };
    if (origin && origin !== config.allowedOrigin)
      return send(403, { message: "此网站未获天气后端访问授权" });
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Accept");
      res.writeHead(204);
      return res.end();
    }
    if (req.method !== "GET")
      return send(405, { message: "Only GET is supported" });
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/healthz")
      return send(200, {
        service: "LureCast WeatherKit backend",
        configured: configured(),
      });
    if (url.pathname !== "/api/weather")
      return send(404, { message: "Not found" });
    const lat = Number(url.searchParams.get("lat")),
      lng = Number(url.searchParams.get("lng"));
    if (
      !url.searchParams.has("lat") ||
      !url.searchParams.has("lng") ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    )
      return send(400, { message: "请提供有效 WGS84 经纬度" });
    if (!configured())
      return send(503, {
        code: "weatherkit_not_configured",
        message: "Apple WeatherKit 授权及服务端签名尚未配置，真实预报不可用",
      });
    const ip = req.socket.remoteAddress,
      rate = rates.get(ip);
    if (!rate || now() - rate.start >= 60000)
      rates.set(ip, { start: now(), count: 1 });
    else if (++rate.count > 30)
      return send(429, { message: "请求过于频繁，请稍后重试" });
    if (rates.size > 1000)
      for (const [key, value] of rates)
        if (now() - value.start >= 60000) rates.delete(key);
    const key = lat.toFixed(4) + "," + lng.toFixed(4),
      stored = cache.get(key);
    if (stored && stored.expires > now()) return send(200, stored.data);
    try {
      if (!pending.has(key))
        pending.set(
          key,
          (async () => {
            const token = weatherToken(config),
              headers = {
                Authorization: "Bearer " + token,
                Accept: "application/json",
              };
            const get = async (path) => {
              const r = await fetchImpl(base + path, {
                headers,
                signal: AbortSignal.timeout(15000),
              });
              if (!r.ok) throw Error("Apple service status " + r.status);
              return r.json();
            };
            const [weather, attribution] = await Promise.all([
              get(
                `/api/v1/weather/zh/${lat}/${lng}?dataSets=currentWeather,forecastDaily&timezone=Asia%2FShanghai`,
              ),
              get("/api/v1/attribution/zh"),
            ]);
            const data = normalizeWeather(
              weather,
              attribution,
              new Date(now()),
            );
            cache.set(key, { data, expires: now() + 600000 });
            if (cache.size > 500) cache.delete(cache.keys().next().value);
            return data;
          })().finally(() => pending.delete(key)),
        );
      send(200, await pending.get(key));
    } catch {
      send(502, {
        code: "weatherkit_unavailable",
        message:
          "Apple WeatherKit 请求或署名校验失败，请检查后端授权、额度与网络；未使用模拟预报",
      });
    }
  });
  return server;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const config = await configFromEnv();
  makeWeatherServer(config).listen(
    Number(process.env.PORT || 8787),
    "0.0.0.0",
    () =>
      console.log(
        "WeatherKit backend listening; credentials are never returned to the browser.",
      ),
  );
}
