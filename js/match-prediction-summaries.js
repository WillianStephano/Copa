import { matchOutcome, scorePrediction } from "./scoring.js";

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isFinishedWithScore(match) {
  return match?.status === "FINISHED"
    && Number.isInteger(match.homeScore)
    && Number.isInteger(match.awayScore);
}

function isValidPrediction(prediction) {
  return prediction?.uid
    && prediction.matchId
    && Number.isInteger(Number(prediction.homeScore))
    && Number.isInteger(Number(prediction.awayScore));
}

function participantFrom(usersByUid, uid) {
  const user = usersByUid.get(uid) || {};
  return {
    displayName: user.displayName || "Participante",
    photoURL: user.photoURL || ""
  };
}

function createSummary(matchId, match, prediction = {}) {
  return {
    matchId,
    groupId: match.groupId || prediction.groupId || matchId.split("-")[0],
    matchIndex: Number.isInteger(match.matchIndex)
      ? match.matchIndex
      : Number(prediction.matchIndex || matchId.split("-")[1]),
    home: match.home || prediction.home || "",
    away: match.away || prediction.away || "",
    totalPredictions: 0,
    homeWinPredictions: 0,
    drawPredictions: 0,
    awayWinPredictions: 0,
    predictions: []
  };
}

export function isMatchPredictionSummaryPublic(match, now = new Date()) {
  if (!match) return false;
  if (isFinishedWithScore(match)) return true;

  const lockAt = toDate(match.lockAt || match.lockDate);
  return Boolean(lockAt && now.getTime() >= lockAt.getTime());
}

export function buildChoiceLabel(choice, match, prediction) {
  if (choice === "draw") return "Empate";
  const team = choice === "home"
    ? (match.home || prediction.home || "mandante")
    : (match.away || prediction.away || "visitante");
  return `Vitória ${team}`;
}

export function buildMatchPredictionSummaries(users, predictions, matches, now = new Date()) {
  const usersByUid = new Map(
    users
      .filter((user) => user.uid)
      .map((user) => [user.uid, user])
  );
  const summaries = new Map();

  matches.forEach((match, matchId) => {
    if (isMatchPredictionSummaryPublic(match, now)) {
      summaries.set(matchId, createSummary(matchId, match));
    }
  });

  predictions
    .filter(isValidPrediction)
    .forEach((prediction) => {
      const match = matches.get(prediction.matchId);
      if (!isMatchPredictionSummaryPublic(match, now)) return;

      const choice = matchOutcome(
        Number(prediction.homeScore),
        Number(prediction.awayScore)
      );
      const participant = participantFrom(usersByUid, prediction.uid);
      const finished = isFinishedWithScore(match);
      const score = finished
        ? scorePrediction(prediction, match)
        : { points: 0, type: "pending" };
      const summary = summaries.get(prediction.matchId) || createSummary(prediction.matchId, match, prediction);

      summary.totalPredictions += 1;
      if (choice === "home") summary.homeWinPredictions += 1;
      else if (choice === "away") summary.awayWinPredictions += 1;
      else summary.drawPredictions += 1;

      summary.predictions.push({
        uid: prediction.uid,
        displayName: participant.displayName,
        photoURL: participant.photoURL,
        homeScore: Number(prediction.homeScore),
        awayScore: Number(prediction.awayScore),
        choice,
        choiceLabel: buildChoiceLabel(choice, match, prediction),
        points: score.points,
        type: score.type
      });
      summaries.set(prediction.matchId, summary);
    });

  summaries.forEach((summary) => {
    summary.predictions.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "pt-BR")
      || a.uid.localeCompare(b.uid)
    );
  });

  return summaries;
}
