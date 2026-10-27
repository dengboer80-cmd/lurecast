import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url),
  api = require("./free-data.js");
const targets = [
  ["weather", { lat: 30.2741, lng: 120.1551 }],
  ["marine", { lat: 30.2741, lng: 120.1551 }],
  ["marine", { lat: 29.91, lng: 122.38 }],
];
const cache = { generatedAt: new Date().toISOString(), entries: [] };
await Promise.all(
  targets.map(async ([kind, p]) => {
    try {
      const url = kind === "weather" ? api.weatherURL(p) : api.marineURL(p);
      const r = await fetch(url, {
        headers: {
          "User-Agent":
            "LureCast/0.3 (+https://github.com/dengboer80-cmd/lurecast)",
        },
        signal: AbortSignal.timeout(20000),
      });
      const data = await r.json();
      if (!r.ok || data.error) throw Error(data.reason || "HTTP " + r.status);
      const retrievedAt = new Date().toISOString();
      if (kind === "weather") api.normalizeWeather(data, retrievedAt);
      else api.normalizeMarine(data, p, retrievedAt);
      cache.entries.push({
        kind,
        locationKey: api.locationKey(p),
        retrievedAt,
        data,
      });
      console.log(
        `::notice title=Free data live check::${kind} ${api.locationKey(p)}: verified real API response and cached with acquisition time.`,
      );
    } catch (e) {
      console.log(
        `::warning title=Free data live check::${kind} ${api.locationKey(p)}: ${e.message}; no replacement values created.`,
      );
    }
  }),
);
await mkdir("forecast-output", { recursive: true });
await writeFile("forecast-output/free-forecast.json", JSON.stringify(cache));
