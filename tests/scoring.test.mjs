import test from "node:test";
import assert from "node:assert/strict";
import {
  EXACT_SCORE_POINTS,
  OUTCOME_POINTS,
  getPredictionFeedback,
  getPredictionLockTime,
  isPredictionLocked,
  scorePrediction
} from "../js/scoring.js";

test("placar exato vale 5 pontos", () => {
  assert.deepEqual(
    scorePrediction(
      { homeScore: 2, awayScore: 1 },
      { homeScore: 2, awayScore: 1 }
    ),
    { points: EXACT_SCORE_POINTS, type: "exact" }
  );
});

test("acertar vencedor ou empate vale 3 pontos", () => {
  assert.deepEqual(
    scorePrediction(
      { homeScore: 3, awayScore: 0 },
      { homeScore: 1, awayScore: 0 }
    ),
    { points: OUTCOME_POINTS, type: "outcome" }
  );

  assert.deepEqual(
    scorePrediction(
      { homeScore: 1, awayScore: 1 },
      { homeScore: 2, awayScore: 2 }
    ),
    { points: OUTCOME_POINTS, type: "outcome" }
  );
});

test("palpite bloqueia 30 minutos antes do início", () => {
  const kickoff = new Date("2026-06-20T18:00:00.000Z");
  assert.equal(getPredictionLockTime(kickoff).toISOString(), "2026-06-20T17:30:00.000Z");
  assert.equal(isPredictionLocked(kickoff, new Date("2026-06-20T17:29:59.000Z")), false);
  assert.equal(isPredictionLocked(kickoff, new Date("2026-06-20T17:30:00.000Z")), true);
});

test("feedback informa acerto de empate sem placar exato", () => {
  assert.deepEqual(
    getPredictionFeedback(
      { homeScore: 1, awayScore: 1 },
      { status: "FINISHED", homeScore: 2, awayScore: 2 },
      "Brasil",
      "Marrocos"
    ),
    {
      points: OUTCOME_POINTS,
      type: "outcome",
      title: "Empate correto",
      detail: "Você acertou que a partida terminaria empatada."
    }
  );
});

test("feedback explica quando o empate previsto estava errado", () => {
  const feedback = getPredictionFeedback(
    { homeScore: 0, awayScore: 0 },
    { status: "FINISHED", homeScore: 2, awayScore: 1 },
    "Brasil",
    "Marrocos"
  );

  assert.equal(feedback.type, "miss");
  assert.equal(feedback.points, 0);
  assert.equal(feedback.detail, "Você marcou empate, mas Brasil venceu.");
});
