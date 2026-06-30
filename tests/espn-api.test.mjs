import test from "node:test";
import assert from "node:assert/strict";
import {
  ESPN_TOURNAMENT_DATES,
  fetchEspnEvents,
  getEspnMatchStatus,
  mapEspnEvent
} from "../scripts/espn-api.mjs";

test("mapeia evento da ESPN para partida local finalizada", () => {
  const match = mapEspnEvent({
    id: "760456",
    date: "2026-06-22T17:00Z",
    status: { type: { state: "post", completed: true } },
    competitions: [{
      competitors: [
        { homeAway: "home", score: "2", team: { displayName: "Argentina" } },
        { homeAway: "away", score: "0", team: { displayName: "Austria" } }
      ]
    }]
  });

  assert.equal(match.id, "J-2");
  assert.equal(match.status, "FINISHED");
  assert.equal(match.home, "Argentina");
  assert.equal(match.away, "Áustria");
  assert.equal(match.homeScore, 2);
  assert.equal(match.awayScore, 0);
  assert.equal(match.source, "espn");
  assert.equal(match.kickoff.toISOString(), "2026-06-22T17:00:00.000Z");
  assert.equal(match.lockAt.toISOString(), "2026-06-22T16:30:00.000Z");
});

test("interpreta status ao vivo e agendado da ESPN", () => {
  assert.equal(getEspnMatchStatus({ status: { type: { state: "in" } } }), "IN_PLAY");
  assert.equal(getEspnMatchStatus({ status: { type: { state: "pre" } } }), "SCHEDULED");
});

test("mapeia evento da ESPN para jogo de mata-mata", () => {
  const match = mapEspnEvent({
    id: "760486",
    date: "2026-06-28T19:00Z",
    season: { slug: "round-of-32" },
    status: { type: { state: "post", completed: true } },
    competitions: [{
      competitors: [
        { homeAway: "home", score: "0", winner: false, team: { displayName: "South Africa" } },
        { homeAway: "away", score: "1", winner: true, advance: true, team: { displayName: "Canada" } }
      ]
    }]
  });

  assert.equal(match.id, "KO-R32-1");
  assert.equal(match.phase, "knockout");
  assert.equal(match.status, "FINISHED");
  assert.equal(match.qualifiedTeamId, "Canadá");
  assert.equal(match.homeScore, 0);
  assert.equal(match.awayScore, 1);
});

test("consulta ESPN com intervalo completo do torneio", async () => {
  let requestedUrl = "";
  const fetchMock = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      async json() {
        return { events: [{ id: "760456" }] };
      }
    };
  };

  const events = await fetchEspnEvents({
    fetchImplementation: fetchMock,
    attempts: 1
  });

  assert.match(requestedUrl, /site\.api\.espn\.com/);
  assert.match(requestedUrl, new RegExp(`dates=${ESPN_TOURNAMENT_DATES}`));
  assert.match(requestedUrl, /limit=200/);
  assert.deepEqual(events, [{ id: "760456" }]);
});
