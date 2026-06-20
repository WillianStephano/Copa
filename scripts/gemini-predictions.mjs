import { readFile } from "node:fs/promises";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { groups } from "../js/data.js";
import { isMatchToday } from "../js/match-date.js";
import { updateRanking } from "./admin-ranking.mjs";
import { generateGeminiText } from "./gemini-client.mjs";
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_BOT_NAME,
  GEMINI_BOT_UID,
  buildGeminiPredictionPrompt,
  parseGeminiPredictionResponse
} from "./gemini-prompt.mjs";

const HELP = `
Uso:
  npm run ai:predictions -- --service-account CAMINHO
  npm run ai:predictions -- --service-account CAMINHO --match D-3
  npm run ai:predictions -- --service-account CAMINHO --force

Variaveis:
  GEMINI_API_KEY obrigatoria
  GEMINI_MODEL opcional, padrao ${DEFAULT_GEMINI_MODEL}
`;

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--force" || token === "--dry-run" || token === "--help") {
      options[token.slice(2)] = true;
      continue;
    }
    if (!token.startsWith("--")) {
      throw new Error(`Argumento inesperado: ${token}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Informe um valor para ${token}.`);
    }
    options[token.slice(2)] = value;
    index += 1;
  }
  return options;
}

async function loadServiceAccount(path) {
  const credentialsJson = path
    ? await readFile(path, "utf8")
    : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!credentialsJson) {
    throw new Error("Informe --service-account CAMINHO ou defina FIREBASE_SERVICE_ACCOUNT_JSON.");
  }

  return JSON.parse(credentialsJson);
}

function timestampToDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localMatchFallback(matchId) {
  const [groupId, indexText] = matchId.split("-");
  const match = groups[groupId]?.matches[Number(indexText)];
  if (!match) return null;

  const [, home, away] = match;
  return {
    groupId,
    matchIndex: Number(indexText),
    home,
    away
  };
}

async function ensureBotUser(db) {
  await db.collection("users").doc(GEMINI_BOT_UID).set({
    uid: GEMINI_BOT_UID,
    displayName: GEMINI_BOT_NAME,
    email: "",
    photoURL: "",
    isBot: true,
    botProvider: "gemini",
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  }, { merge: true });
}

async function loadCandidateMatches(db, options) {
  if (options.match) {
    const snapshot = await db.collection("matches").doc(options.match).get();
    if (!snapshot.exists) throw new Error(`Jogo ${options.match} nao encontrado.`);
    return [{ id: snapshot.id, ...snapshot.data() }];
  }

  const snapshot = await db.collection("matches").get();
  const now = new Date();
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((match) => isMatchToday({ kickoffDate: timestampToDate(match.kickoffAt) }, now))
    .sort((a, b) => timestampToDate(a.kickoffAt) - timestampToDate(b.kickoffAt));
}

function isPredictionOpen(match, now = new Date()) {
  const lockAt = timestampToDate(match.lockAt);
  return Boolean(lockAt && now.getTime() < lockAt.getTime());
}

async function predictMatch(db, match, options) {
  if (!isPredictionOpen(match)) {
    return { matchId: match.id, skipped: true, reason: "locked" };
  }

  const predictionId = `${GEMINI_BOT_UID}_${match.id}`;
  const predictionReference = db.collection("predictions").doc(predictionId);
  const previousSnapshot = await predictionReference.get();
  if (previousSnapshot.exists && !options.force) {
    return { matchId: match.id, skipped: true, reason: "already-predicted" };
  }

  const fallback = localMatchFallback(match.id) || {};
  const home = match.home || fallback.home;
  const away = match.away || fallback.away;
  if (!home || !away) {
    return { matchId: match.id, skipped: true, reason: "missing-teams" };
  }

  const prompt = buildGeminiPredictionPrompt({ home, away });
  const text = await generateGeminiText({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    prompt
  });
  let parsedPrediction;
  try {
    parsedPrediction = parseGeminiPredictionResponse(text);
  } catch (error) {
    error.message = `${error.message} Resposta recebida: ${JSON.stringify(text).slice(0, 500)}`;
    throw error;
  }
  const { homeScore, awayScore } = parsedPrediction;

  if (options["dry-run"]) {
    return {
      matchId: match.id,
      home,
      away,
      homeScore,
      awayScore,
      dryRun: true
    };
  }

  await predictionReference.set({
    uid: GEMINI_BOT_UID,
    matchId: match.id,
    groupId: match.groupId || fallback.groupId,
    matchIndex: Number.isInteger(match.matchIndex) ? match.matchIndex : fallback.matchIndex,
    home,
    away,
    homeScore,
    awayScore,
    confirmedAt: previousSnapshot.exists
      ? previousSnapshot.data().confirmedAt || FieldValue.serverTimestamp()
      : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    isBotPrediction: true,
    botProvider: "gemini",
    botModel: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL
  });

  return { matchId: match.id, home, away, homeScore, awayScore, saved: true };
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(HELP.trim());
  process.exit(0);
}

const serviceAccount = await loadServiceAccount(options["service-account"]);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

await ensureBotUser(db);
const matches = await loadCandidateMatches(db, options);
if (!matches.length) {
  console.log("Nenhum jogo aberto encontrado para a IA palpitar.");
  process.exit(0);
}

const results = [];
for (const match of matches) {
  try {
    results.push(await predictMatch(db, match, options));
  } catch (error) {
    results.push({
      matchId: match.id,
      skipped: true,
      reason: "gemini-error",
      error: error.message
    });
  }
}

if (!options["dry-run"] && results.some((item) => item.saved)) {
  await updateRanking(db);
}

console.table(results.map((item) => ({
  jogo: item.matchId,
  palpite: item.home ? `${item.home} ${item.homeScore} x ${item.awayScore} ${item.away}` : "-",
  status: item.saved ? "salvo" : item.dryRun ? "simulado" : `ignorado: ${item.reason}`,
  erro: item.error || ""
})));

const fatalErrors = results.filter((item) => item.reason === "gemini-error");
if (fatalErrors.length === results.length) {
  throw new Error("Gemini falhou para todos os jogos candidatos.");
}
