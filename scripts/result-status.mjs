export const STALE_IN_PLAY_FINALIZE_MS = 2.75 * 60 * 60_000;

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasScore(match) {
  return Number.isInteger(Number(match?.homeScore))
    && Number.isInteger(Number(match?.awayScore));
}

export function shouldFinalizeStaleInPlay(match, now = new Date()) {
  if (match?.status !== "IN_PLAY" || !hasScore(match)) return false;

  const kickoff = toDate(match.kickoffAt || match.kickoffDate || match.kickoff);
  if (!kickoff) return false;

  return now.getTime() - kickoff.getTime() >= STALE_IN_PLAY_FINALIZE_MS;
}

export function normalizeResultStatus(match, now = new Date()) {
  if (!shouldFinalizeStaleInPlay(match, now)) return match;

  return {
    ...match,
    status: "FINISHED",
    finalizedByFallback: true
  };
}
