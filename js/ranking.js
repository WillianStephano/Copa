import { scorePrediction } from "./scoring.js";

export function buildRanking(users, predictions, matches) {
  const entries = new Map();

  users.forEach((user) => {
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
