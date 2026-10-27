import { writeFile, mkdir } from "node:fs/promises";
const headers = {
  "User-Agent":
    "LureCast-research/0.3 (+https://github.com/dengboer80-cmd/lurecast)",
};
const sources = [
  [
    "Open-Meteo pricing",
    "https://open-meteo.com/en/pricing",
    ["non-commercial", "10,000", "600", "300,000", "commercial"],
  ],
  [
    "Open-Meteo weather docs",
    "https://open-meteo.com/en/docs",
    ["16 days", "forecast_days", "CC BY", "attribution"],
  ],
  [
    "Open-Meteo marine docs",
    "https://open-meteo.com/en/docs/marine-weather-api",
    ["sea_level_height_msl", "GTSM", "10 days", "tides", "not suitable"],
  ],
  [
    "NOAA CO-OPS API",
    "https://api.tidesandcurrents.noaa.gov/api/prod/",
    ["predictions", "datum", "station"],
  ],
  [
    "QWeather ocean pricing",
    "https://dev.qweather.com/en/docs/api/ocean/tide/",
    ["subscription", "10 days", "location"],
  ],
  [
    "WorldTides",
    "https://www.worldtides.info/developer",
    ["free", "credits", "pricing"],
  ],
  ["Stormglass", "https://stormglass.io/pricing/", ["free", "10", "requests"]],
  [
    "OpenStreetMap tile policy",
    "https://operations.osmfoundation.org/policies/tiles/",
    ["attribution", "offline", "prefetch", "free"],
  ],
  [
    "Nominatim policy",
    "https://operations.osmfoundation.org/policies/nominatim/",
    ["1 request", "autocomplete", "systematic"],
  ],
  [
    "OpenFreeMap",
    "https://openfreemap.org/",
    ["free", "API key", "commercial", "registration"],
  ],
  [
    "OpenTopoMap",
    "https://opentopomap.org/about",
    ["CC-BY-SA", "OpenStreetMap"],
  ],
];
const report = {
  checkedAt: new Date().toISOString(),
  documents: [],
  requests: [],
};
if (!process.argv.includes("--api-only"))
  await Promise.all(
    sources.map(async ([name, url, terms]) => {
      try {
        const r = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(25000),
        });
        const raw = await r.text();
        const text = raw
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ");
        const snippets = terms.map((term) => {
          const i = text.toLowerCase().indexOf(term.toLowerCase());
          return {
            term,
            text: i >= 0 ? text.slice(Math.max(0, i - 90), i + 230) : null,
          };
        });
        report.documents.push({ name, url, status: r.status, snippets });
        console.log(
          `::notice title=Free source research::${name}: HTTP ${r.status}. ${snippets
            .filter((v) => v.text)
            .map((v) => v.text)
            .join(" | ")
            .slice(0, 1800)
            .replace(/\n/g, " ")}`,
        );
      } catch (e) {
        report.documents.push({ name, url, error: e.message });
        console.log(
          `::warning title=Free source research::${name}: ${e.message}`,
        );
      }
    }),
  );
const weather =
  "https://api.open-meteo.com/v1/forecast?" +
  new URLSearchParams({
    latitude: "30.2741",
    longitude: "120.1551",
    forecast_days: "10",
    timezone: "Asia/Shanghai",
    daily:
      "temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code",
    current: "temperature_2m,wind_speed_10m,pressure_msl",
  });
const marine = ([lat, lon]) =>
  "https://marine-api.open-meteo.com/v1/marine?" +
  new URLSearchParams({
    latitude: lat,
    longitude: lon,
    forecast_days: "10",
    timezone: "Asia/Shanghai",
    hourly: "sea_level_height_msl",
    cell_selection: "sea",
  });
for (const [name, url] of [
  ["Hangzhou 10-day weather", weather],
  ["Zhoushan sea level", marine(["29.91", "122.38"])],
  ["Hangzhou sea level", marine(["30.2741", "120.1551"])],
]) {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(25000) });
    const data = await r.json();
    const record = { name, url, status: r.status, data };
    report.requests.push(record);
    console.log(
      `::notice title=Live free API research::${name}: ${JSON.stringify({ status: r.status, error: data.reason, grid: [data.latitude, data.longitude], dailyCount: data.daily?.time?.length, hourCount: data.hourly?.time?.length, finiteSeaLevels: data.hourly?.sea_level_height_msl?.filter(Number.isFinite).length, firstDate: data.daily?.time?.[0], lastDate: data.daily?.time?.at(-1) })}`,
    );
  } catch (e) {
    report.requests.push({ name, url, error: e.message });
    console.log(
      `::warning title=Live free API research::${name}: ${e.message}`,
    );
  }
}
await mkdir("research-output", { recursive: true });
await writeFile(
  process.argv.includes("--api-only")
    ? "research-output/live-api.json"
    : "research-output/free-sources.json",
  JSON.stringify(report, null, 2),
);
