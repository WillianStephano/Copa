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
