import { groups } from "../js/data.js";
import { findKnockoutMatchBySourceMatchNumber } from "../js/knockout.js";

export const WORLDCUP_API_URL = "https://worldcup26.ir/get/games";

const STADIUM_UTC_OFFSETS = {
  1: -6,
  2: -6,
  3: -6,
  4: -5,
  5: -5,
  6: -5,
  7: -4,
  8: -4,
  9: -4,
  10: -4,
  11: -4,
  12: -4,
  13: -7,
  14: -7,
  15: -7,
  16: -7
};

const TEAM_ALIASES = {
  southafrica: "africadosul",
  southkorea: "coreiadosul",
  korearepublic: "coreiadosul",
  czechrepublic: "tchequia",
  czechia: "tchequia",
  bosniaherzegovina: "bosnia",
  bosniaandherzegovina: "bosnia",
  qatar: "catar",
  switzerland: "suica",
  brazil: "brasil",
  morocco: "marrocos",
  scotland: "escocia",
  unitedstates: "estadosunidos",
  paraguay: "paraguai",
  turkey: "turquia",
  turkiye: "turquia",
  germany: "alemanha",
  ivorycoast: "costadomarfim",
  cotedivoire: "costadomarfim",
  ecuador: "equador",
  netherlands: "holanda",
  japan: "japao",
  sweden: "suecia",
  belgium: "belgica",
  egypt: "egito",
  iran: "ira",
  newzealand: "novazelandia",
  spain: "espanha",
  capeverde: "caboverde",
  saudiarabia: "arabiasaudita",
  uruguay: "uruguai",
  france: "franca",
  iraq: "iraque",
  norway: "noruega",
  algeria: "argelia",
  jordan: "jordania",
  drcongo: "rdcongo",
  democraticrepublicofthecongo: "rdcongo",
  congodr: "rdcongo",
  uzbekistan: "uzbequistao",
  england: "inglaterra",
  croatia: "croacia",
  ghana: "gana"
};

export function normalizeTeamName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

const localTeamByKey = new Map(
  Object.values(groups)
    .flatMap((group) => group.teams)
    .map((team) => [normalizeTeamName(team), team])
);

const localMatches = new Map();
Object.entries(groups).forEach(([groupId, group]) => {
  group.matches.forEach(([date, home, away], index) => {
    localMatches.set(matchPairKey(home, away), {
      id: `${groupId}-${index}`,
      groupId,
      index,
      date,
      home,
      away
    });
  });
});

export function findLocalMatch(home, away) {
  return localMatches.get(matchPairKey(home, away)) || null;
}

export function canonicalTeam(apiName) {
  const apiKey = normalizeTeamName(apiName);
  return localTeamByKey.get(TEAM_ALIASES[apiKey] || apiKey) || null;
}

export function matchPairKey(home, away) {
  return [normalizeTeamName(home), normalizeTeamName(away)].sort().join(":");
}

export function parseStadiumLocalDate(localDate, stadiumId) {
  const match = String(localDate ?? "").match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/
  );
  const utcOffset = STADIUM_UTC_OFFSETS[Number(stadiumId)];

  if (!match || !Number.isFinite(utcOffset)) return null;

  const [, month, day, year, hour, minute] = match.map(Number);
  const kickoff = new Date(
    Date.UTC(year, month - 1, day, hour - utcOffset, minute)
  );

  return Number.isNaN(kickoff.getTime()) ? null : kickoff;
}

export function getApiMatchStatus(apiMatch) {
  const elapsed = String(apiMatch.time_elapsed ?? "").toLowerCase();
  if (String(apiMatch.finished).toUpperCase() === "TRUE" || elapsed === "finished") {
    return "FINISHED";
  }
  if (elapsed && elapsed !== "notstarted" && elapsed !== "not started") {
    return "IN_PLAY";
  }
  return "SCHEDULED";
}

function parseScore(value, status) {
  if (status === "SCHEDULED") return null;
  const score = Number(value);
  return Number.isInteger(score) && score >= 0 ? score : null;
}

