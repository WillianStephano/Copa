import test from "node:test";
import assert from "node:assert/strict";

function createLocalStorageMock() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    }
  };
}

test("calculateStandings ordena por pontos, saldo e gols pró", async () => {
  globalThis.localStorage = createLocalStorageMock();

  const { setScore } = await import("../js/storage.js");
  const { calculateStandings } = await import("../js/standings.js");

  setScore("C", 0, "home", "2");
  setScore("C", 0, "away", "0");
  setScore("C", 1, "home", "1");
  setScore("C", 1, "away", "1");
  setScore("C", 3, "home", "0");
  setScore("C", 3, "away", "1");

  const standings = calculateStandings();
  const groupC = standings.C;

  assert.equal(groupC[0].team, "Haiti");
  assert.equal(groupC[0].points, 4);
  assert.equal(groupC[0].goalDiff, 1);
  assert.equal(groupC[1].team, "Brasil");
  assert.equal(groupC[1].points, 3);
});

test("calculateStandings usa gols pró como desempate quando pontos e saldo empatam", async () => {
  globalThis.localStorage = createLocalStorageMock();

  const { setScore } = await import("../js/storage.js");
  const { calculateStandings } = await import("../js/standings.js");

  setScore("C", 0, "home", "2");
  setScore("C", 0, "away", "1");
  setScore("C", 1, "home", "1");
  setScore("C", 1, "away", "0");

  const standings = calculateStandings();
  const groupC = standings.C;

  assert.equal(groupC[0].points, groupC[1].points);
  assert.equal(groupC[0].goalDiff, groupC[1].goalDiff);
  assert.ok(groupC[0].goalsFor > groupC[1].goalsFor);
  assert.equal(groupC[0].team, "Brasil");
});
