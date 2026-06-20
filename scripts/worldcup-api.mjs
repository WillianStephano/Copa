import { groups } from "../js/data.js";

export const WORLDCUP_API_URL = "https://worldcup26.ir/get/games";

const STADIUM_UTC_OFFSETS = {
  1: -6,  // Mexico City
  2: -6,  // Guadalajara
  3: -6,  // Monterrey
  4: -5,  // Dallas
  5: -5,  // Houston
  6: -5,  // Kansas City
  7: -4,  // Atlanta
  8: -4,  // Miami
  9: -4,  // Boston
  10: -4, // Philadelphia
  11: -4, // New York/New Jersey
  12: -4, // Toronto
  13: -7, // Vancouver
  14: -7, // Seattle
  15: -7, // San Francisco Bay Area
  16: -7  // Los Angeles
};

const TEAM_ALIASES = {
  southafrica: "africadosul",
  southkorea: "coreiadosul",
  korearepublic: "coreiadosul",
  czechrepublic: "tchequia",
  czechia: "tchequia",
  bosniaandherzegovina: "bosnia",
  qatar: "catar",
  switzerland: "suica",
  brazil: "brasil",
  morocco: "marrocos",
  scotland: "escocia",
  unitedstates: "estadosunidos",
  paraguay: "paraguai",
  turkey: "turquia",
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

export function mapApiMatch(apiMatch) {
  if (apiMatch.type !== "group") return null;

  const home = canonicalTeam(apiMatch.home_team_name_en);
  const away = canonicalTeam(apiMatch.away_team_name_en);
  if (!home || !away) return null;

  const local = localMatches.get(matchPairKey(home, away));
  const kickoff = parseStadiumLocalDate(apiMatch.local_date, apiMatch.stadium_id);
  if (!local || !kickoff) return null;

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