function winnerReferenceMatchNumber(label) {
  const match = String(label ?? "").match(/winner\s+match\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function buildQualifiedTeamsBySourceMatchNumber(apiMatches) {
  const qualifiedByMatchNumber = new Map();

  apiMatches.forEach((apiMatch) => {
    const homeTeam = canonicalTeam(apiMatch.home_team_name_en);
    const awayTeam = canonicalTeam(apiMatch.away_team_name_en);
    const homeWinnerRef = winnerReferenceMatchNumber(apiMatch.home_team_label);
    const awayWinnerRef = winnerReferenceMatchNumber(apiMatch.away_team_label);

    if (homeWinnerRef && homeTeam) qualifiedByMatchNumber.set(homeWinnerRef, homeTeam);
    if (awayWinnerRef && awayTeam) qualifiedByMatchNumber.set(awayWinnerRef, awayTeam);
  });

  return qualifiedByMatchNumber;
}

function inferKnockoutQualifiedTeam(apiMatch, home, away, qualifiedByMatchNumber) {
  const sourceMatchNumber = Number(apiMatch.id);
  if (qualifiedByMatchNumber.has(sourceMatchNumber)) {
    return qualifiedByMatchNumber.get(sourceMatchNumber);
  }

  const status = getApiMatchStatus(apiMatch);
  if (status !== "FINISHED") return "";

  const homeScore = parseScore(apiMatch.home_score, status);
  const awayScore = parseScore(apiMatch.away_score, status);
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore === awayScore) {
    return "";
  }

  return homeScore > awayScore ? home : away;
}

function mapKnockoutApiMatch(apiMatch, kickoff, qualifiedByMatchNumber) {
  const sourceMatchNumber = Number(apiMatch.id);
  const local = findKnockoutMatchBySourceMatchNumber(sourceMatchNumber);
  if (!local || !kickoff) return null;

  const status = getApiMatchStatus(apiMatch);
  const homeTeam = canonicalTeam(apiMatch.home_team_name_en);
  const awayTeam = canonicalTeam(apiMatch.away_team_name_en);
  const home = homeTeam || apiMatch.home_team_label || local.home || local.homePlaceholder || "A definir";
  const away = awayTeam || apiMatch.away_team_label || local.away || local.awayPlaceholder || "A definir";

  return {
    id: local.id,
    phase: "knockout",
    stage: local.stage,
    stageTitle: local.stageTitle,
    matchNumber: local.matchNumber,
    sourceMatchNumber,
    home,
    away,
    homePlaceholder: homeTeam ? "" : (apiMatch.home_team_label || local.homePlaceholder || ""),
    awayPlaceholder: awayTeam ? "" : (apiMatch.away_team_label || local.awayPlaceholder || ""),
    kickoff,
    lockAt: new Date(kickoff.getTime() - 30 * 60_000),
    status,
    homeScore: parseScore(apiMatch.home_score, status),
    awayScore: parseScore(apiMatch.away_score, status),
    qualifiedTeamId: inferKnockoutQualifiedTeam(apiMatch, home, away, qualifiedByMatchNumber),
    source: "worldcup26.ir",
    sourceMatchId: String(apiMatch.id)
  };
}

export function mapApiMatch(apiMatch, context = {}) {
  const kickoff = parseStadiumLocalDate(apiMatch.local_date, apiMatch.stadium_id);
  if (!kickoff) return null;

  if (apiMatch.type === "group") {
    const home = canonicalTeam(apiMatch.home_team_name_en);
    const away = canonicalTeam(apiMatch.away_team_name_en);
    if (!home || !away) return null;

    const local = localMatches.get(matchPairKey(home, away));
    if (!local) return null;

    const status = getApiMatchStatus(apiMatch);
    return {
      id: local.id,
      groupId: local.groupId,
      matchIndex: local.index,
      home: local.home,
      away: local.away,
      kickoff,
      lockAt: new Date(kickoff.getTime() - 30 * 60_000),
      status,
      homeScore: parseScore(apiMatch.home_score, status),
      awayScore: parseScore(apiMatch.away_score, status),
      source: "worldcup26.ir",
      sourceMatchId: String(apiMatch.id)
    };
  }

  return mapKnockoutApiMatch(
    apiMatch,
    kickoff,
    context.qualifiedByMatchNumber || new Map()
  );
}

export function mapApiMatches(apiMatches) {
  const qualifiedByMatchNumber = buildQualifiedTeamsBySourceMatchNumber(apiMatches);
  return apiMatches
    .map((apiMatch) => mapApiMatch(apiMatch, { qualifiedByMatchNumber }))
    .filter(Boolean);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function fetchOfficialMatches(
  fetchImplementation = fetch,
  { attempts = 5, baseDelayMs = 2_000 } = {}
) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImplementation(WORLDCUP_API_URL);
      if (response.ok) {
        const payload = await response.json();
        return Array.isArray(payload.games) ? payload.games : [];
      }

      const message = `worldcup26.ir respondeu ${response.status}: ${await response.text()}`;
      if (response.status < 500 && response.status !== 429) {
        throw new Error(message);
      }
      lastError = new Error(message);
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts) {
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `Falha ao consultar resultados (tentativa ${attempt}/${attempts}). Nova tentativa em ${delay / 1000}s.`
      );
      await wait(delay);
    }
  }

  throw new Error(
    `Não foi possível consultar os resultados após ${attempts} tentativas.`,
    { cause: lastError }
  );
}
