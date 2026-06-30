import { readFile } from "node:fs/promises";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { roundOf32Matches } from "../js/knockout.js";
import { fetchEspnEvents, mapEspnEvent } from "./espn-api.mjs";
import { normalizeResultStatus } from "./result-status.mjs";
import { updateRanking } from "./admin-ranking.mjs";
import { fetchOfficialMatches, mapApiMatches } from "./worldcup-api.mjs";

const HELP = `
Uso:
  npm run admin:sync-results -- --service-account CAMINHO

Opcional:
  --source worldcup26
  --source espn
  --source all
`;

function parseArgs(args) {
  const options = { source: "all" };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = args[index + 1] && !args[index + 1].startsWith("--")
      ? args[index + 1]
      : "true";
    options[key] = value;
    if (value !== "true") index += 1;
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

  try {
    return JSON.parse(credentialsJson);
  } catch {
    throw new Error("A credencial informada nao contem um JSON valido.");
  }
}

function mergeMappedMatches(sourceResults) {
  const mergedById = new Map();

  sourceResults.forEach(({ source, matches }) => {
    matches.forEach((match) => {
      const previous = mergedById.get(match.id) || {};
      mergedById.set(match.id, {
        ...previous,
        ...match,
        source
      });
    });
  });

  return Array.from(mergedById.values());
}

async function fetchMappedMatches(source) {
  const results = [];

  if (source === "all" || source === "worldcup26") {
    const officialMatches = await fetchOfficialMatches();
    results.push({ source: "worldcup26.ir", matches: mapApiMatches(officialMatches) });
  }

  if (source === "all" || source === "espn") {
    const espnEvents = await fetchEspnEvents();
    results.push({ source: "espn", matches: espnEvents.map(mapEspnEvent).filter(Boolean) });
  }

  const nonEmptyResults = results.filter((item) => item.matches.length);
  if (!nonEmptyResults.length) {
    throw new Error("Nenhuma fonte retornou jogos mapeados.");
  }

  return {
    mapped: mergeMappedMatches(nonEmptyResults),
    sourcesUsed: nonEmptyResults.map((item) => item.source)
  };
}

async function syncMatches(db, mappedMatches) {
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

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(HELP.trim());
  process.exit(0);
}

if (!["all", "worldcup26", "espn"].includes(options.source)) {
  throw new Error(`Fonte invalida: ${options.source}\n${HELP}`);
}

const serviceAccount = await loadServiceAccount(options["service-account"]);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

await syncMatches(db, roundOf32Matches);
const { mapped, sourcesUsed } = await fetchMappedMatches(options.source);
const syncedMatches = await syncMatches(db, mapped);
const ranking = await updateRanking(db);

const finishedKnockout = syncedMatches
  .filter((match) => match.phase === "knockout" && match.status === "FINISHED")
  .map((match) => ({
    id: match.id,
    jogo: `${match.home} x ${match.away}`,
    placar: `${match.homeScore} x ${match.awayScore}`,
    classificado: match.qualifiedTeamId || "-"
  }));

console.log(`Fontes usadas: ${sourcesUsed.join(", ")}.`);
console.log(`${syncedMatches.length} jogos sincronizados.`);
console.log(`${ranking.length} usuarios ranqueados.`);
if (finishedKnockout.length) console.table(finishedKnockout);
