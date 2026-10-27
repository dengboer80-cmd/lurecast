const { chromium } = require("playwright");
const binary =
  process.platform === "linux" ? require("@sparticuz/chromium").default : null;
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
(async () => {
  const server = http
    .createServer((q, r) => {
      const name = q.url === "/" ? "index.html" : q.url.slice(1);
      const target = require("node:path").resolve(__dirname, "../www", name);
      if (
        !target.startsWith(
          require("node:path").resolve(__dirname, "../www") +
            require("node:path").sep,
        ) ||
        !fs.existsSync(target) ||
        !fs.statSync(target).isFile()
      ) {
        r.writeHead(404).end();
        return;
      }
      r.setHeader(
        "Content-Type",
        name.endsWith(".js")
          ? "text/javascript"
          : name.endsWith(".css")
            ? "text/css"
            : name.endsWith(".png")
              ? "image/png"
              : "text/html",
      );
      r.end(
        fs.readFileSync(require("node:path").join(__dirname, "../www", name)),
      );
    })
    .listen(8173, "127.0.0.1");
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
      errors = [],
      external = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (!r.url().startsWith("http://127.0.0.1")) external.push(r.url());
    });
    await page.goto("http://127.0.0.1:8173");
    await page.waitForSelector("#dates .day");
    assert.equal(await page.locator("#dates .day").count(), 10);
    assert.match(await page.locator("#tidecontent").innerText(), /不可用/);
    await page.evaluate(() => switchPage("fish"));
    assert.equal(await page.locator("#fish svg[role=img]").count(), 2);
    await page.evaluate(() => switchPage("spots"));
    await page.locator("#spots .star").first().click();
    await page.locator("[name=name]").fill("<钓点测试>");
    await page.locator("[name=lat]").fill("29.91");
    await page.locator("[name=lng]").fill("122.38");
    await page.locator("#pointForm button").click();
    assert.match(await page.locator("#spots").innerText(), /<钓点测试>/);
    await page.evaluate(() => {
      switchPage("home");
      selectDay(2);
      addPlan();
      addPlan();
      switchPage("profile");
    });
    assert.equal(await page.locator("#profile form").count(), 1);
    await page.locator("[name=time]").fill("06:30");
    await page.locator("[name=note]").fill("带救生衣 <安全>");
    await page.locator("#profile form .pill").click();
    await page.reload();
    await page.evaluate(() => switchPage("profile"));
    assert.equal(await page.locator("[name=time]").inputValue(), "06:30");
    assert.equal(
      await page.locator("[name=note]").inputValue(),
      "带救生衣 <安全>",
    );
    assert.match(await page.locator("#profile").innerText(), /收藏区域 \(1\)/);
    await page.screenshot({
      path: "/tmp/lurecast-profile.png",
      fullPage: true,
    });
    await page.evaluate(() => switchPage("spots"));
    assert.match(await page.locator("#spots").innerText(), /<钓点测试>/);
    await page.locator('[aria-label="收藏本机钓点"]').click();
    await page.evaluate(() => {
      pointPlan(0);
      pointPlan(0);
      switchPage("profile");
    });
    assert.equal(await page.locator("#profile form").count(), 2);
    assert.match(await page.locator("#profile").innerText(), /<钓点测试>/);
    await page.evaluate(() => switchPage("weather"));
    assert.match(await page.locator("#weather").innerText(), /不可用/);
    await page.evaluate(() => switchPage("home"));
    await page.screenshot({ path: "/tmp/lurecast-home.png", fullPage: true });
    assert.equal(
      await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      ),
      "rgb(0, 0, 0)",
    );
    assert.equal(await page.locator("#weather .trendrow").count(), 10);
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      for (const target of ["home", "weather", "fish", "spots", "profile"]) {
        await page.evaluate((p) => switchPage(p), target);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${target} overflows ${viewport.width}px`,
        );
      }
    }
    const quotaResult = await page.evaluate(() => {
      const before = JSON.stringify(saved);
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      };
      try {
        selectDay(4);
        addPlan();
        return {
          unchanged: JSON.stringify(saved) === before,
          message: document.getElementById("toast").textContent,
        };
      } finally {
        Storage.prototype.setItem = original;
      }
    });
    assert.equal(quotaResult.unchanged, true);
    assert.match(quotaResult.message, /保存失败/);
    await page.evaluate(() =>
      localStorage.setItem("lc-points", "corrupt JSON"),
    );
    await page.reload();
    await page.evaluate(() => switchPage("spots"));
    assert.equal(await page.locator("#pointForm").count(), 1);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      "PASS: 10 dates, unavailable services, two fish illustrations, favorites, point creation and persistence, duplicate plan prevention, plan edit and reload, black theme, zero JS errors, zero external requests, custom-point favorite and plan, portrait/landscape layouts, storage failure and corrupt-data recovery",
    );
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
