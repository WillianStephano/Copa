import test from "node:test";
import assert from "node:assert/strict";
import { buildDailyRanking } from "../js/daily-ranking.js";

test("ranking diario soma apenas jogos encerrados do dia operacional", () => {
  const ranking = [
    {
      uid: "ana",
      displayName: "Ana",
      details: [
        { matchId: "A-0", points: 3, type: "exact" },
        { matchId: "A-1", points: 2, type: "outcome" },
        { matchId: "A-2", points: 3, type: "exact" }
      ]
    },
    {
      uid: "bia",
      displayName: "Bia",
      details: [
        { matchId: "A-0", points: 2, type: "outcome" },
        { matchId: "A-1", points: 0, type: "miss" }
      ]
    }
  ];
  const officialMatches = {
    "A-0": {
      status: "FINISHED",
      kickoffDate: new Date("2026-06-15T01:30:00.000Z")
    },
    "A-1": {
      status: "FINISHED",
      kickoffDate: new Date("2026-06-15T03:30:00.000Z")
    },
    "A-2": {
      status: "FINISHED",
      kickoffDate: new Date("2026-06-15T13:30:00.000Z")
    }
  };

  const daily = buildDailyRanking(
    ranking,
    officialMatches,
    new Date("2026-06-14T15:00:00.000Z")
  );

  assert.deepEqual(daily.map((entry) => entry.uid), ["ana", "bia"]);
  assert.equal(daily[0].points, 5);
  assert.equal(daily[0].exactHits, 1);
  assert.equal(daily[0].outcomeHits, 1);
  assert.equal(daily[0].matches, 2);
  assert.equal(daily[1].points, 2);
  assert.equal(daily[1].misses, 1);
});

test("ranking diario ignora quem nao teve partida avaliada hoje", () => {
  const daily = buildDailyRanking(
    [{ uid: "ana", displayName: "Ana", details: [{ matchId: "A-0", points: 3, type: "exact" }] }],
    { "A-0": { status: "SCHEDULED", kickoffDate: new Date("2026-06-14T18:00:00.000Z") } },
    new Date("2026-06-14T15:00:00.000Z")
  );

  assert.deepEqual(daily, []);
});
