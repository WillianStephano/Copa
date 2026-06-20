export const APP_TIME_ZONE = "America/Sao_Paulo";
export const MATCH_DAY_CUTOFF_HOUR = 6;

function zonedDateParts(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
}

function matchDayKey(value, timeZone, cutoffHour = MATCH_DAY_CUTOFF_HOUR) {
  const parts = zonedDateParts(value, timeZone);
  if (!parts) return null;

  const localDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (parts.hour < cutoffHour) {
    localDay.setUTCDate(localDay.getUTCDate() - 1);
  }

  return localDay.toISOString().slice(0, 10);
}

export function isMatchToday(
  match,
  now = new Date(),
  timeZone = APP_TIME_ZONE,
  cutoffHour = MATCH_DAY_CUTOFF_HOUR
) {
  if (!match?.kickoffDate) return false;
  return matchDayKey(match.kickoffDate, timeZone, cutoffHour)
    === matchDayKey(now, timeZone, cutoffHour);
}
