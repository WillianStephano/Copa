import { isMatchToday } from "./match-date.js";

export function buildDailyRanking(ranking, officialMatches, now = new Date()) {
  return ranking
    .map((entry) => {
      const details = Array.isArray(entry.details) ? entry.details : [];
      const todayDetails = details.filter((detail) => {
        const match = officialMatches?.[detail.matchId];
        return match?.status === "FINISHED" && isMatchToday(match, now);
      });

      const summary = todayDetails.reduce((total, detail) => ({
        points: total.points + (Number(detail.points) || 0),
        exactHits: total.exactHits + (detail.type === "exact" ? 1 : 0),
        outcomeHits: total.outcomeHits + (detail.type === "outcome" ? 1 : 0),
        misses: total.misses + (detail.type === "miss" ? 1 : 0)
      }), {
        points: 0,
        exactHits: 0,
        outcomeHits: 0,
        misses: 0
      });

      return {
        uid: entry.uid,
        displayName: entry.displayName || "Participante",
        photoURL: entry.photoURL || "",
        matches: todayDetails.length,
        ...summary
      };
    })
    .filter((entry) => entry.matches > 0)
    .sort((a, b) =>
      b.points - a.points
      || b.exactHits - a.exactHits
      || b.outcomeHits - a.outcomeHits
      || a.displayName.localeCompare(b.displayName, "pt-BR")
    );
}
