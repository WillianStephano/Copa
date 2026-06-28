import { APP_TIME_ZONE, isMatchToday } from "./match-date.js";

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function buildTodayPredictionsMessage({
  predictions,
  officialMatches,
  displayName = "",
  now = new Date(),
  phase = null
}) {
  const todayMatches = Object.values(officialMatches)
    .filter((match) => {
      if (!phase) return true;
      if (phase === "group") return !match.phase || match.phase === "group";
      return match.phase === phase;
    })
    .filter((match) => isMatchToday(match, now))
    .sort((a, b) => a.kickoffDate - b.kickoffDate);

  const confirmed = todayMatches
    .map((match) => ({
      match,
      prediction: predictions[match.id]
    }))
    .filter(({ prediction }) => prediction);

  if (!confirmed.length) {
    return {
      text: "",
      confirmedCount: 0,
      todayCount: todayMatches.length,
      missingCount: todayMatches.length
    };
  }

  const owner = displayName ? ` de ${displayName}` : "";
  const phaseLabel = phase === "knockout" ? " do mata-mata" : "";
  const lines = [
    `Meus palpites${phaseLabel}${owner} - ${formatDate(now)}`,
    ""
  ];

  confirmed.forEach(({ match, prediction }) => {
    const qualified = prediction.qualifiedTeamId
      ? ` | passa ${prediction.qualifiedTeamId}`
      : "";
    lines.push(
      `${formatTime(match.kickoffDate)} | ${match.home} ${prediction.homeScore} x ${prediction.awayScore} ${match.away}${qualified}`
    );
  });

  const missingCount = todayMatches.length - confirmed.length;
  if (missingCount > 0) {
    lines.push(
      "",
      `${missingCount} jogo${missingCount === 1 ? "" : "s"} de hoje ainda sem palpite confirmado.`
    );
  }

  lines.push("", "Bolão Copa 2026");

  return {
    text: lines.join("\n"),
    confirmedCount: confirmed.length,
    todayCount: todayMatches.length,
    missingCount
  };
}
