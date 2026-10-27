// One small read-only request per provider, no bulk downloads or tile prefetching.
const headers = {
  "User-Agent": "LureCast/0.2 (+https://github.com/dengboer80-cmd/lurecast)",
  Accept: "application/json",
};
let failed = false;
const checks = [
  [
    "Nominatim",
    "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({ q: "杭州西湖", format: "jsonv2", limit: "1" }),
    (d) => Array.isArray(d) && d.length > 0,
  ],
  [
    "Overpass",
    "https://overpass-api.de/api/interpreter?" +
      new URLSearchParams({
        data: '[out:json][timeout:10];nwr["natural"="water"](30.23,120.13,30.26,120.16);out body center 2;',
      }),
    (d) => Array.isArray(d.elements),
  ],
];
for (const [name, url, valid] of checks) {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(25000) });
    if (!r.ok) throw Error("HTTP " + r.status);
    const d = await r.json();
    if (!valid(d)) throw Error("No usable Hangzhou response");
    console.log(
      `::notice title=Map live service check::${name}: real Hangzhou query returned HTTP ${r.status} and usable data.`,
    );
  } catch (e) {
    failed = true;
    console.log(
      `::warning title=Map live service check::${name}: unavailable (${e.message}); the app shows explicit errors, not sample map results.`,
    );
  }
}
if (failed) process.exitCode = 1;
