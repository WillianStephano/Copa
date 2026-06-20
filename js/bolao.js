import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { isPredictionLocked } from "./scoring.js";

export function matchId(groupId, index) {
  return `${groupId}-${index}`;
}

function timestampToDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  return new Date(value);
}

function snapshotToMap(snapshot, key = "id") {
  return Object.fromEntries(snapshot.docs.map((item) => {
    const data = item.data();
    return [data[key] || item.id, { id: item.id, ...data }];
  }));
}

export function subscribeToOfficialMatches(callback, onError) {
  return onSnapshot(
    collection(db, "matches"),
    (snapshot) => {
      const matches = snapshotToMap(snapshot);
      Object.values(matches).forEach((match) => {
        match.kickoffDate = timestampToDate(match.kickoffAt);
        match.lockDate = timestampToDate(match.lockAt);
      });
      callback(matches);
    },
    onError
  );
}

export function subscribeToPredictions(uid, callback, onError) {
  const predictionsQuery = query(collection(db, "predictions"), where("uid", "==", uid));
  return onSnapshot(
    predictionsQuery,
    (snapshot) => callback(snapshotToMap(snapshot, "matchId")),
    onError
  );
}

export function subscribeToRanking(callback, onError) {
  const rankingQuery = query(collection(db, "rankings"), orderBy("position", "asc"));
  return onSnapshot(
    rankingQuery,
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export function subscribeToMatchPredictionSummaries(callback, onError) {
  return onSnapshot(
    collection(db, "matchPredictionSummaries"),
    (snapshot) => callback(snapshotToMap(snapshot, "matchId")),
    onError
  );
}

export function subscribeToSyncStatus(callback, onError) {
  return onSnapshot(
    doc(db, "syncStatus", "results"),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const data = snapshot.data();
      callback({
        id: snapshot.id,
        ...data,
        updatedAt: timestampToDate(data.updatedAt),
        checkedAt: timestampToDate(data.checkedAt),
        lastSuccessfulAt: timestampToDate(data.lastSuccessfulAt),
        lastFailedAt: timestampToDate(data.lastFailedAt)
      });
    },
    onError
  );
}

export async function confirmPrediction({ user, officialMatch, groupId, index, home, away, homeScore, awayScore }) {
  if (!user) throw new Error("Faça login para confirmar o palpite.");
  if (!officialMatch?.kickoffDate) throw new Error("O horário oficial deste jogo ainda não foi sincronizado.");
  if (isPredictionLocked(officialMatch.kickoffDate)) {
    throw new Error("O prazo para alterar este palpite já encerrou.");
  }

  const parsedHome = Number(homeScore);
  const parsedAway = Number(awayScore);
  if (![parsedHome, parsedAway].every((score) => Number.isInteger(score) && score >= 0 && score <= 99)) {
    throw new Error("Preencha os dois placares antes de confirmar.");
  }

  const id = matchId(groupId, index);
  await setDoc(doc(db, "predictions", `${user.uid}_${id}`), {
    uid: user.uid,
    matchId: id,
    groupId,
    matchIndex: Number(index),
    home,
    away,
    homeScore: parsedHome,
    awayScore: parsedAway,
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
