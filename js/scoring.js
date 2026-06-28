export const EXACT_SCORE_POINTS = 3;
export const OUTCOME_POINTS = 2;
export const KNOCKOUT_EXACT_QUALIFIED_POINTS = 3;
export const KNOCKOUT_QUALIFIED_POINTS = 2;
export const KNOCKOUT_DRAW_ONLY_POINTS = 1;
export const PREDICTION_LOCK_MINUTES = 30;

export function matchOutcome(homeScore, awayScore) {
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return "draw";
}

export function scoreGroupPrediction(prediction, result) {
  if (!prediction || !result) return { points: 0, type: "none" };

  const predictedHome = Number(prediction.homeScore);
  const predictedAway = Number(prediction.awayScore);
  const actualHome = Number(result.homeScore);
  const actualAway = Number(result.awayScore);

  if (![predictedHome, predictedAway, actualHome, actualAway].every(Number.isInteger)) {
    return { points: 0, type: "none" };
  }

  if (predictedHome === actualHome && predictedAway === actualAway) {
    return { points: EXACT_SCORE_POINTS, type: "exact" };
  }

  if (matchOutcome(predictedHome, predictedAway) === matchOutcome(actualHome, actualAway)) {
    return { points: OUTCOME_POINTS, type: "outcome" };
  }

  return { points: 0, type: "miss" };
}

function normalizedQualifiedTeam(value) {
  return value ? String(value).trim() : "";
}

export function inferredQualifiedTeam(prediction, home, away) {
  const predictedHome = Number(prediction?.homeScore);
  const predictedAway = Number(prediction?.awayScore);
  if (![predictedHome, predictedAway].every(Number.isInteger)) return "";
  if (predictedHome > predictedAway) return home || prediction?.home || "home";
  if (predictedAway > predictedHome) return away || prediction?.away || "away";
  return normalizedQualifiedTeam(prediction?.qualifiedTeamId || prediction?.qualifiedTeam);
}

export function officialQualifiedTeam(result) {
  const explicit = normalizedQualifiedTeam(result?.qualifiedTeamId || result?.qualifiedTeam);
  if (explicit) return explicit;

  const actualHome = Number(result?.homeScore);
  const actualAway = Number(result?.awayScore);
  if (![actualHome, actualAway].every(Number.isInteger)) return "";
  if (actualHome > actualAway) return result.home || result.homeTeam || "home";
  if (actualAway > actualHome) return result.away || result.awayTeam || "away";

  const penaltyHome = Number(result?.penaltyHomeScore);
  const penaltyAway = Number(result?.penaltyAwayScore);
  if (![penaltyHome, penaltyAway].every(Number.isInteger)) return "";
  return penaltyHome > penaltyAway
    ? (result.home || result.homeTeam || "home")
    : (result.away || result.awayTeam || "away");
}

export function scoreKnockoutPrediction(prediction, result) {
  if (!prediction || !result) return { points: 0, type: "none" };

  const predictedHome = Number(prediction.homeScore);
  const predictedAway = Number(prediction.awayScore);
  const actualHome = Number(result.homeScore);
  const actualAway = Number(result.awayScore);

  if (![predictedHome, predictedAway, actualHome, actualAway].every(Number.isInteger)) {
    return { points: 0, type: "none" };
  }

  const predictionOutcome = matchOutcome(predictedHome, predictedAway);
  const actualOutcome = matchOutcome(actualHome, actualAway);
  const predictedQualified = normalizedQualifiedTeam(
    inferredQualifiedTeam(prediction, result.home || prediction.home, result.away || prediction.away)
  );
  const actualQualified = normalizedQualifiedTeam(officialQualifiedTeam(result));
  const qualifiedHit = Boolean(predictedQualified && actualQualified && predictedQualified === actualQualified);
  const exactHit = predictedHome === actualHome && predictedAway === actualAway;
  const drawHit = predictionOutcome === "draw" && actualOutcome === "draw";

  if (exactHit && qualifiedHit) {
    return { points: KNOCKOUT_EXACT_QUALIFIED_POINTS, type: "knockout-exact-qualified" };
  }

  if (qualifiedHit) {
    return { points: KNOCKOUT_QUALIFIED_POINTS, type: "knockout-qualified" };
  }

  if (drawHit) {
    return { points: KNOCKOUT_DRAW_ONLY_POINTS, type: "knockout-draw-only" };
  }

  return { points: 0, type: "miss" };
}

