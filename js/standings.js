import { groups } from "./data.js";
import { allGroupIds, getScore } from "./storage.js";

function compareTeams(a, b) {
  return b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team, "pt-BR");
}

function emptyStandings() {
  const standings = {};

  allGroupIds().forEach((groupId) => {
    const group = groups[groupId];
    standings[groupId] = Object.fromEntries(
      group.teams.map((team) => [team, {
        team,
        points: 0,
        played: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0
      }])
    );
  });

  return standings;
}

function applyMatch(rows, home, away, homeGoals, awayGoals) {
  if (![homeGoals, awayGoals].every(Number.isInteger)) return;
  if (homeGoals < 0 || awayGoals < 0 || !rows?.[home] || !rows?.[away]) return;

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
}

function sortStandings(standings) {
  return Object.fromEntries(
    Object.entries(standings).map(([groupId, rows]) => [
      groupId,
      Object.values(rows).sort(compareTeams)
    ])
  );
}

export function calculateStandings() {
  const standings = emptyStandings();

  allGroupIds().forEach((groupId) => {
    const group = groups[groupId];
    group.matches.forEach(([_, home, away], index) => {
      const homeScore = getScore(groupId, index, "home");
      const awayScore = getScore(groupId, index, "away");

      if (homeScore === "" || awayScore === "") return;
      applyMatch(
        standings[groupId],
        home,
        away,
        Number(homeScore),
        Number(awayScore)
      );
    });
  });

  return sortStandings(standings);
}

export function calculateOfficialStandings(officialMatches) {
  const standings = emptyStandings();

  Object.values(officialMatches).forEach((match) => {
    if (match.status !== "FINISHED") return;
    if (!Number.isInteger(match.homeScore) || !Number.isInteger(match.awayScore)) return;
    applyMatch(
      standings[match.groupId],
      match.home,
      match.away,
      Number(match.homeScore),
      Number(match.awayScore)
    );
  });

  return sortStandings(standings);
}
