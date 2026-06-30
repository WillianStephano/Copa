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

test("comparacao do ranking fica recolhivel e compacta no mobile", () => {
  const css = readFileSync("css/app.css", "utf8");

  assert.match(css, /\.ranking-compare-toggle\s*\{/);
  assert.match(css, /\.ranking-compare-summary\s*\{[\s\S]*cursor: pointer;/);
  assert.match(css, /\.ranking-compare-summary::-webkit-details-marker\s*\{\s*display: none;/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.ranking-compare-summary\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.ranking-compare-list\s*\{[\s\S]*max-height: 260px;/);
});

test("ranking desktop evita duas tabelas espremidas lado a lado", () => {
  const css = readFileSync("css/app.css", "utf8");

  assert.match(css, /\.ranking-grid\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\);/);
  assert.doesNotMatch(css, /\.ranking-grid\s*\{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
});

test("detalhes do ranking do mata-mata nao usam vermelho para acertos", () => {
  const css = readFileSync("css/app.css", "utf8");

  assert.match(css, /\.ranking-detail\.result-knockout-exact-qualified\s*\{[\s\S]*border-left-color: var\(--gold-500\);/);
  assert.match(css, /\.ranking-detail\.result-knockout-qualified,\s*[\r\n\s]*\.ranking-detail\.result-knockout-draw-only\s*\{[\s\S]*border-left-color: var\(--green-700\);/);
  assert.match(css, /\.result-knockout-exact-qualified \.ranking-detail-status\s*\{[\s\S]*background: rgba\(245, 197, 66, 0\.5\);/);
  assert.match(css, /\.result-knockout-qualified \.ranking-detail-status,\s*[\r\n\s]*\.result-knockout-draw-only \.ranking-detail-status\s*\{[\s\S]*background: var\(--mint-200\);/);
});
