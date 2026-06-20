export const ACTIVE_SYNC_BEFORE_MS = 15 * 60_000;
export const ACTIVE_SYNC_AFTER_MS = 4 * 60 * 60_000;
export const STALE_RECHECK_AFTER_MS = 4 * 60 * 60_000;
export const STALE_RECHECK_UNTIL_MS = 24 * 60 * 60_000;

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function matchNeedsActiveSync(match, now = new Date()) {
  if (!match || match.status === "FINISHED") return false;

  const kickoff = toDate(match.kickoffAt || match.kickoffDate || match.kickoff);
  if (!kickoff) return false;

  const delta = now.getTime() - kickoff.getTime();
  return delta >= -ACTIVE_SYNC_BEFORE_MS && delta <= ACTIVE_SYNC_AFTER_MS;
}

export function matchNeedsStaleRecheck(match, now = new Date()) {
  if (!match || match.status === "FINISHED") return false;

  const kickoff = toDate(match.kickoffAt || match.kickoffDate || match.kickoff);
  if (!kickoff) return false;

  const delta = now.getTime() - kickoff.getTime();
  if (delta < STALE_RECHECK_AFTER_MS || delta > STALE_RECHECK_UNTIL_MS) return false;

  // GitHub Actions already runs frequently; this keeps old unfinished games from
  // burning quota every five minutes while still retrying throughout the day.
  return now.getUTCMinutes() < 5;
}

export function shouldSyncResults(matches, now = new Date()) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return { shouldSync: true, reason: "seed-empty-schedule" };
  }

  if (matches.some((match) => matchNeedsActiveSync(match, now))) {
    return { shouldSync: true, reason: "active-match-window" };
  }

  if (matches.some((match) => matchNeedsStaleRecheck(match, now))) {
    return { shouldSync: true, reason: "stale-unfinished-match" };
  }

  return { shouldSync: false, reason: "outside-match-window" };
}
