import { FieldValue } from "firebase-admin/firestore";
import { buildMatchPredictionSummaries } from "../js/match-prediction-summaries.js";
import { buildRanking, buildRankingDetails } from "../js/ranking.js";

export async function updateRanking(db) {
  const [
    usersSnapshot,
    predictionsSnapshot,
    matchesSnapshot,
    existingRankingSnapshot,
    existingSummarySnapshot
  ] = await Promise.all([
    db.collection("users").get(),
    db.collection("predictions").get(),
    db.collection("matches").get(),
    db.collection("rankings").get(),
    db.collection("matchPredictionSummaries").get()
  ]);

  const users = usersSnapshot.docs.map((item) => ({
    ...item.data(),
    uid: item.data().uid || item.id
  }));
  const predictions = predictionsSnapshot.docs
    .map((item) => item.data())
    .filter((prediction) => prediction.uid && prediction.matchId);
  const matches = new Map(
    matchesSnapshot.docs.map((item) => [item.id, item.data()])
  );
  const ranking = buildRanking(users, predictions, matches);
  const details = buildRankingDetails(predictions, matches);
  const matchSummaries = buildMatchPredictionSummaries(users, predictions, matches);

  for (let offset = 0; offset < ranking.length; offset += 400) {
    const batch = db.batch();
    ranking.slice(offset, offset + 400).forEach((entry) => {
      batch.set(db.collection("rankings").doc(entry.uid), {
        ...entry,
        details: details.get(entry.uid) || [],
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
  }

  const activeUids = new Set(ranking.map((entry) => entry.uid));
  const staleDocuments = existingRankingSnapshot.docs.filter(
    (item) => !activeUids.has(item.id)
  );

  for (let offset = 0; offset < staleDocuments.length; offset += 400) {
    const batch = db.batch();
    staleDocuments.slice(offset, offset + 400).forEach((item) => {
      batch.delete(item.ref);
    });
    await batch.commit();
  }

  for (let offset = 0; offset < matchSummaries.size; offset += 400) {
    const batch = db.batch();
    Array.from(matchSummaries.values()).slice(offset, offset + 400).forEach((summary) => {
      batch.set(db.collection("matchPredictionSummaries").doc(summary.matchId), {
        ...summary,
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
  }

  const activeSummaryIds = new Set(matchSummaries.keys());
  const staleSummaries = existingSummarySnapshot.docs.filter(
    (item) => !activeSummaryIds.has(item.id)
  );

  for (let offset = 0; offset < staleSummaries.length; offset += 400) {
    const batch = db.batch();
    staleSummaries.slice(offset, offset + 400).forEach((item) => {
      batch.delete(item.ref);
    });
    await batch.commit();
  }

  return ranking;
}