export function scorePrediction(prediction, result) {
  if (result?.phase === "knockout") {
    return scoreKnockoutPrediction(prediction, result);
  }

  return scoreGroupPrediction(prediction, result);
}

export function getPredictionFeedback(prediction, result, home, away) {
  if (!result || result.status !== "FINISHED") return null;

  const actualHome = Number(result.homeScore);
  const actualAway = Number(result.awayScore);
  if (![actualHome, actualAway].every(Number.isInteger)) return null;

  if (!prediction) {
    return {
      points: 0,
      type: "none",
      title: "Sem palpite confirmado",
      detail: "Este jogo não entrou na sua pontuação."
    };
  }

  const score = scorePrediction(prediction, result);
  if (result.phase === "knockout") {
    const actualQualified = officialQualifiedTeam({ ...result, home, away });
    const predictedQualified = inferredQualifiedTeam(prediction, home, away);
    const resultText = actualQualified ? `Classificado: ${actualQualified}.` : "Classificado ainda nao informado.";
    const predictionText = predictedQualified ? `Seu classificado: ${predictedQualified}.` : "Voce nao informou classificado.";

    const feedbackByType = {
      "knockout-exact-qualified": {
        title: "Placar e classificado certos",
        detail: `Voce acertou o placar e quem passou. ${resultText}`
      },
      "knockout-qualified": {
        title: "Classificado correto",
        detail: `Voce errou o placar, mas acertou quem passou. ${resultText}`
      },
      "knockout-draw-only": {
        title: "Empate correto",
        detail: `Voce acertou que o jogo empatou, mas errou quem passou. ${predictionText}`
      }
    };

    if (feedbackByType[score.type]) return { ...score, ...feedbackByType[score.type] };

    return {
      ...score,
      title: "Palpite incorreto",
      detail: `${resultText} ${predictionText}`
    };
  }

  const predictedOutcome = matchOutcome(
    Number(prediction.homeScore),
    Number(prediction.awayScore)
  );
  const actualOutcome = matchOutcome(actualHome, actualAway);

  if (score.type === "exact") {
    return {
      ...score,
      title: "Placar exato",
      detail: `Você acertou ${actualHome} x ${actualAway}.`
    };
  }

  if (score.type === "outcome") {
    return {
      ...score,
      title: actualOutcome === "draw" ? "Empate correto" : "Resultado correto",
      detail: actualOutcome === "draw"
        ? "Você acertou que a partida terminaria empatada."
        : `Você acertou a vitória de ${actualOutcome === "home" ? home : away}.`
    };
  }

  if (predictedOutcome === "draw") {
    const winner = actualOutcome === "home" ? home : away;
    return {
      ...score,
      title: "Palpite incorreto",
      detail: `Você marcou empate, mas ${winner} venceu.`
    };
  }

  if (actualOutcome === "draw") {
    const predictedWinner = predictedOutcome === "home" ? home : away;
    return {
      ...score,
      title: "Palpite incorreto",
      detail: `A partida terminou empatada; seu palpite indicava ${predictedWinner}.`
    };
  }

  const actualWinner = actualOutcome === "home" ? home : away;
  return {
    ...score,
    title: "Palpite incorreto",
    detail: `${actualWinner} venceu a partida.`
  };
}

export function getPredictionLockTime(kickoffAt) {
  const kickoff = kickoffAt instanceof Date ? kickoffAt : new Date(kickoffAt);
  if (Number.isNaN(kickoff.getTime())) return null;
  return new Date(kickoff.getTime() - PREDICTION_LOCK_MINUTES * 60_000);
}

export function isPredictionLocked(kickoffAt, now = new Date()) {
  const lockTime = getPredictionLockTime(kickoffAt);
  return !lockTime || now.getTime() >= lockTime.getTime();
}
