import test from "node:test";
import assert from "node:assert/strict";
import {
  EXACT_SCORE_POINTS,
  KNOCKOUT_DRAW_ONLY_POINTS,
  KNOCKOUT_EXACT_QUALIFIED_POINTS,
  KNOCKOUT_QUALIFIED_POINTS,
  OUTCOME_POINTS,
  getPredictionFeedback,
  getPredictionLockTime,
  isPredictionLocked,
  scoreGroupPrediction,
  scoreKnockoutPrediction,
  scorePrediction
} from "../js/scoring.js";

test("placar exato vale 3 pontos", () => {
  assert.equal(EXACT_SCORE_POINTS, 3);
  assert.deepEqual(
    scorePrediction(
      { homeScore: 2, awayScore: 1 },
      { homeScore: 2, awayScore: 1 }
    ),
    { points: EXACT_SCORE_POINTS, type: "exact" }
  );
});

test("acertar vencedor ou empate vale 2 pontos", () => {
  assert.equal(OUTCOME_POINTS, 2);
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

test("fase de grupos ignora regra de classificado do mata-mata", () => {
  assert.deepEqual(
    scorePrediction(
      { homeScore: 1, awayScore: 1, qualifiedTeamId: "Brasil" },
      { phase: "group", homeScore: 2, awayScore: 2, qualifiedTeamId: "Japão" }
    ),
    { points: OUTCOME_POINTS, type: "outcome" }
  );

  assert.deepEqual(
    scoreGroupPrediction(
      { homeScore: 1, awayScore: 0, qualifiedTeamId: "Brasil" },
      { phase: "knockout", homeScore: 2, awayScore: 0, qualifiedTeamId: "Japão" }
    ),
    { points: OUTCOME_POINTS, type: "outcome" }
  );
});

test("mata-mata: placar exato e classificado correto vale 3 pontos", () => {
  assert.equal(KNOCKOUT_EXACT_QUALIFIED_POINTS, 3);
  assert.deepEqual(
    scoreKnockoutPrediction(
      { homeScore: 1, awayScore: 1, qualifiedTeamId: "Brasil" },
      { phase: "knockout", home: "Brasil", away: "Japão", homeScore: 1, awayScore: 1, qualifiedTeamId: "Brasil" }
    ),
    { points: 3, type: "knockout-exact-qualified" }
  );
});

test("mata-mata: errou placar mas acertou classificado vale 2 pontos", () => {
  assert.equal(KNOCKOUT_QUALIFIED_POINTS, 2);
  assert.deepEqual(
    scorePrediction(
      { homeScore: 2, awayScore: 0, qualifiedTeamId: "Brasil" },
      { phase: "knockout", home: "Brasil", away: "Japão", homeScore: 1, awayScore: 0, qualifiedTeamId: "Brasil" }
    ),
    { points: 2, type: "knockout-qualified" }
  );
});

test("mata-mata: acertou empate mas errou classificado vale 1 ponto", () => {
  assert.equal(KNOCKOUT_DRAW_ONLY_POINTS, 1);
  assert.deepEqual(
    scorePrediction(
      { homeScore: 0, awayScore: 0, qualifiedTeamId: "Japão" },
      { phase: "knockout", home: "Brasil", away: "Japão", homeScore: 1, awayScore: 1, qualifiedTeamId: "Brasil" }
    ),
    { points: 1, type: "knockout-draw-only" }
  );
});

test("mata-mata: errou placar empate e classificado vale 0 pontos", () => {
  assert.deepEqual(
    scorePrediction(
      { homeScore: 1, awayScore: 0, qualifiedTeamId: "Brasil" },
      { phase: "knockout", home: "Brasil", away: "Japão", homeScore: 1, awayScore: 1, qualifiedTeamId: "Japão" }
    ),
    { points: 0, type: "miss" }
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
