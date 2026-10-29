// API fixtures are confined to tests; production only displays real provider responses.
const { chromium } = require("playwright");
const binary =
  process.platform === "linux" ? require("@sparticuz/chromium").default : null;
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { once } = require("node:events");
(async () => {
  const root = path.resolve(__dirname, "../www");
  let cacheResponse = { entries: [] };
  const server = http
    .createServer((req, res) => {
      const name =
          new URL(req.url, "http://localhost").pathname.slice(1) ||
          "index.html",
        file = path.resolve(root, name);
      if (name === "data/free-forecast.json") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(cacheResponse));
        return;
      }
      if (
        !file.startsWith(root + path.sep) ||
        !fs.existsSync(file) ||
        !fs.statSync(file).isFile()
      ) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".png")
              ? "image/png"
              : "text/html",
      );
      res.end(fs.readFileSync(file));
    })
    .listen(0, "127.0.0.1");
  await once(server, "listening");
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: binary ? await binary.executablePath() : undefined,
      args: binary ? binary.args : [],
      headless: true,
    });
    const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let weatherFailed = false,
      marineFailed = false;
    const json = (r, d, status = 200) =>
      r.fulfill({
        status,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(d),
      });
    const today = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }),
    );
    const dayKeys = Array.from({ length: 15 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    const rawWeather = {
      latitude: 30.26,
      longitude: 120.14,
      daily: {
        time: dayKeys,
        temperature_2m_min: dayKeys.map((_, i) => 15 + i),
        temperature_2m_max: dayKeys.map((_, i) => 25 + i),
        precipitation_probability_max: dayKeys.map(() => 20),
      },
      current: {
        time: dayKeys[0] + "T12:00",
        temperature_2m: 20,
        wind_speed_10m: 10,
        pressure_msl: 1010,
      },
    };
    await page.route("https://api.open-meteo.com/**", (r) =>
      weatherFailed
        ? json(r, { error: true, reason: "fixture unavailable" }, 503)
        : json(r, rawWeather),
    );
    await page.route("https://marine-api.open-meteo.com/**", (r) =>
      marineFailed
        ? json(r, { error: true, reason: "fixture unavailable" }, 503)
        : json(r, {
            latitude: 29.875,
            longitude: 122.375,
            hourly: {
              time: [
                dayKeys[0] + "T00:00",
                dayKeys[0] + "T01:00",
                dayKeys[0] + "T02:00",
              ],
              sea_level_height_msl: [-0.5, null, 0.7],
            },
          }),
    );
    await page.goto("http://127.0.0.1:" + server.address().port);
    await page.waitForFunction(() => weatherState === "ready");
    assert.equal(await page.locator("#dates .day").count(), 15);
    assert.match(await page.locator("#placename").innerText(), /杭州/);
    await page.evaluate(() => switchPage("weather"));
    assert.match(
      await page.locator("#weather .trendrow").first().innerText(),
      /15° \/ 25°/,
    );
    assert.equal(await page.locator("#weatherConfigForm").count(), 0);
    await page.evaluate(() => switchPage("fish"));
    assert.equal(await page.locator("#fishLibrary article").count(), 12);
    assert.equal(await page.locator("#fishLibrary .fish3d[role=img]").count(), 12);
    assert.equal(await page.locator("#catchForm").count(), 0);
    assert.ok(!(await page.locator("#fish").innerText()).includes("我的鱼获"));
    const labels = await page
      .locator("#fishLibrary article")
      .evaluateAll((rows) =>
        rows.every((r) =>
          r
            .querySelector(".fish3d")
            .getAttribute("aria-label")
            .includes(r.querySelector("h2").textContent),
        ),
      );
    assert.ok(labels);
    await page.getByLabel("鱼种", {exact:true}).selectOption("culter");
    assert.equal(await page.locator("#fishLibrary article").count(), 1);
    assert.match(await page.locator("#fishLibrary").innerText(), /数据不足/);
    await page.getByLabel("手动水温（情景输入）", {exact:true}).fill("22");
    await page.getByLabel("鱼种", {exact:true}).selectOption("all");
    assert.equal(await page.locator("#fishLibrary article").count(), 12);
    await page.getByLabel("搜索鱼种或类群", {exact:true}).fill("石斑");
    assert.equal(await page.locator("#fishLibrary article").count(), 4);
    await page.getByLabel("搜索鱼种或类群", {exact:true}).fill("");
    await page.route("https://geocoding-api.open-meteo.com/**", r => json(r, {results: new URL(r.request().url()).searchParams.get('countryCode')==='CN' ? [
      {name:'同名测试',admin1:'浙江省',country_code:'CN',latitude:30.2,longitude:120.1,population:100},
      {name:'同名测试',admin1:'四川省',country_code:'CN',latitude:30.1,longitude:102.1}
    ]:[]}));
    await page.evaluate(() => openLocations());
    await page.getByLabel('城市、区县或乡镇', {exact:true}).fill('同名测试');
    await page.getByRole('button',{name:'搜索全国地点',exact:true}).click();
    await page.waitForSelector('#locations .locationoption');
    assert.equal(await page.locator('#locations .locationoption').count(),2);
    await page.locator('#locations .locationoption').last().click();
    await page.waitForFunction(() => weatherState==='ready');
    assert.equal(await page.evaluate(() => weatherLocation().lng),102.1);
    assert.equal(await page.getByLabel('手动水温（情景输入）',{exact:true}).inputValue(),'');
    await page.evaluate(() => openLocations());
    await page.getByLabel('城市、区县或乡镇', {exact:true}).fill('同名测试');
    await page.getByLabel('省级地区',{exact:true}).selectOption('浙江');
    await page.getByRole('button',{name:'搜索全国地点',exact:true}).click();
    await page.waitForFunction(() => document.getElementById('nationalStatus').textContent.includes('找到 1'));
    await page.locator('#locations .locationoption').click();
    await page.waitForFunction(() => weatherState==='ready');
    assert.equal(await page.evaluate(() => weatherLocation().lng),120.1);
    await page.reload();
    await page.waitForFunction(() => weatherState==='ready');
    assert.equal(await page.evaluate(() => weatherLocation().lng),120.1);
    await page.evaluate(() => {localStorage.removeItem('lc-national-recent');chooseLocation(locs.findIndex(l=>l[0]==='杭州'));switchPage('fish');});
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: "/tmp/lurecast-fish-library.png",
      fullPage: false,
    });
    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const r = indexedDB.open("lurecast-journal", 1);
          r.onupgradeneeded = () =>
            r.result.createObjectStore("catches", { keyPath: "id" });
          r.onsuccess = () => {
            const db = r.result,
              tx = db.transaction("catches", "readwrite");
            tx.objectStore("catches").put({
              id: "old-personal-record",
              species: "existing",
            });
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
          };
          r.onerror = () => reject(r.error);
        }),
    );
    await page.reload();
    assert.equal(
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            const r = indexedDB.open("lurecast-journal");
            r.onsuccess = () => {
              const db = r.result,
                q = db
                  .transaction("catches")
                  .objectStore("catches")
                  .get("old-personal-record");
              q.onsuccess = () => {
                resolve(q.result?.id);
                db.close();
              };
            };
          }),
      ),
      "old-personal-record",
    );
    const png = Buffer.from(
      await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = c.height = 4;
        return c.toDataURL("image/png").split(",")[1];
      }),
      "base64",
    );
    await page.route("https://tile.openstreetmap.org/**", (r) =>
      r.fulfill({ contentType: "image/png", body: png }),
    );
    await page.route("https://a.tile.opentopomap.org/**", (r) =>
      r.fulfill({ contentType: "image/png", body: png }),
    );
    await page.route("https://nominatim.openstreetmap.org/**", (r) =>
      json(r, [
        {
          name: "杭州西湖",
          display_name: "杭州西湖，浙江",
          lat: "30.24",
          lon: "120.14",
          type: "water",
          class: "natural",
        },
      ]),
    );
    await page.route("https://overpass-api.de/**", (r) =>
      json(r, { error: "primary unavailable" }, 503),
    );
    await page.route("https://overpass.private.coffee/**", (r) =>
      json(r, {
        elements: [
          {
            tags: { name: "钱塘江", waterway: "river" },
            center: { lat: 30.22, lon: 120.2 },
          },
        ],
      }),
    );
    await page.evaluate(() => switchPage("spots"));
    await page.getByRole("button", { name: "打开地图", exact: true }).click();
    await page.waitForSelector(".leaflet-tile");
    await page.getByRole("button", { name: "免费地形图", exact: true }).click();
    assert.equal(await page.evaluate(() => waterBaseKind), "topo");
    await page.locator("#waterQuery").fill("杭州西湖");
    await page.locator("#waterSearchForm button").click();
    await page.waitForSelector(".waterresult");
    await page.getByRole("button", { name: "收集此水域", exact: true }).click();
    assert.equal(await page.evaluate(() => userPoints.length), 1);
    await page.locator("#waterMap").click({ position: { x: 150, y: 150 } });
    await page.locator("#pointForm [name=name]").fill("杭州新钓点");
    await page.locator("#pointForm button").click();
    assert.equal(await page.evaluate(() => userPoints.length), 2);
    await page.waitForTimeout(1150);
    await page
      .getByRole("button", { name: "查找当前区域河湖", exact: true })
      .click();
    await page.waitForFunction(() =>
      document.getElementById("waterResults").textContent.includes("钱塘江"),
    );
    await page.getByRole("button", { name: "收集此水域", exact: true }).click();
    assert.equal(await page.evaluate(() => userPoints.length), 3);
    await page.evaluate(() => {
      chooseLocation(0);
      switchPage("home");
    });
    await page.waitForFunction(() => marineState === "ready");
    await page.getByLabel("潮汐站点", {exact:true}).selectOption("QUB");
    await page.waitForFunction(() => tideStationState === "ready");
    assert.match(await page.locator("#tidecontent").innerText(), /香港海图基准面/);
    assert.ok(await page.locator("#tidecontent svg path").getAttribute("d"));
    assert.ok((await page.locator("#tidecontent .event").count()) >= 2);
    weatherFailed = true;
    marineFailed = true;
    await page.evaluate(() => loadForecast(true));
    assert.equal(await page.evaluate(() => freeWeather), null);
    assert.equal(await page.evaluate(() => freeMarine), null);
    await page.evaluate(() => switchPage("weather"));
    assert.match(await page.locator("#weather").innerText(), /不可用/);
    cacheResponse = {
      entries: [
        {
          kind: "weather",
          locationKey: "29.9100,122.3800",
          retrievedAt: new Date().toISOString(),
          data: { ...rawWeather, latitude: 29.91, longitude: 122.38 },
        },
      ],
    };
    await page.evaluate(() => loadForecast(true));
    assert.equal(await page.evaluate(() => freeWeather.cached), true);
    assert.match(await page.locator("#weather").innerText(), /最近发布缓存/);
    cacheResponse.entries[0].retrievedAt = new Date(
      Date.now() - 4 * 3600000,
    ).toISOString();
    await page.evaluate(() => loadForecast(true));
    assert.equal(await page.evaluate(() => freeWeather), null);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 15-day free weather rendering, realistic fish cards, removed catch UI with old records preserved, both free maps, river discovery failover and saved points, official bundled station tides, provider failures never replaced by fake data. Fixtures are test-only.",
    );
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
