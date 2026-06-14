import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalTeam,
  fetchOfficialMatches,
  getApiMatchStatus,
  mapApiMatch,
  parseStadiumLocalDate
} from "../scripts/worldcup-api.mjs";

test("mapeia nomes da API para as seleções locais", () => {
  assert.equal(canonicalTeam("Mexico"), "México");
  assert.equal(canonicalTeam("South Africa"), "África do Sul");
  assert.equal(canonicalTeam("Democratic Republic of the Congo"), "RD Congo");
});

test("converte horário local do estádio para UTC", () => {
  assert.equal(
    parseStadiumLocalDate("06/11/2026 13:00", "1").toISOString(),
    "2026-06-11T19:00:00.000Z"
  );
  assert.equal(
    parseStadiumLocalDate("06/12/2026 18:00", "16").toISOString(),
    "2026-06-13T01:00:00.000Z"
  );
});

test("mapeia jogo finalizado com placar e bloqueio de 30 minutos", () => {
  const match = mapApiMatch({
    id: "1",
    type: "group",
    home_team_name_en: "Mexico",
    away_team_name_en: "South Africa",
    local_date: "06/11/2026 13:00",
    stadium_id: "1",
    finished: "TRUE",
    time_elapsed: "finished",
    home_score: "2",
    away_score: "0"
  });

  assert.equal(match.id, "A-0");
  assert.equal(match.status, "FINISHED");
  assert.equal(match.homeScore, 2);
  assert.equal(match.awayScore, 0);
  assert.equal(match.kickoff.toISOString(), "2026-06-11T19:00:00.000Z");
  assert.equal(match.lockAt.toISOString(), "2026-06-11T18:30:00.000Z");
});

test("jogo futuro não usa placar provisório da API", () => {
  assert.equal(
    getApiMatchStatus({ finished: "FALSE", time_elapsed: "notstarted" }),
    "SCHEDULED"
  );

  const match = mapApiMatch({
    id: "2",
    type: "group",
    home_team_name_en: "South Korea",
    away_team_name_en: "Czech Republic",
    local_date: "06/11/2026 20:00",
    stadium_id: "2",
    finished: "FALSE",
    time_elapsed: "notstarted",
    home_score: "0",
    away_score: "0"
  });

  assert.equal(match.homeScore, null);
  assert.equal(match.awayScore, null);
});

test("consulta resultados novamente após falha temporária", async () => {
  let calls = 0;
  const fetchMock = async () => {
    calls += 1;
    if (calls === 1) throw new Error("EAI_AGAIN");
    return {
      ok: true,
      async json() {
        return { games: [{ id: "1" }] };
      }
    };
  };

  const games = await fetchOfficialMatches(fetchMock, {
    attempts: 2,
    baseDelayMs: 0
  });

  assert.equal(calls, 2);
  assert.deepEqual(games, [{ id: "1" }]);
});
