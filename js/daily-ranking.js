import { isMatchToday } from "./match-date.js";
import { scorePrediction } from "./scoring.js";

function scoreDailyDetail(detail, match) {
  return scorePrediction(
    {
      homeScore: detail.predictedHomeScore,
      awayScore: detail.predictedAwayScore,
      qualifiedTeamId: detail.predictedQualifiedTeamId,
      home: detail.home,
      away: detail.away
    },
    match
  );
}

function isDailyExact(score) {
  return score.type === "exact" || score.type === "knockout-exact-qualified";
}

function isDailyOutcome(score) {
  return score.type === "outcome" || score.type === "knockout-qualified";
}

export function buildDailyRanking(ranking, officialMatches, now = new Date()) {
  return ranking
    .map((entry) => {
      const details = Array.isArray(entry.details) ? entry.details : [];
      const todayDetails = details.filter((detail) => {
        const match = officialMatches?.[detail.matchId];
        return match?.status === "FINISHED" && isMatchToday(match, now);
      });

      const summary = todayDetails.reduce((total, detail) => {
        const score = scoreDailyDetail(detail, officialMatches[detail.matchId]);
        return {
          points: total.points + score.points,
          exactHits: total.exactHits + (isDailyExact(score) ? 1 : 0),
          outcomeHits: total.outcomeHits + (isDailyOutcome(score) ? 1 : 0),
          misses: total.misses + (score.type === "miss" ? 1 : 0)
        };
      }, {
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
