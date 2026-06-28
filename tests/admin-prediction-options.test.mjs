import test from "node:test";
import assert from "node:assert/strict";
import {
  inferQualifiedTeam,
  parseAdminArgs,
  parseScore,
  requireSetOptions
} from "../scripts/admin-prediction-options.mjs";

test("interpreta argumentos da edição administrativa", () => {
  assert.deepEqual(
    parseAdminArgs([
      "set",
      "--email",
      "will@example.com",
      "--match",
      "A-0",
      "--score",
      "2x1"
    ]),
    {
      command: "set",
      options: {
        email: "will@example.com",
        match: "A-0",
        score: "2x1"
      }
    }
  );
});

test("valida e converte placar administrativo", () => {
  assert.deepEqual(parseScore("2x1"), { homeScore: 2, awayScore: 1 });
  assert.throws(() => parseScore("dois a um"), /formato 2x1/);
});

test("exige identificação, jogo, placar e justificativa", () => {
  assert.throws(() => requireSetOptions({}), /--email ou --uid/);
  assert.doesNotThrow(() => requireSetOptions({
    email: "will@example.com",
    match: "A-0",
    score: "2x1",
    reason: "Palpite informado antes da partida"
  }));
});

test("valida classificado administrativo do mata-mata", () => {
  assert.equal(
    inferQualifiedTeam({
      homeScore: 1,
      awayScore: 1,
      home: "África do Sul",
      away: "Canadá",
      qualified: "Canadá"
    }),
    "Canadá"
  );
  assert.equal(
    inferQualifiedTeam({
      homeScore: 2,
      awayScore: 0,
      home: "África do Sul",
      away: "Canadá"
    }),
    "África do Sul"
  );
  assert.throws(
    () => inferQualifiedTeam({
      homeScore: 1,
      awayScore: 1,
      home: "África do Sul",
      away: "Canadá"
    }),
    /--qualified/
  );
  assert.throws(
    () => inferQualifiedTeam({
      homeScore: 2,
      awayScore: 0,
      home: "África do Sul",
      away: "Canadá",
      qualified: "Canadá"
    }),
    /classificado deve ser África do Sul/
  );
});
