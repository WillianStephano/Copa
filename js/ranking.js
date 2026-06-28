import { scorePrediction } from "./scoring.js";

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchDateTime(match) {
  return toDate(match?.kickoffAt || match?.kickoffDate || match?.kickoff)?.getTime() ?? 0;
}

function isScoredMatch(match) {
  return match?.status === "FINISHED"
    && Number.isInteger(match.homeScore)
    && Number.isInteger(match.awayScore);
}

function finishedMatchesInOrder(matches) {
  return Array.from(matches.entries())
    .filter(([, match]) => isScoredMatch(match))
    .map(([matchId, match]) => ({
      matchId,
      match,
      matchTime: matchDateTime(match)
    }))
    .sort((a, b) =>
      a.matchTime - b.matchTime
      || a.matchId.localeCompare(b.matchId)
    );
}

function buildPredictionIndex(predictions) {
  const index = new Map();
  predictions.forEach((prediction) => {
    if (!prediction.uid || !prediction.matchId) return;
    index.set(`${prediction.uid}:${prediction.matchId}`, prediction);
  });
  return index;
}

export function isExactHit(score) {
  return score?.type === "exact" || score?.type === "knockout-exact-qualified";
}

export function isOutcomeHit(score) {
  return score?.type === "outcome" || score?.type === "knockout-qualified";
}

export function isStreakHit(score) {
  return isExactHit(score) || isOutcomeHit(score);
}

export function calculateHitStreak(uid, predictionsByUserMatch, finishedMatches) {
  let currentStreak = 0;
  let bestStreak = 0;

  finishedMatches.forEach(({ matchId, match }) => {
    const prediction = predictionsByUserMatch.get(`${uid}:${matchId}`);
    const score = prediction ? scorePrediction(prediction, match) : { type: "miss" };
    const isHit = isStreakHit(score);

    if (!isHit) {
      currentStreak = 0;
      return;
    }

    currentStreak += 1;
    bestStreak = Math.max(bestStreak, currentStreak);
  });

  return { currentStreak, bestStreak };
}

export function buildRankingDetails(predictions, matches) {
  const details = new Map();

  predictions.forEach((prediction) => {
    const match = matches.get(prediction.matchId);
    if (!match || match.status !== "FINISHED") return;
    if (!Number.isInteger(match.homeScore) || !Number.isInteger(match.awayScore)) return;

    const score = scorePrediction(prediction, match);
    const userDetails = details.get(prediction.uid) || [];
    const predictedQualifiedTeamId = prediction.qualifiedTeamId || prediction.qualifiedTeam || "";
    const qualifiedTeamId = match.qualifiedTeamId || match.qualifiedTeam || "";
    const detail = {
      matchId: prediction.matchId,
      home: match.home || prediction.home,
      away: match.away || prediction.away,
      predictedHomeScore: prediction.homeScore,
      predictedAwayScore: prediction.awayScore,
      actualHomeScore: match.homeScore,
      actualAwayScore: match.awayScore,
      points: score.points,
      type: score.type,
      matchTime: matchDateTime(match)
    };
    if (predictedQualifiedTeamId) detail.predictedQualifiedTeamId = predictedQualifiedTeamId;
    if (qualifiedTeamId) detail.qualifiedTeamId = qualifiedTeamId;
    userDetails.push(detail);
    details.set(prediction.uid, userDetails);
  });

  details.forEach((items) => {
    items.sort((a, b) =>
      a.matchTime - b.matchTime
      || a.matchId.localeCompare(b.matchId)
    );
    items.forEach((item) => {
      delete item.matchTime;
    });
  });

  return details;
}

export function buildRanking(users, predictions, matches) {
  const entries = new Map();
  const predictionsByUserMatch = buildPredictionIndex(predictions);
  const finishedMatches = finishedMatchesInOrder(matches);

  users.forEach((user) => {
    if (!user.uid) return;
    entries.set(user.uid, {
      uid: user.uid,
      displayName: user.displayName || "Participante",
      photoURL: user.photoURL || "",
      points: 0,
      exactHits: 0,
      outcomeHits: 0,
      misses: 0,
      scoredPredictions: 0,
      currentStreak: 0,
      bestStreak: 0
    });
  });

  predictions.forEach((prediction) => {
    const match = matches.get(prediction.matchId);
    if (!match || match.status !== "FINISHED") return;
    if (!Number.isInteger(match.homeScore) || !Number.isInteger(match.awayScore)) return;

    const entry = entries.get(prediction.uid) || {
      uid: prediction.uid,
      displayName: "Participante",
      photoURL: "",
      points: 0,
      exactHits: 0,
      outcomeHits: 0,
      misses: 0,
      scoredPredictions: 0,
      currentStreak: 0,
      bestStreak: 0
    };

    const score = scorePrediction(prediction, match);
    entry.points += score.points;
    entry.scoredPredictions += 1;
    if (isExactHit(score)) entry.exactHits += 1;
    else if (isOutcomeHit(score)) entry.outcomeHits += 1;
    else entry.misses += 1;
    entries.set(prediction.uid, entry);
  });

  entries.forEach((entry) => {
    const streak = calculateHitStreak(entry.uid, predictionsByUserMatch, finishedMatches);
    entry.currentStreak = streak.currentStreak;
    entry.bestStreak = streak.bestStreak;
  });

  const sorted = Array.from(entries.values()).sort((a, b) =>
    b.points - a.points
    || b.exactHits - a.exactHits
    || b.outcomeHits - a.outcomeHits
    || a.displayName.localeCompare(b.displayName, "pt-BR")
  );

  let previous = null;
  return sorted.map((entry, index) => {
    const tied = previous
      && previous.points === entry.points
      && previous.exactHits === entry.exactHits
      && previous.outcomeHits === entry.outcomeHits;
    const position = tied ? previous.position : index + 1;
    const ranked = { ...entry, position };
    previous = ranked;
    return ranked;
  });
}
