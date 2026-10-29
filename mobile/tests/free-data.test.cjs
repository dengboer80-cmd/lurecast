const { test } = require("node:test"),
  assert = require("node:assert/strict");
const api = require("../scripts/free-data.js");
test("free endpoints request fifteen days, explicit units and no API key", () => {
  const u = new URL(api.weatherURL({ lat: 30.2741, lng: 120.1551 }));
  assert.equal(u.hostname, "api.open-meteo.com");
  assert.equal(u.searchParams.get("forecast_days"), "15");
  assert.equal(u.searchParams.get("temperature_unit"), "celsius");
  assert.equal(u.searchParams.get("apikey"), null);
  assert.equal(
    new URL(api.marineURL({ lat: 29.91, lng: 122.38 })).searchParams.get(
      "hourly",
    ),
    "sea_level_height_msl,sea_surface_temperature",
  );
});
test("missing daily values remain missing, zero remains a real zero, no dates invented", () => {
  const d = api.normalizeWeather({
    daily: {
      time: ["2026-10-27", "2026-10-28"],
      temperature_2m_min: [0, null],
      temperature_2m_max: [10, null],
      precipitation_probability_max: [0, null],
    },
  });
  assert.equal(d.days.length, 2);
  assert.equal(d.days[0].temperatureMin, 0);
  assert.equal(d.days[0].precipitationChance, 0);
  assert.equal(d.days[1].temperatureMax, null);
  assert.equal(d.days[1].precipitationChance, null);
});
test("Hangzhou all-null marine grid is unavailable; marine values never interpolated", () => {
  const p = { lat: 30.2741, lng: 120.1551 };
  assert.throws(
    () =>
      api.normalizeMarine(
        {
          latitude: p.lat,
          longitude: p.lng,
          hourly: { time: ["2026-10-27T00:00"], sea_level_height_msl: [null] },
        },
        p,
      ),
    /没有有效/,
  );
  const z = { lat: 29.91, lng: 122.38 };
  const d = api.normalizeMarine(
    {
      latitude: 29.875,
      longitude: 122.375,
      hourly: {
        time: ["2026-10-27T00:00", "2026-10-27T01:00", "2026-10-27T02:00"],
        sea_level_height_msl: [-0.5, null, 0.7],
      },
    },
    z,
  );
  assert.equal(d.hours[0].value, -0.5);
  assert.equal(d.hours[1].value, null);
  assert.equal(d.hours.length, 3);
  assert.ok(d.distance < 5);
});
test("far-away model grids and malformed responses cannot masquerade as local forecasts", () => {
  assert.throws(
    () =>
      api.normalizeMarine(
        {
          latitude: 0,
          longitude: 0,
          hourly: { time: ["2026-10-27T00:00"], sea_level_height_msl: [1] },
        },
        { lat: 30, lng: 120 },
      ),
    /不能作为此处潮位/,
  );
  assert.throws(
    () => api.normalizeWeather({ error: true, reason: "provider denied" }),
    /provider denied/,
  );
  assert.throws(
    () =>
      api.normalizeWeather({
        daily: {
          time: ["2026-10-27"],
          temperature_2m_max: [null],
          temperature_2m_min: [null],
        },
      }),
    /没有有效/,
  );
});
