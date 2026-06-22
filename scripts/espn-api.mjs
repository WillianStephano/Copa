import { canonicalTeam, findLocalMatch, matchPairKey } from "./worldcup-api.mjs";

export const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
export const ESPN_GROUP_STAGE_DATES = "20260611-20260628";

const FINISHED_STATES = new Set(["post"]);
const LIVE_STATES = new Set(["in"]);

function parseIntegerScore(value, status) {
  if (status === "SCHEDULED") return null;
  const score = Number(value);
  return Number.isInteger(score) && score >= 0 ? score : null;
}

function getCompetition(event) {
  return Array.isArray(event?.competitions) ? event.competitions[0] : null;
}

function getCompetitor(competition, homeAway) {
  return competition?.competitors?.find((competitor) => competitor.homeAway === homeAway) || null;
}

export function getEspnMatchStatus(event) {
  const type = event?.status?.type || getCompetition(event)?.status?.type || {};
  if (type.completed || FINISHED_STATES.has(String(type.state || "").toLowerCase())) {
    return "FINISHED";
  }
  if (LIVE_STATES.has(String(type.state || "").toLowerCase())) {
    return "IN_PLAY";
  }
  return "SCHEDULED";
}

export function mapEspnEvent(event) {
  const competition = getCompetition(event);
  const homeCompetitor = getCompetitor(competition, "home");
  const awayCompetitor = getCompetitor(competition, "away");
  const home = canonicalTeam(homeCompetitor?.team?.displayName || homeCompetitor?.team?.name);
  const away = canonicalTeam(awayCompetitor?.team?.displayName || awayCompetitor?.team?.name);
  if (!home || !away) return null;

  const local = findLocalMatch(home, away);
  const kickoff = new Date(event?.date || competition?.date);
  if (!local || Number.isNaN(kickoff.getTime())) return null;

  const status = getEspnMatchStatus(event);
  return {
    id: local.id,
    groupId: local.groupId,
    matchIndex: local.index,
    home: local.home,
    away: local.away,
    kickoff,
    lockAt: new Date(kickoff.getTime() - 30 * 60_000),
    status,
    homeScore: parseIntegerScore(homeCompetitor?.score, status),
    awayScore: parseIntegerScore(awayCompetitor?.score, status),
    source: "espn",
    sourceMatchId: String(event.id),
    sourcePairKey: matchPairKey(home, away)
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function fetchEspnEvents({
  dates = ESPN_GROUP_STAGE_DATES,
  fetchImplementation = fetch,
  attempts = 4,
  baseDelayMs = 2_000
} = {}) {
  const url = new URL(ESPN_SCOREBOARD_URL);
  url.searchParams.set("dates", dates);
  url.searchParams.set("limit", "200");

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImplementation(url);
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        return Array.isArray(payload.events) ? payload.events : [];
      }

      const message = `ESPN respondeu ${response.status}: ${JSON.stringify(payload)}`;
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
        `Falha ao consultar ESPN (tentativa ${attempt}/${attempts}). Nova tentativa em ${delay / 1000}s.`
      );
      await wait(delay);
    }
  }

  throw new Error(
    `Nao foi possivel consultar a ESPN apos ${attempts} tentativas.`,
    { cause: lastError }
  );
}
