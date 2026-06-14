import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { buildRanking } from "../js/ranking.js";
import { fetchOfficialMatches, mapApiMatch } from "./worldcup-api.mjs";

const credentialsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const credential = credentialsJson
  ? cert(JSON.parse(credentialsJson))
  : applicationDefault();

initializeApp({ credential });
const db = getFirestore();

async function syncMatches(apiMatches) {
  const mapped = [];
  const batch = db.batch();

  apiMatches.forEach((apiMatch) => {
    const mappedMatch = mapApiMatch(apiMatch);
    if (!mappedMatch) return;

    const { kickoff, lockAt, ...matchData } = mappedMatch;
    const data = {
      kickoffAt: Timestamp.fromDate(kickoff),
      lockAt: Timestamp.fromDate(lockAt),
      ...matchData,
      syncedAt: FieldValue.serverTimestamp()
    };

    batch.set(db.collection("matches").doc(data.id), data, { merge: true });
    mapped.push(data);
  });

  if (mapped.length) await batch.commit();
  return mapped;
}

async function updateRanking() {
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
  const matches = new Map(matchesSnapshot.docs.map((item) => [item.id, item.data()]));
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

  return ranking.length;
}

const apiMatches = await fetchOfficialMatches();
const mappedMatches = await syncMatches(apiMatches);
const rankedUsers = await updateRanking();

console.log(
  `Sincronização concluída: ${mappedMatches.length} jogos mapeados e ${rankedUsers} usuários ranqueados.`
);
