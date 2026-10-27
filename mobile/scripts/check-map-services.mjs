// Small read-only diagnostics. No bulk downloads or tile prefetching.
const headers = {
  "User-Agent": "LureCast/0.2 (+https://github.com/dengboer80-cmd/lurecast)",
  Accept: "application/json",
};
const params = new URLSearchParams({
  data: '[out:json][timeout:10];nwr["natural"="water"](30.23,120.13,30.26,120.16);out body center 2;',
});
const checks = [
  [
    "Nominatim",
    [
      "https://nominatim.openstreetmap.org/search?" +
        new URLSearchParams({ q: "杭州西湖", format: "jsonv2", limit: "1" }),
    ],
    (d) => Array.isArray(d) && d.length > 0,
  ],
  [
    "Overpass",
    [
      "https://overpass-api.de/api/interpreter?" + params,
      "https://overpass.private.coffee/api/interpreter?" + params,
    ],
    (d) => Array.isArray(d.elements) && d.elements.length > 0,
  ],
];
let failed = false;
for (const [name, urls, valid] of checks) {
  let success = false,
    lastError;
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw Error("HTTP " + r.status);
      const d = await r.json();
      if (!valid(d)) throw Error("No usable Hangzhou response");
      console.log(
        `::notice title=Map live service check::${name}: real Hangzhou query returned HTTP ${r.status} and usable data via ${new URL(url).hostname}.`,
      );
      success = true;
      break;
    } catch (e) {
      lastError = e;
    }
  }
  if (!success) {
    failed = true;
    console.log(
      `::warning title=Map live service check::${name}: unavailable (${lastError.message}); the app shows explicit errors, not sample map results.`,
    );
  }
}
if (failed) process.exitCode = 1;
