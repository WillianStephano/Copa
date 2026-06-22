import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("ranking mobile usa layout de card sem largura minima fixa", () => {
  const css = readFileSync("css/app.css", "utf8");

  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.ranking-header\s*\{\s*display: none;/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.ranking-card\s*\{\s*overflow: visible;/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.ranking-row\s*\{[\s\S]*min-width: 0;/);
});

test("menu mobile fecha ao tocar fora", () => {
  const main = readFileSync("js/main.js", "utf8");

  assert.match(main, /document\.addEventListener\("click"/);
  assert.match(main, /target\.closest\("#mainTabs"\)/);
  assert.match(main, /target\.closest\("#mobileNavToggle"\)/);
  assert.match(main, /classList\.remove\("mobile-open"\)/);
});
