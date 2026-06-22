import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("manifest deixa o app instalavel como PWA", () => {
  const manifest = JSON.parse(readFileSync("manifest.webmanifest", "utf8"));

  assert.equal(manifest.name, "Bolão Copa 2026");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./?source=pwa");
  assert.equal(manifest.theme_color, "#075744");
  assert.equal(manifest.icons[0].purpose, "any maskable");
});

test("index declara manifest, icone e menu mobile", () => {
  const html = readFileSync("index.html", "utf8");

  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /rel="icon" href="\.\/assets\/icons\/icon\.svg"/);
  assert.match(html, /id="installAppBtn"/);
  assert.match(html, /id="mobileNavToggle"/);
  assert.match(html, /id="mainTabs"/);
});

test("service worker guarda o shell principal em cache", () => {
  const serviceWorker = readFileSync("sw.js", "utf8");

  assert.match(serviceWorker, /CACHE_NAME = "copa2026-bolao-v2"/);
  assert.match(serviceWorker, /\.\/index\.html/);
  assert.match(serviceWorker, /\.\/css\/app\.css/);
  assert.match(serviceWorker, /\.\/js\/main\.js/);
});

test("main registra service worker e controla instalacao", () => {
  const main = readFileSync("js/main.js", "utf8");

  assert.match(main, /beforeinstallprompt/);
  assert.match(main, /navigator\.serviceWorker\.register\("\.\/sw\.js"\)/);
  assert.match(main, /mobile-open/);
});
