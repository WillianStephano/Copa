import test from "node:test";
import assert from "node:assert/strict";
import { renderRanking } from "../js/render.js";

test("renderRanking mostra badge e resumo de sequencia de acertos", () => {
  const view = renderRanking([
    {
      uid: "ana",
      displayName: "Ana",
      points: 9,
      exactHits: 2,
      outcomeHits: 1,
      currentStreak: 3,
      bestStreak: 4,
      details: []
    }
  ], "ana");

  assert.match(view.html, /Sequência de 3/);
  assert.match(view.html, /Conquista de sequência/);
  assert.match(view.html, />3<\/strong> atual/);
  assert.match(view.html, />4<\/strong> maior/);
});

test("renderRanking compara usuario expandido com usuario logado", () => {
  const view = renderRanking([
    {
      uid: "will",
      displayName: "Willian",
      points: 5,
      exactHits: 1,
      outcomeHits: 1,
      currentStreak: 2,
      bestStreak: 2,
      details: [
        {
          matchId: "A-0",
          home: "Brasil",
          away: "Marrocos",
          predictedHomeScore: 2,
          predictedAwayScore: 1,
          actualHomeScore: 2,
          actualAwayScore: 1,
          points: 3,
          type: "exact"
        },
        {
          matchId: "A-1",
          home: "Holanda",
          away: "Japão",
          predictedHomeScore: 1,
          predictedAwayScore: 0,
          actualHomeScore: 2,
          actualAwayScore: 0,
          points: 2,
          type: "outcome"
        }
      ]
    },
    {
      uid: "kel",
      displayName: "Kelwin",
      points: 2,
      exactHits: 0,
      outcomeHits: 1,
      currentStreak: 1,
      bestStreak: 3,
      details: [
        {
          matchId: "A-0",
          home: "Brasil",
          away: "Marrocos",
          predictedHomeScore: 1,
          predictedAwayScore: 0,
          actualHomeScore: 2,
          actualAwayScore: 1,
          points: 2,
          type: "outcome"
        }
      ]
    }
  ], "will");

  assert.match(view.html, /Comparação com você/);
  assert.match(view.html, /<details class="ranking-compare ranking-compare-toggle">/);
  assert.match(view.html, /<summary class="ranking-compare-summary">/);
  assert.match(view.html, /Ver duelo/);
  assert.match(view.html, /1 jogo em comum/);
  assert.match(view.html, /Willian: <strong>3<\/strong> pts/);
  assert.match(view.html, /Kelwin: <strong>2<\/strong> pts/);
  assert.match(view.html, /Willian: 2 x 1 · 3 pts/);
  assert.match(view.html, /Kelwin: 1 x 0 · 2 pts/);
  assert.match(view.html, /\+1 você/);
});

test("renderRanking deixa comparacao sem jogos em comum recolhivel", () => {
  const view = renderRanking([
    {
      uid: "will",
      displayName: "Willian",
      points: 3,
      exactHits: 1,
      outcomeHits: 0,
      details: [
        {
          matchId: "A-0",
          home: "Brasil",
          away: "Marrocos",
          predictedHomeScore: 2,
          predictedAwayScore: 1,
          actualHomeScore: 2,
          actualAwayScore: 1,
          points: 3,
          type: "exact"
        }
      ]
    },
    {
      uid: "ana",
      displayName: "Ana",
      points: 0,
      exactHits: 0,
      outcomeHits: 0,
      details: []
    }
  ], "will");

  assert.match(view.html, /ranking-compare-toggle is-empty/);
  assert.match(view.html, /Sem jogos em comum avaliados/);
  assert.match(view.html, /Ver detalhes/);
});
