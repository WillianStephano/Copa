export const APP_TIME_ZONE = "America/Sao_Paulo";

function dateKey(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function isMatchToday(match, now = new Date(), timeZone = APP_TIME_ZONE) {
  if (!match?.kickoffDate) return false;
  return dateKey(match.kickoffDate, timeZone) === dateKey(now, timeZone);
}
