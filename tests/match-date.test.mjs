import test from "node:test";
import assert from "node:assert/strict";
import { isMatchToday } from "../js/match-date.js";

test("identifica jogo de hoje no horário de Brasília", () => {
  const now = new Date("2026-06-14T15:00:00.000Z");

  assert.equal(
    isMatchToday(
      { kickoffDate: new Date("2026-06-15T01:30:00.000Z") },
      now
    ),
    true
  );
  assert.equal(
    isMatchToday(
      { kickoffDate: new Date("2026-06-15T03:30:00.000Z") },
      now
    ),
    true
  );
  assert.equal(
    isMatchToday(
      { kickoffDate: new Date("2026-06-15T09:30:00.000Z") },
      now
    ),
    false
  );
});

test("partida da madrugada deixa de ser hoje depois do corte operacional", () => {
  const now = new Date("2026-06-15T13:00:00.000Z");

  assert.equal(
    isMatchToday(
      { kickoffDate: new Date("2026-06-15T03:30:00.000Z") },
      now
    ),
    false
  );
});

test("ignora partida sem horário oficial válido", () => {
  assert.equal(isMatchToday(null), false);
  assert.equal(isMatchToday({ kickoffDate: "inválido" }), false);
});
