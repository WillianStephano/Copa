import { groups } from "./data.js";
import { allGroupIds, getScore } from "./storage.js";

function compareTeams(a, b) {
  return b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team, "pt-BR");
}

export function calculateStandings() {
  const standings = {};

  allGroupIds().forEach((groupId) => {
    const group = groups[groupId];
    const rows = {};

    group.teams.forEach((team) => {
      rows[team] = {
        team,
        points: 0,
        played: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0
      };
    });

    group.matches.forEach(([_, home, away], index) => {
      const homeScore = getScore(groupId, index, "home");
      const awayScore = getScore(groupId, index, "away");

      if (homeScore === "" || awayScore === "") return;

      const homeGoals = Number(homeScore);
      const awayGoals = Number(awayScore);
      if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) return;

      const homeRow = rows[home];
      const awayRow = rows[away];

      homeRow.played += 1;
      awayRow.played += 1;
      homeRow.goalsFor += homeGoals;
      awayRow.goalsFor += awayGoals;
      homeRow.goalsAgainst += awayGoals;
      awayRow.goalsAgainst += homeGoals;
      homeRow.goalDiff += homeGoals - awayGoals;
      awayRow.goalDiff += awayGoals - homeGoals;

      if (homeGoals > awayGoals) {
        homeRow.points += 3;
      } else if (awayGoals > homeGoals) {
        awayRow.points += 3;
      } else {
        homeRow.points += 1;
        awayRow.points += 1;
      }
    });

    standings[groupId] = Object.values(rows).sort(compareTeams);
  });

  return standings;
}

