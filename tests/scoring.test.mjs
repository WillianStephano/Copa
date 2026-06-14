import test from "node:test";
import assert from "node:assert/strict";
import {
  EXACT_SCORE_POINTS,
  OUTCOME_POINTS,
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
