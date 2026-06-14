import test from "node:test";
import assert from "node:assert/strict";
import { buildRanking } from "../js/ranking.js";

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
