import { FieldValue } from "firebase-admin/firestore";
import { buildRanking } from "../js/ranking.js";

export async function updateRanking(db) {
  const [usersSnapshot, predictionsSnapshot, matchesSnapshot] = await Promise.all([
    db.collection("users").get(),
    db.collection("predictions").get(),
    db.collection("matches").get()
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

  for (let offset = 0; offset < ranking.length; offset += 400) {
    const batch = db.batch();
    ranking.slice(offset, offset + 400).forEach((entry) => {
      batch.set(db.collection("rankings").doc(entry.uid), {
        ...entry,
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
  }

  return ranking;
}
