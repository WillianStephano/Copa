import test from "node:test";
import assert from "node:assert/strict";
import { buildRanking } from "../js/ranking.js";

test("ranking soma pontos e desempata por placares exatos", () => {
  const users = [
    { uid: "ana", displayName: "Ana" },
    { uid: "bia", displayName: "Bia" }
  ];
  const predictions = [
    ...Array.from({ length: 5 }, (_, index) => ({
      uid: "ana",
      matchId: `A-${index}`,
      homeScore: 1,
      awayScore: 0
    })),
    ...Array.from({ length: 5 }, (_, index) => ({
      uid: "bia",
      matchId: `A-${index}`,
      homeScore: index < 3 ? 2 : 0,
      awayScore: 1
    }))
  ];
  const matches = new Map(Array.from({ length: 5 }, (_, index) => [
    `A-${index}`,
    { status: "FINISHED", homeScore: 2, awayScore: 1 }
  ]));

  const ranking = buildRanking(users, predictions, matches);

  assert.equal(ranking[0].uid, "bia");
  assert.equal(ranking[0].points, 15);
  assert.equal(ranking[0].exactHits, 3);
  assert.equal(ranking[1].uid, "ana");
  assert.equal(ranking[1].points, 15);
  assert.equal(ranking[1].exactHits, 0);
});
