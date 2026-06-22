import test from "node:test";
import assert from "node:assert/strict";
import { buildDailyRanking } from "../js/daily-ranking.js";

test("ranking diario soma apenas jogos encerrados do dia operacional", () => {
  const ranking = [
    {
      uid: "ana",
      displayName: "Ana",
      details: [
        { matchId: "A-0", predictedHomeScore: 2, predictedAwayScore: 0 },
        { matchId: "A-1", predictedHomeScore: 1, predictedAwayScore: 0 },
        { matchId: "A-2", predictedHomeScore: 3, predictedAwayScore: 0 }
      ]
    },
    {
      uid: "bia",
      displayName: "Bia",
      details: [
        { matchId: "A-0", predictedHomeScore: 1, predictedAwayScore: 0 },
        { matchId: "A-1", predictedHomeScore: 0, predictedAwayScore: 1 }
      ]
    }
  ];
  const officialMatches = {
    "A-0": {
      status: "FINISHED",
      kickoffDate: new Date("2026-06-15T01:30:00.000Z"),
      homeScore: 2,
      awayScore: 0
    },
    "A-1": {
      status: "FINISHED",
      kickoffDate: new Date("2026-06-15T03:30:00.000Z"),
      homeScore: 2,
      awayScore: 1
    },
    "A-2": {
      status: "FINISHED",
      kickoffDate: new Date("2026-06-15T13:30:00.000Z"),
      homeScore: 3,
      awayScore: 0
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
    [{ uid: "ana", displayName: "Ana", details: [{ matchId: "A-0", predictedHomeScore: 1, predictedAwayScore: 0 }] }],
    {
      "A-0": {
        status: "SCHEDULED",
        kickoffDate: new Date("2026-06-14T18:00:00.000Z"),
        homeScore: null,
        awayScore: null
      }
    },
    new Date("2026-06-14T15:00:00.000Z")
  );

  assert.deepEqual(daily, []);
});

test("ranking diario recalcula pontos e nao confia em pontuacao antiga salva", () => {
  const daily = buildDailyRanking(
    [{
      uid: "ana",
      displayName: "Ana",
      details: [
        {
          matchId: "A-0",
          predictedHomeScore: 2,
          predictedAwayScore: 1,
          points: 99,
          type: "miss"
        }
      ]
    }],
    {
      "A-0": {
        status: "FINISHED",
        kickoffDate: new Date("2026-06-14T18:00:00.000Z"),
        homeScore: 2,
        awayScore: 1
      }
    },
    new Date("2026-06-14T15:00:00.000Z")
  );

  assert.equal(daily[0].points, 3);
  assert.equal(daily[0].exactHits, 1);
  assert.equal(daily[0].outcomeHits, 0);
  assert.equal(daily[0].misses, 0);
});

test("ranking diario desempata por exatos, resultados e nome", () => {
  const ranking = [
    {
      uid: "bruno",
      displayName: "Bruno",
      details: [
        { matchId: "A-0", predictedHomeScore: 1, predictedAwayScore: 0 },
        { matchId: "A-1", predictedHomeScore: 1, predictedAwayScore: 0 }
      ]
    },
    {
      uid: "ana",
      displayName: "Ana",
      details: [
        { matchId: "A-0", predictedHomeScore: 2, predictedAwayScore: 1 },
        { matchId: "A-1", predictedHomeScore: 1, predictedAwayScore: 0 }
      ]
    },
    {
      uid: "caio",
      displayName: "Caio",
      details: [
        { matchId: "A-0", predictedHomeScore: 1, predictedAwayScore: 0 },
        { matchId: "A-1", predictedHomeScore: 1, predictedAwayScore: 0 }
      ]
    }
  ];
  const officialMatches = {
    "A-0": {
      status: "FINISHED",
      kickoffDate: new Date("2026-06-14T18:00:00.000Z"),
      homeScore: 2,
      awayScore: 1
    },
    "A-1": {
      status: "FINISHED",
      kickoffDate: new Date("2026-06-14T21:00:00.000Z"),
      homeScore: 2,
      awayScore: 0
    }
  };

  const daily = buildDailyRanking(ranking, officialMatches, new Date("2026-06-14T15:00:00.000Z"));

  assert.deepEqual(daily.map((entry) => entry.uid), ["ana", "bruno", "caio"]);
  assert.equal(daily[0].points, 5);
  assert.equal(daily[0].exactHits, 1);
  assert.equal(daily[1].points, 4);
  assert.equal(daily[1].outcomeHits, 2);
});

test("ranking diario inclui participante com jogos avaliados mesmo se fez zero pontos", () => {
  const daily = buildDailyRanking(
    [{
      uid: "ana",
      displayName: "Ana",
      details: [{ matchId: "A-0", predictedHomeScore: 0, predictedAwayScore: 1 }]
    }],
    {
      "A-0": {
        status: "FINISHED",
        kickoffDate: new Date("2026-06-14T18:00:00.000Z"),
        homeScore: 2,
        awayScore: 0
      }
    },
    new Date("2026-06-14T15:00:00.000Z")
  );

  assert.equal(daily.length, 1);
  assert.equal(daily[0].points, 0);
  assert.equal(daily[0].misses, 1);
  assert.equal(daily[0].matches, 1);
});
