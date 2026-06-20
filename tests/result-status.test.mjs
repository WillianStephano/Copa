import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeResultStatus,
  shouldFinalizeStaleInPlay
} from "../scripts/result-status.mjs";

test("finaliza partida IN_PLAY antiga quando ja tem placar", () => {
  const match = {
    status: "IN_PLAY",
    kickoff: new Date("2026-06-19T22:00:00.000Z"),
    homeScore: 0,
    awayScore: 1
  };
  const now = new Date("2026-06-20T01:00:00.000Z");

  assert.equal(shouldFinalizeStaleInPlay(match, now), true);
  assert.deepEqual(normalizeResultStatus(match, now), {
    ...match,
    status: "FINISHED",
    finalizedByFallback: true
  });
});

test("nao finaliza partida sem placar ou dentro da margem normal", () => {
  const now = new Date("2026-06-20T00:00:00.000Z");

  assert.equal(shouldFinalizeStaleInPlay({
    status: "IN_PLAY",
    kickoff: new Date("2026-06-19T22:00:00.000Z"),
    homeScore: 0,
    awayScore: null
  }, now), false);

  assert.equal(shouldFinalizeStaleInPlay({
    status: "IN_PLAY",
    kickoff: new Date("2026-06-19T22:00:00.000Z"),
    homeScore: 0,
    awayScore: 1
  }, now), false);
});
