import { STORAGE_PREFIX, groups } from "./data.js";

export function scoreKey(groupId, matchIndex, side) {
  return `${STORAGE_PREFIX}score:${groupId}:${matchIndex}:${side}`;
}

export function getScore(groupId, matchIndex, side) {
  return localStorage.getItem(scoreKey(groupId, matchIndex, side)) || "";
}

export function setScore(groupId, matchIndex, side, value) {
  const key = scoreKey(groupId, matchIndex, side);
  if (value === "") {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, value);
}

export function clearScores() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${STORAGE_PREFIX}score:`)) {
      keys.push(key);
    }
  }

  keys.forEach((key) => localStorage.removeItem(key));
}

export function allGroupIds() {
  return Object.keys(groups);
}

export function allMatches() {
  return allGroupIds().flatMap((groupId) =>
    groups[groupId].matches.map((match, index) => ({ groupId, index, match }))
  );
}
