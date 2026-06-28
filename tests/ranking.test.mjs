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

test("detalhes do ranking ficam em ordem de data da partida", () => {
  const predictions = [
    { uid: "ana", matchId: "A-1", homeScore: 1, awayScore: 0 },
    { uid: "ana", matchId: "A-9", homeScore: 2, awayScore: 1 },
    { uid: "ana", matchId: "A-0", homeScore: 0, awayScore: 0 }
  ];
  const matches = new Map([
    ["A-1", {
      status: "FINISHED",
      home: "Time 1",
      away: "Time 2",
      homeScore: 1,
      awayScore: 0,
      kickoffAt: new Date("2026-06-13T18:00:00.000Z")
    }],
    ["A-9", {
      status: "FINISHED",
      home: "Time 3",
      away: "Time 4",
      homeScore: 2,
      awayScore: 1,
      kickoffAt: new Date("2026-06-11T18:00:00.000Z")
    }],
    ["A-0", {
      status: "FINISHED",
      home: "Time 5",
      away: "Time 6",
      homeScore: 0,
      awayScore: 0,
      kickoffAt: new Date("2026-06-12T18:00:00.000Z")
    }]
  ]);

  const details = buildRankingDetails(predictions, matches).get("ana");

  assert.deepEqual(details.map((detail) => detail.matchId), ["A-9", "A-0", "A-1"]);
  assert.equal(Object.hasOwn(details[0], "matchTime"), false);
});

test("ranking calcula sequencia atual e maior sequencia de acertos", () => {
  const users = [{ uid: "ana", displayName: "Ana" }];
  const predictions = [
    { uid: "ana", matchId: "A-0", homeScore: 1, awayScore: 0 },
    { uid: "ana", matchId: "A-1", homeScore: 2, awayScore: 0 },
    { uid: "ana", matchId: "A-2", homeScore: 0, awayScore: 0 },
    { uid: "ana", matchId: "A-3", homeScore: 3, awayScore: 0 }
  ];
  const matches = new Map([
    ["A-0", { status: "FINISHED", homeScore: 1, awayScore: 0, kickoffAt: new Date("2026-06-11T18:00:00.000Z") }],
    ["A-1", { status: "FINISHED", homeScore: 3, awayScore: 1, kickoffAt: new Date("2026-06-12T18:00:00.000Z") }],
    ["A-2", { status: "FINISHED", homeScore: 0, awayScore: 0, kickoffAt: new Date("2026-06-13T18:00:00.000Z") }],
    ["A-3", { status: "FINISHED", homeScore: 2, awayScore: 0, kickoffAt: new Date("2026-06-14T18:00:00.000Z") }]
  ]);

  const [entry] = buildRanking(users, predictions, matches);

  assert.equal(entry.currentStreak, 4);
  assert.equal(entry.bestStreak, 4);
});

test("ranking quebra sequencia quando usuario erra ou nao palpita jogo encerrado", () => {
  const users = [{ uid: "ana", displayName: "Ana" }];
  const predictions = [
    { uid: "ana", matchId: "A-0", homeScore: 1, awayScore: 0 },
    { uid: "ana", matchId: "A-1", homeScore: 0, awayScore: 1 },
    { uid: "ana", matchId: "A-3", homeScore: 2, awayScore: 0 }
  ];
  const matches = new Map([
    ["A-0", { status: "FINISHED", homeScore: 1, awayScore: 0, kickoffAt: new Date("2026-06-11T18:00:00.000Z") }],
    ["A-1", { status: "FINISHED", homeScore: 2, awayScore: 0, kickoffAt: new Date("2026-06-12T18:00:00.000Z") }],
    ["A-2", { status: "FINISHED", homeScore: 1, awayScore: 1, kickoffAt: new Date("2026-06-13T18:00:00.000Z") }],
    ["A-3", { status: "FINISHED", homeScore: 3, awayScore: 0, kickoffAt: new Date("2026-06-14T18:00:00.000Z") }]
  ]);

  const [entry] = buildRanking(users, predictions, matches);

  assert.equal(entry.currentStreak, 1);
  assert.equal(entry.bestStreak, 1);
});

test("ranking soma grupos e mata-mata com regras segregadas", () => {
  const users = [{ uid: "ana", displayName: "Ana" }];
  const predictions = [
    { uid: "ana", matchId: "A-0", homeScore: 2, awayScore: 1 },
    { uid: "ana", matchId: "R32-1", homeScore: 1, awayScore: 1, qualifiedTeamId: "Brasil" },
    { uid: "ana", matchId: "R32-2", homeScore: 0, awayScore: 0, qualifiedTeamId: "Japão" }
  ];
  const matches = new Map([
    ["A-0", { phase: "group", status: "FINISHED", homeScore: 3, awayScore: 2, kickoffAt: new Date("2026-06-20T18:00:00.000Z") }],
    ["R32-1", { phase: "knockout", status: "FINISHED", home: "Brasil", away: "Japão", homeScore: 2, awayScore: 1, qualifiedTeamId: "Brasil", kickoffAt: new Date("2026-06-29T18:00:00.000Z") }],
    ["R32-2", { phase: "knockout", status: "FINISHED", home: "Argentina", away: "França", homeScore: 1, awayScore: 1, qualifiedTeamId: "França", kickoffAt: new Date("2026-06-30T18:00:00.000Z") }]
  ]);

  const [entry] = buildRanking(users, predictions, matches);
  const details = buildRankingDetails(predictions, matches).get("ana");

  assert.equal(entry.points, 5);
  assert.equal(entry.exactHits, 0);
  assert.equal(entry.outcomeHits, 2);
  assert.equal(entry.misses, 1);
  assert.equal(details[1].type, "knockout-qualified");
  assert.equal(details[2].type, "knockout-draw-only");
  assert.equal(details[2].points, 1);
});

