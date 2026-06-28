import test from "node:test";
import assert from "node:assert/strict";
import { buildTodayPredictionsMessage } from "../js/share-predictions.js";

test("monta mensagem com palpites confirmados de hoje em ordem de horário", () => {
  const result = buildTodayPredictionsMessage({
    displayName: "Willian",
    now: new Date("2026-06-14T15:00:00.000Z"),
    officialMatches: {
      "F-0": {
        id: "F-0",
        home: "Holanda",
        away: "Japão",
        kickoffDate: new Date("2026-06-14T20:00:00.000Z")
      },
      "E-0": {
        id: "E-0",
        home: "Alemanha",
        away: "Curaçao",
        kickoffDate: new Date("2026-06-14T17:00:00.000Z")
      },
      "G-0": {
        id: "G-0",
        home: "Bélgica",
        away: "Egito",
        kickoffDate: new Date("2026-06-15T17:00:00.000Z")
      }
    },
    predictions: {
      "F-0": { homeScore: 2, awayScore: 1 },
      "E-0": { homeScore: 3, awayScore: 0 }
    }
  });

  assert.equal(result.confirmedCount, 2);
  assert.equal(result.todayCount, 2);
  assert.match(result.text, /Meus palpites de Willian - 14\/06\/2026/);
  assert.ok(
    result.text.indexOf("14:00 | Alemanha 3 x 0 Curaçao")
      < result.text.indexOf("17:00 | Holanda 2 x 1 Japão")
  );
});

test("não compartilha rascunhos nem partidas de outro dia", () => {
  const result = buildTodayPredictionsMessage({
    now: new Date("2026-06-14T15:00:00.000Z"),
    officialMatches: {
      "E-0": {
        id: "E-0",
        home: "Alemanha",
        away: "Curaçao",
        kickoffDate: new Date("2026-06-14T17:00:00.000Z")
      }
    },
    predictions: {}
  });

  assert.equal(result.text, "");
  assert.equal(result.confirmedCount, 0);
  assert.equal(result.missingCount, 1);
});

test("compartilhamento de grupos ignora jogos do mata-mata", () => {
  const result = buildTodayPredictionsMessage({
    phase: "group",
    now: new Date("2026-06-29T15:00:00.000Z"),
    officialMatches: {
      "A-0": {
        id: "A-0",
        phase: "group",
        home: "México",
        away: "África do Sul",
        kickoffDate: new Date("2026-06-29T18:00:00.000Z")
      },
      "KO-R32-1": {
        id: "KO-R32-1",
        phase: "knockout",
        home: "Brasil",
        away: "Japão",
        kickoffDate: new Date("2026-06-29T20:00:00.000Z")
      }
    },
    predictions: {
      "A-0": { homeScore: 1, awayScore: 0 },
      "KO-R32-1": { homeScore: 2, awayScore: 1, qualifiedTeamId: "Brasil" }
    }
  });

  assert.equal(result.todayCount, 1);
  assert.equal(result.confirmedCount, 1);
  assert.match(result.text, /México 1 x 0 África do Sul/);
  assert.doesNotMatch(result.text, /Brasil/);
});

test("compartilhamento do mata-mata inclui classificado", () => {
  const result = buildTodayPredictionsMessage({
    phase: "knockout",
    displayName: "Willian",
    now: new Date("2026-06-29T15:00:00.000Z"),
    officialMatches: {
      "KO-R32-1": {
        id: "KO-R32-1",
        phase: "knockout",
        home: "Brasil",
        away: "Japão",
        kickoffDate: new Date("2026-06-29T20:00:00.000Z")
      },
      "A-0": {
        id: "A-0",
        phase: "group",
        home: "México",
        away: "África do Sul",
        kickoffDate: new Date("2026-06-29T18:00:00.000Z")
      }
    },
    predictions: {
      "KO-R32-1": { homeScore: 1, awayScore: 1, qualifiedTeamId: "Brasil" },
      "A-0": { homeScore: 1, awayScore: 0 }
    }
  });

  assert.equal(result.todayCount, 1);
  assert.match(result.text, /Meus palpites do mata-mata de Willian/);
  assert.match(result.text, /Brasil 1 x 1 Japão \| passa Brasil/);
  assert.doesNotMatch(result.text, /México/);
});
