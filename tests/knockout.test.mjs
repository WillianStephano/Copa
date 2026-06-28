import test from "node:test";
import assert from "node:assert/strict";
import { buildKnockoutSkeleton, mergeKnockoutMatches, roundOf32Matches } from "../js/knockout.js";
import { renderKnockout, renderKnockoutFilter } from "../js/render.js";
import { allMatches } from "../js/storage.js";

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
  assert.equal(matches.at(-1).id, "KO-FINAL-1");
});

test("ids do mata-mata nao colidem com jogos da fase de grupos", () => {
  const groupIds = new Set(allMatches().map(({ groupId, index }) => `${groupId}-${index}`));
  const knockoutIds = buildKnockoutSkeleton().map((match) => match.id);

  assert.equal(knockoutIds.some((id) => groupIds.has(id)), false);
  assert.equal(knockoutIds.includes("F-1"), false);
  assert.equal(knockoutIds.includes("KO-F-1"), false);
});

test("16 avos do mata-mata ficam completos com datas para palpite", () => {
  assert.equal(roundOf32Matches.length, 16);
  assert.equal(roundOf32Matches[0].id, "KO-R32-1");
  assert.equal(roundOf32Matches[0].home, "África do Sul");
  assert.equal(roundOf32Matches[0].away, "Canadá");
  assert.equal(roundOf32Matches[0].kickoffDate.toISOString(), "2026-06-28T19:00:00.000Z");
  assert.equal(roundOf32Matches[0].lockAt.toISOString(), "2026-06-28T18:30:00.000Z");
  assert.equal(roundOf32Matches.at(-1).home, "Colômbia");
  assert.equal(roundOf32Matches.at(-1).away, "Gana");
});

test("mata-mata mescla jogo oficial sem perder fase e placeholders", () => {
  const matches = mergeKnockoutMatches({
    "KO-R32-1": {
      id: "KO-R32-1",
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
  assert.equal(matches[1].home, "Brasil");
  assert.equal(matches[1].away, "Japão");
});

test("renderKnockout mostra aba com seletor de classificado e regra exclusiva", () => {
  installLocalStorage();
  const view = renderKnockout({
    query: "",
    predictions: {},
    matchPredictionSummaries: {},
    officialMatches: {
      "KO-R32-1": {
        id: "KO-R32-1",
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
  assert.match(view.html, /data-confirm-knockout-prediction="KO-R32-1"/);
  assert.match(view.html, /Se empatar, quem passa\?/);
});

test("final do mata-mata nao herda palpite nem resumo do jogo F-1 do grupo", () => {
  installLocalStorage();
  const view = renderKnockout({
    query: "Final",
    predictions: {
      "F-1": {
        matchId: "F-1",
        groupId: "F",
        matchIndex: 1,
        homeScore: 2,
        awayScore: 2
      }
    },
    matchPredictionSummaries: {
      "F-1": {
        matchId: "F-1",
        totalPredictions: 3,
        predictions: [
          { uid: "will", displayName: "Willian", homeScore: 2, awayScore: 2, choice: "draw", type: "miss", points: 0 }
        ]
      }
    },
    officialMatches: {}
  });

  assert.match(view.html, /KO-FINAL-1/);
  assert.doesNotMatch(view.html, /KO-F-1/);
  assert.match(view.html, /<span class="match-date">Final<\/span>/);
  assert.doesNotMatch(view.html, /<span class="match-date">F-1<\/span>/);
  assert.doesNotMatch(view.html, /<span class="match-date">KO-F-1<\/span>/);
  assert.doesNotMatch(view.html, /Palpite confirmado/);
  assert.doesNotMatch(view.html, /3 participantes com palpite liberado/);
  assert.doesNotMatch(view.html, /2 x 2/);
});

test("filtro do mata-mata mostra jogos de hoje e copiar palpites", () => {
  const html = renderKnockoutFilter({
    knockoutTodayOnly: true,
    now: new Date("2026-06-29T15:00:00.000Z"),
    officialMatches: {
      "KO-R32-1": {
        id: "KO-R32-1",
        phase: "knockout",
        kickoffDate: new Date("2026-06-29T18:00:00.000Z")
      },
      "A-0": {
        id: "A-0",
        phase: "group",
        kickoffDate: new Date("2026-06-29T18:00:00.000Z")
      }
    }
  });

  assert.match(html, /data-knockout-today-filter/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /data-share-knockout-today/);
  assert.match(html, /4 jogos do mata-mata hoje/);
});

test("filtro do mata-mata usa confrontos estaticos quando Firestore ainda nao tem jogos", () => {
  const html = renderKnockoutFilter({
    knockoutTodayOnly: true,
    now: new Date("2026-06-28T15:00:00.000Z"),
    officialMatches: {}
  });

  assert.match(html, /1 jogo do mata-mata hoje/);
  assert.doesNotMatch(html, /data-share-knockout-today type="button" disabled/);
});

test("renderKnockout filtra somente jogos do mata-mata de hoje", () => {
  installLocalStorage();
  const view = renderKnockout({
    query: "",
    knockoutTodayOnly: true,
    now: new Date("2026-06-29T15:00:00.000Z"),
    predictions: {},
    matchPredictionSummaries: {},
    officialMatches: {
      "KO-R32-1": {
        id: "KO-R32-1",
        phase: "knockout",
        stage: "round-of-32",
        home: "Brasil",
        away: "Japão",
        status: "SCHEDULED",
        kickoffDate: new Date("2026-06-29T18:00:00.000Z")
      },
      "KO-R32-2": {
        id: "KO-R32-2",
        phase: "knockout",
        stage: "round-of-32",
        home: "Argentina",
        away: "França",
        status: "SCHEDULED",
        kickoffDate: new Date("2026-06-30T18:00:00.000Z")
      }
    }
  });

  assert.equal(view.empty, false);
  assert.match(view.meta, /3 jogos do mata-mata hoje/);
  assert.match(view.html, /Brasil/);
  assert.doesNotMatch(view.html, /Argentina/);
});
