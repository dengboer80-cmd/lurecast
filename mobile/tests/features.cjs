// All network responses below are explicit test fixtures, never production forecasts or map data.
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
  const server = http
    .createServer((req, res) => {
      const name =
          new URL(req.url, "http://localhost").pathname.slice(1) ||
          "index.html",
        file = path.resolve(root, name);
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
    await page.goto("http://127.0.0.1:" + server.address().port);
    assert.equal(await page.locator("#dates .day").count(), 10);
    assert.equal(await page.locator("#placename").innerText(), "杭州");
    await page.evaluate(() => switchPage("fish"));
    assert.ok((await page.locator("#fishLibrary article").count()) >= 90);
    assert.equal(await page.locator("#fish svg[role=img]").count(), 2);
    await page.locator("#fishSearch").fill("翘嘴");
    assert.equal(await page.locator("#fishLibrary article").count(), 1);
    await page.locator("#fishCustomForm [name=species]").fill("<测试鱼种>");
    await page.locator("#fishCustomForm button").click();
    await page.locator("#catchSpecies").fill("翘嘴鲌");
    await page.locator("#catchWeight").fill("2.375");
    await page.locator("#catchForm [name=notes]").fill("<鱼获记录>");
    const png = Buffer.from(
      await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = 4;
        c.height = 4;
        c.getContext("2d").fillRect(0, 0, 4, 4);
        return c.toDataURL("image/png").split(",")[1];
      }),
      "base64",
    );
    await page
      .locator("#catchForm [name=photos]")
      .setInputFiles({ name: "catch.png", mimeType: "image/png", buffer: png });
    await page.locator("#catchSave").click();
    await page.waitForSelector(".catchentry");
    assert.match(await page.locator(".catchentry").innerText(), /2\.375 kg/);
    assert.equal(await page.locator(".catchentry img").count(), 1);
    await page.reload();
    await page.evaluate(() => switchPage("fish"));
    await page.waitForSelector(".catchentry");
    assert.equal(await page.locator(".catchentry img").count(), 1);
    assert.ok(
      await page.evaluate(async () => {
        const r = await catchRecords();
        return r[0].photos[0] instanceof Blob && r[0].photos[0].size > 0;
      }),
    );
    await page.locator(".catchentry .pill").click();
    await page.waitForFunction(
      () =>
        document.getElementById("catchFormTitle").textContent === "编辑鱼获",
    );
    await page.locator("#catchWeight").fill("3.125");
    await page.locator("#catchSave").click();
    await page.waitForFunction(() =>
      document.querySelector(".catchentry")?.textContent.includes("3.125 kg"),
    );
    assert.equal(await page.locator(".catchentry img").count(), 1);
    await page.locator(".catchentry .pill").click();
    await page.waitForFunction(
      () =>
        document.getElementById("catchFormTitle").textContent === "编辑鱼获",
    );
    await page.locator("#catchWeight").fill("4");
    await page.evaluate(() => {
      window.originalCatchPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function () {
        throw new DOMException("quota", "QuotaExceededError");
      };
    });
    await page.locator("#catchSave").click();
    await page.waitForFunction(() =>
      document.getElementById("catchError").textContent.includes("保存失败"),
    );
    await page.evaluate(() => {
      IDBObjectStore.prototype.put = window.originalCatchPut;
    });
    assert.equal(
      await page.evaluate(async () => (await catchRecords())[0].weightKg),
      3.125,
    );
    console.log("PASS: journal photo persistence, editing and quota failure");
    await page.screenshot({path:'/tmp/lurecast-fish-new.png',fullPage:true});
    let mapFailure = false;
    const json = (route, data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(data),
      });
    await page.route("https://tile.openstreetmap.org/**", (route) =>
      route.fulfill({ contentType: "image/png", body: png }),
    );
    await page.route("https://nominatim.openstreetmap.org/**", (route) =>
      mapFailure
        ? json(route, { error: "test failure" }, 503)
        : json(route, [
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
    await page.route("https://overpass-api.de/**", (route) =>
      json(route, {
        elements: [
          {
            type: "way",
            id: 1,
            tags: { name: "钱塘江", waterway: "river" },
            center: { lat: 30.22, lon: 120.2 },
          },
        ],
      }),
    );
    await page.evaluate(() => switchPage("spots"));
    await page.getByRole("button", { name: "打开地图", exact: true }).click();
    await page.waitForSelector(".leaflet-tile");
    await page.locator("#waterQuery").fill("杭州西湖");
    await page.locator("#waterSearchForm button").click();
    await page.waitForSelector(".waterresult");
    assert.match(await page.locator("#waterResults").innerText(), /杭州西湖/);
    await page.getByRole("button", { name: "收集此水域", exact: true }).click();
    assert.equal(await page.evaluate(() => userPoints.length), 1);
    assert.equal(await page.evaluate(() => userPoints[0].waterCenter), true);
    await page.locator("#waterMap").click({ position: { x: 150, y: 150 } });
    assert.ok(await page.locator("#pointForm [name=lat]").inputValue());
    await page.locator("#pointForm [name=name]").fill("杭州岸边实记点");
    await page.locator("#pointForm [name=type]").selectOption("river");
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
    await page.waitForTimeout(1150);
    mapFailure = true;
    await page.locator("#waterQuery").fill("错误测试");
    await page.locator("#waterSearchForm button").click();
    await page.waitForFunction(() =>
      document.getElementById("waterStatus").textContent.includes("搜索不可用"),
    );
    assert.equal(await page.evaluate(() => userPoints.length), 3);
    await page.screenshot({path:'/tmp/lurecast-map-new.png',fullPage:true});
    let weatherFailure = false;
    const days = await page.evaluate(() =>
      dates.map((d, i) => ({
        date: dateKey(d),
        temperatureMin: 15 + i,
        temperatureMax: 25 + i,
        precipitationChance: 0.2,
      })),
    );
    await page.route("https://weather.example.test/**", (route) =>
      weatherFailure
        ? json(route, { message: "测试服务不可用" }, 503)
        : json(route, {
            provider: "Apple WeatherKit",
            retrievedAt: new Date().toISOString(),
            days,
            current: { pressure: 1010, windSpeed: 10 },
            attribution: {
              legalPageURL:
                "https://weatherkit.apple.com/legal-attribution.html",
              combinedMarkDarkURL: "https://weatherkit.apple.com/test-logo.svg",
            },
          }),
    );
    await page.route("https://weatherkit.apple.com/test-logo.svg", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg"/>',
      }),
    );
    await page.evaluate(() => switchPage("weather"));
    assert.match(await page.locator("#weather").innerText(), /未配置/);
    await page.locator("#weather details summary").click();
    await page
      .locator("#weatherConfigForm [name=endpoint]")
      .fill("https://weather.example.test/api/weather");
    await page.locator("#weatherConfigForm button").click();
    await page.waitForFunction(() => appleWeatherState === "ready");
    assert.equal(await page.locator("#weather .trendrow").count(), 10);
    assert.match(
      await page.locator("#weather .trendrow").first().innerText(),
      /15° \/ 25°/,
    );
    weatherFailure = true;
    await page.evaluate(() => loadForecast());
    assert.equal(await page.evaluate(() => appleWeather), null);
    assert.match(
      await page.locator("#weather .trendrow").first().innerText(),
      /不可用/,
    );
    await page.evaluate(() => localStorage.removeItem("lc-weather-api"));
    await page.reload();
    await page.evaluate(() => switchPage("fish"));
    await page.waitForSelector(".catchentry");
    assert.equal(await page.locator(".catchentry img").count(), 1);
    page.once("dialog", (d) => d.accept());
    await page.locator(".catchentry .textbtn").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".catchentry").length === 0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: Hangzhou default; 10 days; 90+ species and custom species; kg catch with real image encoding, IndexedDB photo persistence/edit/delete/quota handling; map search, river discovery, water collection and manual points; weather response rendering and explicit failure. Network fixtures are test-only.",
    );
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
