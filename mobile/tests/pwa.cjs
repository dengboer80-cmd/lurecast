const { chromium } = require("playwright");
const binary =
  process.platform === "linux" ? require("@sparticuz/chromium").default : null;
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { once } = require("node:events");
(async () => {
  const root = path.join(__dirname, "../pwa-dist");
  const server = http
    .createServer((req, res) => {
      const url = new URL(req.url, "http://localhost");
      if (!url.pathname.startsWith("/lurecast/")) {
        res.writeHead(404).end();
        return;
      }
      const file = url.pathname.slice("/lurecast/".length) || "index.html";
      const target = path.resolve(root, file);
      if (
        !target.startsWith(root + path.sep) ||
        !fs.existsSync(target) ||
        !fs.statSync(target).isFile()
      ) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".webmanifest")
            ? "application/manifest+json"
            : file.endsWith(".css")
              ? "text/css"
              : file.endsWith(".png")
                ? "image/png"
                : "text/html",
      );
      res.end(fs.readFileSync(path.join(root, file)));
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
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const errors = [],
      external = [];
    const base = `http://127.0.0.1:${server.address().port}/lurecast/`;
    page.on("pageerror", (e) => errors.push(e.message));
    context.on("request", (r) => {
      if (!r.url().startsWith(base)) external.push(r.url());
    });
    await page.goto(base);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    assert.equal(await page.locator("link[rel=apple-touch-icon]").count(), 1);
    const manifest = await (
      await page.request.get(base + "manifest.webmanifest")
    ).json();
    assert.equal(manifest.start_url, "./");
    assert.equal(manifest.scope, "./");
    assert.equal(manifest.display, "standalone");
    await page.evaluate(() => {
      addPlan();
      switchPage("profile");
    });
    assert.equal(await page.locator("#profile form").count(), 1);
    await page.locator("[name=note]").fill("离线测试计划");
    await page.locator("#profile form .pill").click();
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector("#dates .day");
    await page.evaluate(() => switchPage("profile"));
    assert.equal(
      await page.locator("[name=note]").inputValue(),
      "离线测试计划",
    );
    for (const target of ["home", "weather", "fish", "spots"])
      await page.evaluate((p) => switchPage(p), target);
    await page.evaluate(() => switchPage("fish"));
    assert.equal(await page.locator("#fish svg[role=img]").count(), 2);
    await page.evaluate(() => switchPage("home"));
    assert.match(await page.locator("#tidecontent").innerText(), /不可用/);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      "PASS: subpath deployment, install metadata, service-worker control, offline reload, offline plan persistence, navigation, fish artwork, unavailable forecasts, zero external requests. Safari installation remains UNRUN.",
    );
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
