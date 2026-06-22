import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import {
  API_FOOTBALL_DEFAULT_LEAGUE_ID,
  API_FOOTBALL_DEFAULT_SEASON,
  fetchApiFootballFixtures,
  mapApiFootballFixture
} from "./api-football.mjs";
import { updateRanking } from "./admin-ranking.mjs";
import { fetchEspnEvents, mapEspnEvent } from "./espn-api.mjs";
import { normalizeResultStatus } from "./result-status.mjs";
import { shouldSyncResults } from "./sync-policy.mjs";
import { fetchOfficialMatches, mapApiMatch } from "./worldcup-api.mjs";

const credentialsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!credentialsJson) {
  throw new Error(
    "Secret FIREBASE_SERVICE_ACCOUNT_JSON ausente. Cadastre-o em Settings > Secrets and variables > Actions no repositorio WillianStephano/Copa."
  );
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(credentialsJson);
} catch {
  throw new Error(
    "Secret FIREBASE_SERVICE_ACCOUNT_JSON invalido. Cole o conteudo JSON completo da chave do Firebase."
  );
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function timestampToDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function loadStoredMatches() {
  const snapshot = await db.collection("matches").get();
  return snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      ...data,
      kickoffAt: timestampToDate(data.kickoffAt),
      lockAt: timestampToDate(data.lockAt)
    };
  });
}

async function syncMatches(mappedMatches) {
  const batch = db.batch();

  mappedMatches.forEach((mappedMatch) => {
    const normalizedMatch = normalizeResultStatus(mappedMatch);
    const { kickoff, lockAt, ...matchData } = normalizedMatch;
    const data = {
      kickoffAt: Timestamp.fromDate(kickoff),
      lockAt: Timestamp.fromDate(lockAt),
      ...matchData,
      syncedAt: FieldValue.serverTimestamp()
    };

    batch.set(db.collection("matches").doc(data.id), data, { merge: true });
  });

  if (mappedMatches.length) await batch.commit();
  return mappedMatches;
}

async function writeSyncStatus(data) {
  await db.collection("syncStatus").doc("results").set({
    ...data,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
}

async function fetchFromApiFootball(apiKey) {
  const fixtures = await fetchApiFootballFixtures({
    apiKey,
    leagueId: process.env.API_FOOTBALL_LEAGUE_ID || API_FOOTBALL_DEFAULT_LEAGUE_ID,
    season: process.env.API_FOOTBALL_SEASON || API_FOOTBALL_DEFAULT_SEASON
  });

  return fixtures.map(mapApiFootballFixture).filter(Boolean);
}

async function fetchFromWorldCup26() {
  const apiMatches = await fetchOfficialMatches();
  return apiMatches.map(mapApiMatch).filter(Boolean);
}

async function fetchFromEspn() {
  const events = await fetchEspnEvents();
  return events.map(mapEspnEvent).filter(Boolean);
}

async function fetchMappedMatches() {
  const attemptedSources = [];
  const apiFootballKey = process.env.API_FOOTBALL_KEY;
  const useApiFootball = process.env.ENABLE_API_FOOTBALL === "true";

  attemptedSources.push("espn");
  try {
    const mapped = await fetchFromEspn();
    if (mapped.length) {
      return { mapped, source: "espn", attemptedSources };
    }
    console.warn("ESPN respondeu, mas nenhum jogo foi mapeado.");
  } catch (error) {
    console.warn("ESPN falhou. Usando worldcup26.ir como fallback.", error);
  }

  if (useApiFootball && apiFootballKey) {
    attemptedSources.push("api-football");
    try {
      const mapped = await fetchFromApiFootball(apiFootballKey);
      if (mapped.length) {
        return { mapped, source: "api-football", attemptedSources };
      }
      console.warn("API-Football respondeu, mas nenhum jogo foi mapeado.");
    } catch (error) {
      console.warn("API-Football falhou. Usando worldcup26.ir como fallback.", error);
    }
  }

  attemptedSources.push("worldcup26.ir");
  const mapped = await fetchFromWorldCup26();
  return { mapped, source: "worldcup26.ir", attemptedSources };
}

const storedMatches = await loadStoredMatches();
const syncDecision = shouldSyncResults(storedMatches);

if (!syncDecision.shouldSync) {
  await writeSyncStatus({
    status: "skipped",
    reason: syncDecision.reason,
    message: "Fora da janela de jogos. Nenhuma consulta externa realizada.",
    checkedAt: FieldValue.serverTimestamp()
  });
  console.log(`Sincronizacao ignorada: ${syncDecision.reason}.`);
  process.exit(0);
}

try {
  const { mapped, source, attemptedSources } = await fetchMappedMatches();
  const mappedMatches = await syncMatches(mapped);
  const ranking = await updateRanking(db);

  await writeSyncStatus({
    status: "success",
    reason: syncDecision.reason,
    source,
    attemptedSources,
    mappedMatches: mappedMatches.length,
    rankedUsers: ranking.length,
    lastSuccessfulAt: FieldValue.serverTimestamp(),
    message: `Resultados atualizados via ${source}.`
  });

  console.log(
    `Sincronizacao concluida via ${source}: ${mappedMatches.length} jogos mapeados e ${ranking.length} usuarios ranqueados.`
  );
} catch (error) {
  await writeSyncStatus({
    status: "failed",
    reason: syncDecision.reason,
    lastFailedAt: FieldValue.serverTimestamp(),
    message: error.message || "Falha ao sincronizar resultados."
  });
  throw error;
}
