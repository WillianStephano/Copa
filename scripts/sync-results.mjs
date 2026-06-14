import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { updateRanking } from "./admin-ranking.mjs";
import { fetchOfficialMatches, mapApiMatch } from "./worldcup-api.mjs";

const credentialsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!credentialsJson) {
  throw new Error(
    "Secret FIREBASE_SERVICE_ACCOUNT_JSON ausente. Cadastre-o em Settings > Secrets and variables > Actions no repositório WillianStephano/Copa."
  );
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(credentialsJson);
} catch {
  throw new Error(
    "Secret FIREBASE_SERVICE_ACCOUNT_JSON inválido. Cole o conteúdo JSON completo da chave do Firebase."
  );
}

initializeApp({ credential: cert(serviceAccount) });
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

const apiMatches = await fetchOfficialMatches();
const mappedMatches = await syncMatches(apiMatches);
const ranking = await updateRanking(db);

console.log(
  `Sincronização concluída: ${mappedMatches.length} jogos mapeados e ${ranking.length} usuários ranqueados.`
);
