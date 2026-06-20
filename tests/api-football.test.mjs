import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchApiFootballFixtures,
  getApiFootballStatus,
  mapApiFootballFixture
} from "../scripts/api-football.mjs";

test("mapeia fixture da API-Football para partida local", () => {
  const match = mapApiFootballFixture({
    fixture: {
      id: 123,
      date: "2026-06-11T19:00:00+00:00",
      status: { short: "FT" }
    },
    teams: {
      home: { name: "Mexico" },
      away: { name: "South Africa" }
    },
    goals: { home: 2, away: 0 },
    score: { fulltime: { home: 2, away: 0 } }
  });

  assert.equal(match.id, "A-0");
  assert.equal(match.status, "FINISHED");
  assert.equal(match.homeScore, 2);
  assert.equal(match.awayScore, 0);
  assert.equal(match.source, "api-football");
  assert.equal(match.kickoff.toISOString(), "2026-06-11T19:00:00.000Z");
});

test("interpreta status ao vivo e agendado da API-Football", () => {
  assert.equal(getApiFootballStatus({ fixture: { status: { short: "2H" } } }), "IN_PLAY");
  assert.equal(getApiFootballStatus({ fixture: { status: { short: "NS" } } }), "SCHEDULED");
});

test("consulta API-Football com chave no header", async () => {
  let requestedHeader = "";
  const fetchMock = async (_, options) => {
    requestedHeader = options.headers["x-apisports-key"];
    return {
      ok: true,
      async json() {
        return { response: [{ fixture: { id: 1 } }] };
      }
    };
  };

  const fixtures = await fetchApiFootballFixtures({
    apiKey: "secret",
    fetchImplementation: fetchMock,
    attempts: 1
  });

  assert.equal(requestedHeader, "secret");
  assert.deepEqual(fixtures, [{ fixture: { id: 1 } }]);
});
