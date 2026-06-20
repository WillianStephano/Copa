import { canonicalTeam, findLocalMatch, matchPairKey } from "./worldcup-api.mjs";

export const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";
export const API_FOOTBALL_DEFAULT_LEAGUE_ID = 1;
export const API_FOOTBALL_DEFAULT_SEASON = 2026;

const FINISHED_STATUS = new Set(["FT", "AET", "PEN"]);
const LIVE_STATUS = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
const SCHEDULED_STATUS = new Set(["TBD", "NS"]);

function parseIntegerScore(value) {
  const score = Number(value);
  return Number.isInteger(score) && score >= 0 ? score : null;
}

export function getApiFootballStatus(fixture) {
  const short = String(fixture?.fixture?.status?.short ?? "").toUpperCase();
  if (FINISHED_STATUS.has(short)) return "FINISHED";
  if (LIVE_STATUS.has(short)) return "IN_PLAY";
  if (SCHEDULED_STATUS.has(short)) return "SCHEDULED";
  return "SCHEDULED";
}

export function mapApiFootballFixture(fixture) {
  const home = canonicalTeam(fixture?.teams?.home?.name);
  const away = canonicalTeam(fixture?.teams?.away?.name);
  if (!home || !away) return null;

  const local = findLocalMatch(home, away);
  const kickoff = new Date(fixture?.fixture?.date);
  if (!local || Number.isNaN(kickoff.getTime())) return null;

  const status = getApiFootballStatus(fixture);
  const homeScore = status === "SCHEDULED"
    ? null
    : parseIntegerScore(fixture?.goals?.home ?? fixture?.score?.fulltime?.home);
  const awayScore = status === "SCHEDULED"
    ? null
    : parseIntegerScore(fixture?.goals?.away ?? fixture?.score?.fulltime?.away);

  return {
    id: local.id,
    groupId: local.groupId,
    matchIndex: local.index,
    home: local.home,
    away: local.away,
    kickoff,
    lockAt: new Date(kickoff.getTime() - 30 * 60_000),
    status,
    homeScore,
    awayScore,
    source: "api-football",
    sourceMatchId: String(fixture.fixture.id),
    sourcePairKey: matchPairKey(home, away)
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function fetchApiFootballFixtures({
  apiKey,
  fetchImplementation = fetch,
  leagueId = API_FOOTBALL_DEFAULT_LEAGUE_ID,
  season = API_FOOTBALL_DEFAULT_SEASON,
  attempts = 3,
  baseDelayMs = 2_000
} = {}) {
  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY ausente.");
  }

  const url = new URL("/fixtures", API_FOOTBALL_BASE_URL);
  url.searchParams.set("league", String(leagueId));
  url.searchParams.set("season", String(season));

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImplementation(url, {
        headers: { "x-apisports-key": apiKey }
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        if (Array.isArray(payload.errors) && payload.errors.length) {
          throw new Error(`API-Football retornou erro: ${payload.errors.join(", ")}`);
        }
        if (payload.errors && typeof payload.errors === "object" && Object.keys(payload.errors).length) {
          throw new Error(`API-Football retornou erro: ${JSON.stringify(payload.errors)}`);
        }
        return Array.isArray(payload.response) ? payload.response : [];
      }

      const message = `API-Football respondeu ${response.status}: ${JSON.stringify(payload)}`;
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
        `Falha ao consultar API-Football (tentativa ${attempt}/${attempts}). Nova tentativa em ${delay / 1000}s.`
      );
      await wait(delay);
    }
  }

  throw new Error(
    `Nao foi possivel consultar a API-Football apos ${attempts} tentativas.`,
    { cause: lastError }
  );
}
