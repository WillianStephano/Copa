import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMatchPredictionSummaries,
  isMatchPredictionSummaryPublic
} from "../js/match-prediction-summaries.js";

test("não publica resumo de palpites antes do fechamento do jogo", () => {
  const match = {
    status: "SCHEDULED",
    lockAt: new Date("2026-06-17T19:30:00.000Z")
  };

  assert.equal(
    isMatchPredictionSummaryPublic(match, new Date("2026-06-17T19:00:00.000Z")),
    false
  );
});

test("publica palpites por partida depois do fechamento", () => {
  const users = [
    { uid: "ana", displayName: "Ana", photoURL: "ana.png" },
    { uid: "bia", displayName: "Bia" }
  ];
  const predictions = [
    { uid: "bia", matchId: "A-0", homeScore: 1, awayScore: 1 },
    { uid: "ana", matchId: "A-0", homeScore: 2, awayScore: 0 }
  ];
  const matches = new Map([[
    "A-0",
    {
      status: "SCHEDULED",
      groupId: "A",
      matchIndex: 0,
      home: "Brasil",
      away: "Japão",
      lockAt: new Date("2026-06-17T19:30:00.000Z")
    }
  ]]);

  const summaries = buildMatchPredictionSummaries(
    users,
    predictions,
    matches,
    new Date("2026-06-17T19:31:00.000Z")
  );
  const summary = summaries.get("A-0");

  assert.equal(summary.totalPredictions, 2);
  assert.equal(summary.homeWinPredictions, 1);
  assert.equal(summary.drawPredictions, 1);
  assert.equal(summary.awayWinPredictions, 0);
  assert.deepEqual(summary.predictions.map((item) => item.displayName), ["Ana", "Bia"]);
  assert.equal(summary.predictions[0].choiceLabel, "Vitória Brasil");
  assert.equal(summary.predictions[1].choiceLabel, "Empate");
  assert.equal(summary.predictions[0].type, "pending");
});

test("inclui pontuação do palpite quando a partida terminou", () => {
  const summaries = buildMatchPredictionSummaries(
    [{ uid: "ana", displayName: "Ana" }],
    [{ uid: "ana", matchId: "A-0", homeScore: 2, awayScore: 1 }],
    new Map([[
      "A-0",
      {
        status: "FINISHED",
        home: "Brasil",
        away: "Japão",
        homeScore: 2,
        awayScore: 1
      }
    ]]),
    new Date("2026-06-17T19:00:00.000Z")
  );
  const [prediction] = summaries.get("A-0").predictions;

  assert.equal(prediction.type, "exact");
  assert.equal(prediction.points, 3);
});

test("resumo do mata-mata mostra quem passa e pontuacao propria", () => {
  const summaries = buildMatchPredictionSummaries(
    [{ uid: "ana", displayName: "Ana" }],
    [{ uid: "ana", matchId: "R32-1", homeScore: 1, awayScore: 1, qualifiedTeamId: "Brasil" }],
    new Map([[
      "R32-1",
      {
        phase: "knockout",
        status: "FINISHED",
        home: "Brasil",
        away: "Japão",
        homeScore: 1,
        awayScore: 1,
        qualifiedTeamId: "Brasil"
      }
    ]]),
    new Date("2026-06-29T21:00:00.000Z")
  );
  const [prediction] = summaries.get("R32-1").predictions;

  assert.equal(prediction.choiceLabel, "Empate · passa Brasil");
  assert.equal(prediction.type, "knockout-exact-qualified");
  assert.equal(prediction.points, 3);
});
