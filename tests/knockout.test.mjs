import test from "node:test";
import assert from "node:assert/strict";
import { buildKnockoutSkeleton, mergeKnockoutMatches } from "../js/knockout.js";
import { renderKnockout } from "../js/render.js";

function installLocalStorage() {
  const store = new Map();
  global.localStorage = {
    getItem: (key) => store.get(key) || "",
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    key: (index) => Array.from(store.keys())[index],
    get length() {
      return store.size;
    }
  };
}

test("mata-mata cria esqueleto com 16 avos ate final", () => {
  const matches = buildKnockoutSkeleton();

  assert.equal(matches.length, 32);
  assert.equal(matches.filter((match) => match.stage === "round-of-32").length, 16);
  assert.equal(matches.at(-1).id, "F-1");
});

test("mata-mata mescla jogo oficial sem perder fase e placeholders", () => {
  const matches = mergeKnockoutMatches({
    "R32-1": {
      id: "R32-1",
      phase: "knockout",
      stage: "round-of-32",
      home: "Brasil",
      away: "Japão",
      status: "SCHEDULED",
      kickoffDate: new Date("2026-06-29T18:00:00.000Z")
    }
  });

  assert.equal(matches[0].home, "Brasil");
  assert.equal(matches[0].away, "Japão");
  assert.equal(matches[0].stageTitle, "16 avos de final");
  assert.equal(matches[1].home, "A definir");
});

test("renderKnockout mostra aba com seletor de classificado e regra exclusiva", () => {
  installLocalStorage();
  const view = renderKnockout({
    query: "",
    predictions: {},
    matchPredictionSummaries: {},
    officialMatches: {
      "R32-1": {
        id: "R32-1",
        phase: "knockout",
        stage: "round-of-32",
        home: "Brasil",
        away: "Japão",
        status: "SCHEDULED",
        kickoffDate: new Date("2026-06-29T18:00:00.000Z")
      }
    }
  });

  assert.equal(view.empty, false);
  assert.match(view.html, /16 avos de final/);
  assert.match(view.html, /Regra exclusiva do mata-mata/);
  assert.match(view.html, /data-confirm-knockout-prediction="R32-1"/);
  assert.match(view.html, /Se empatar, quem passa\?/);
});

