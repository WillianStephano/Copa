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

export function buildRankingDetails(predictions, matches) {
  const details = new Map();

  predictions.forEach((prediction) => {
    const match = matches.get(prediction.matchId);
    if (!match || match.status !== "FINISHED") return;
    if (!Number.isInteger(match.homeScore) || !Number.isInteger(match.awayScore)) return;

    const score = scorePrediction(prediction, match);
    const userDetails = details.get(prediction.uid) || [];
    userDetails.push({
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
    });
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
      scoredPredictions: 0
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
      scoredPredictions: 0
    };

    const score = scorePrediction(prediction, match);
    entry.points += score.points;
    entry.scoredPredictions += 1;
    if (score.type === "exact") entry.exactHits += 1;
    else if (score.type === "outcome") entry.outcomeHits += 1;
    else entry.misses += 1;
    entries.set(prediction.uid, entry);
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
