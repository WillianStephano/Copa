export const EXACT_SCORE_POINTS = 5;
export const OUTCOME_POINTS = 3;
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

export function getPredictionLockTime(kickoffAt) {
  const kickoff = kickoffAt instanceof Date ? kickoffAt : new Date(kickoffAt);
  if (Number.isNaN(kickoff.getTime())) return null;
  return new Date(kickoff.getTime() - PREDICTION_LOCK_MINUTES * 60_000);
}

export function isPredictionLocked(kickoffAt, now = new Date()) {
  const lockTime = getPredictionLockTime(kickoffAt);
  return !lockTime || now.getTime() >= lockTime.getTime();
}
