import test from "node:test";
import assert from "node:assert/strict";
import {
  matchNeedsActiveSync,
  matchNeedsStaleRecheck,
  shouldSyncResults
} from "../scripts/sync-policy.mjs";

test("sincroniza quando nao ha agenda local", () => {
  assert.deepEqual(shouldSyncResults([]), {
    shouldSync: true,
    reason: "seed-empty-schedule"
  });
});

test("sincroniza jogo em janela ativa", () => {
  const now = new Date("2026-06-20T20:00:00.000Z");

  assert.equal(
    matchNeedsActiveSync({
      status: "SCHEDULED",
      kickoffAt: new Date("2026-06-20T20:10:00.000Z")
    }, now),
    true
  );
  assert.deepEqual(
    shouldSyncResults([{
      status: "IN_PLAY",
      kickoffAt: new Date("2026-06-20T18:30:00.000Z")
    }], now),
    { shouldSync: true, reason: "active-match-window" }
  );
});

test("nao sincroniza jogo encerrado nem agenda distante", () => {
  const now = new Date("2026-06-20T20:00:00.000Z");

  assert.equal(
    matchNeedsActiveSync({
      status: "FINISHED",
      kickoffAt: new Date("2026-06-20T19:00:00.000Z")
    }, now),
    false
  );
  assert.deepEqual(
    shouldSyncResults([{
      status: "SCHEDULED",
      kickoffAt: new Date("2026-06-22T19:00:00.000Z")
    }], now),
    { shouldSync: false, reason: "outside-match-window" }
  );
});

test("reconsulta jogo antigo nao finalizado somente no inicio da hora", () => {
  const match = {
    status: "SCHEDULED",
    kickoffAt: new Date("2026-06-20T12:00:00.000Z")
  };

  assert.equal(matchNeedsStaleRecheck(match, new Date("2026-06-20T18:03:00.000Z")), true);
  assert.equal(matchNeedsStaleRecheck(match, new Date("2026-06-20T18:20:00.000Z")), false);
});
