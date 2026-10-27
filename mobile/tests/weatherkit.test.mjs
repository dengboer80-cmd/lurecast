import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { once } from "node:events";
import {
  makeWeatherServer,
  weatherToken,
  normalizeWeather,
} from "../server/weatherkit.mjs";
const pair = generateKeyPairSync("ec", { namedCurve: "P-256" });
const config = {
  teamId: "TESTTEAM",
  serviceId: "test.weather",
  keyId: "TESTKEY",
  privateKey: pair.privateKey.export({ type: "pkcs8", format: "pem" }),
  allowedOrigin: "https://example.test",
};
const attribution = {
  legalPageURL: "https://weatherkit.apple.com/legal-attribution.html",
  combinedMarkDarkURL: "https://weatherkit.apple.com/test-logo.svg",
};
// Explicit test fixtures; none are bundled or served by the production app.
const fixture = {
  forecastDaily: {
    days: [
      {
        forecastStart: "2026-10-26T16:00:00Z",
        temperatureMin: 12,
        temperatureMax: 20,
        precipitationChance: 0.2,
      },
    ],
  },
  currentWeather: { windSpeed: 10, pressure: 1010 },
};
async function withServer(cfg, options, run) {
  const server = makeWeatherServer(cfg, options).listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    await run("http://127.0.0.1:" + server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
test("WeatherKit JWT is correctly signed as ES256 and scoped to the service", () => {
  const token = weatherToken(config, 100000),
    parts = token.split(".");
  const header = JSON.parse(Buffer.from(parts[0], "base64url"));
  assert.equal(header.id, "TESTTEAM.test.weather");
  assert.equal(header.kid, "TESTKEY");
  assert.ok(
    verify(
      "sha256",
      Buffer.from(parts[0] + "." + parts[1]),
      { key: pair.publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(parts[2], "base64url"),
    ),
  );
  const payload = JSON.parse(Buffer.from(parts[1], "base64url"));
  assert.equal(payload.sub, config.serviceId);
  assert.ok(payload.exp - payload.iat <= 1805);
});
test("normalization uses China calendar dates and never pads missing dates", () => {
  const data = normalizeWeather(fixture, attribution);
  assert.equal(data.days.length, 1);
  assert.equal(data.days[0].date, "2026-10-27");
  assert.equal(data.days[0].precipitationChance, 0.2);
  assert.throws(() =>
    normalizeWeather(fixture, {
      ...attribution,
      combinedMarkDarkURL: "http://example.test/logo",
    }),
  );
});
test("unconfigured backend returns explicit 503; malformed coords and forbidden origins fail", async () =>
  withServer({ allowedOrigin: config.allowedOrigin }, {}, async (base) => {
    let r = await fetch(base + "/api/weather?lat=30&lng=120");
    assert.equal(r.status, 503);
    assert.equal((await r.json()).code, "weatherkit_not_configured");
    r = await fetch(base + "/api/weather?lat=1000&lng=120");
    assert.equal(r.status, 400);
    r = await fetch(base + "/api/weather?lat=30&lng=120", {
      headers: { Origin: "https://untrusted.test" },
    });
    assert.equal(r.status, 403);
  }));
test("upstream credentials remain server-side, results cached, no fake fallback on failures", async () => {
  let count = 0;
  await withServer(
    config,
    {
      fetchImpl: async (url, options) => {
        count++;
        assert.match(options.headers.Authorization, /^Bearer /);
        return {
          ok: true,
          json: async () =>
            url.includes("attribution") ? attribution : fixture,
        };
      },
    },
    async (base) => {
      for (let i = 0; i < 2; i++) {
        const r = await fetch(base + "/api/weather?lat=30&lng=120", {
          headers: { Origin: config.allowedOrigin },
        });
        assert.equal(r.status, 200);
        assert.equal(
          r.headers.get("Access-Control-Allow-Origin"),
          config.allowedOrigin,
        );
        const text = await r.text();
        assert.ok(!text.includes("PRIVATE KEY"));
        assert.equal(JSON.parse(text).provider, "Apple WeatherKit");
      }
      assert.equal(count, 2);
    },
  );
  await withServer(
    config,
    { fetchImpl: async () => ({ ok: false, status: 401 }) },
    async (base) => {
      const r = await fetch(base + "/api/weather?lat=30&lng=120");
      assert.equal(r.status, 502);
      const d = await r.json();
      assert.equal(d.days, undefined);
      assert.equal(d.code, "weatherkit_unavailable");
    },
  );
});
