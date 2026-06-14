export const EXACT_SCORE_POINTS = 3;
export const OUTCOME_POINTS = 2;
export const PREDICTION_LOCK_MINUTES = 30;

export function matchOutcome(homeScore, awayScore) {
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return "draw";
}

export function scorePrediction(prediction, result) {
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
