import test from "node:test";
import assert from "node:assert/strict";
import { buildRanking, buildRankingDetails } from "../js/ranking.js";

test("ranking soma pontos e desempata por placares exatos", () => {
  const users = [
    { uid: "ana", displayName: "Ana" },
    { uid: "bia", displayName: "Bia" }
  ];
  const predictions = [
    ...Array.from({ length: 3 }, (_, index) => ({
      uid: "ana",
      matchId: `A-${index}`,
      homeScore: 1,
      awayScore: 0
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      uid: "bia",
      matchId: `A-${index}`,
      homeScore: index < 2 ? 2 : 0,
      awayScore: 1
    }))
  ];
  const matches = new Map(Array.from({ length: 3 }, (_, index) => [
    `A-${index}`,
    { status: "FINISHED", homeScore: 2, awayScore: 1 }
  ]));

  const ranking = buildRanking(users, predictions, matches);

  assert.equal(ranking[0].uid, "bia");
  assert.equal(ranking[0].points, 6);
  assert.equal(ranking[0].exactHits, 2);
  assert.equal(ranking[1].uid, "ana");
  assert.equal(ranking[1].points, 6);
  assert.equal(ranking[1].exactHits, 0);
});

test("ranking ignora registros sem identificador de usuário", () => {
  const ranking = buildRanking(
    [{ displayName: "Perfil incompleto" }],
    [],
    new Map()
  );

  assert.deepEqual(ranking, []);
});

test("detalhes públicos incluem somente palpites de partidas encerradas", () => {
  const predictions = [
    {
      uid: "ana",
      matchId: "A-0",
      home: "México",
      away: "África do Sul",
      homeScore: 2,
      awayScore: 0
    },
    {
      uid: "ana",
      matchId: "A-1",
      home: "Coreia do Sul",
      away: "Tchéquia",
      homeScore: 1,
      awayScore: 0
    }
  ];
  const matches = new Map([
    ["A-0", {
      status: "FINISHED",
      home: "México",
      away: "África do Sul",
      homeScore: 2,
      awayScore: 0
    }],
    ["A-1", {
      status: "SCHEDULED",
      home: "Coreia do Sul",
      away: "Tchéquia",
      homeScore: null,
      awayScore: null
    }]
  ]);

  const details = buildRankingDetails(predictions, matches).get("ana");

  assert.equal(details.length, 1);
  assert.deepEqual(details[0], {
    matchId: "A-0",
    home: "México",
    away: "África do Sul",
    predictedHomeScore: 2,
    predictedAwayScore: 0,
    actualHomeScore: 2,
    actualAwayScore: 0,
    points: 3,
    type: "exact"
  });
});
