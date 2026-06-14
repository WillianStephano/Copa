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

test("setScore salva, lê e limpa apenas chaves de placar", async () => {
  globalThis.localStorage = createLocalStorageMock();

  const { setScore, getScore, clearScores, scoreKey } = await import("../js/storage.js");

  setScore("A", 0, "home", "3");
  setScore("A", 0, "away", "1");
  localStorage.setItem("copa2026:lastTab", "calendar");

  assert.equal(getScore("A", 0, "home"), "3");
  assert.equal(getScore("A", 0, "away"), "1");
  assert.equal(localStorage.getItem("copa2026:lastTab"), "calendar");

  clearScores();

  assert.equal(getScore("A", 0, "home"), "");
  assert.equal(getScore("A", 0, "away"), "");
  assert.equal(localStorage.getItem("copa2026:lastTab"), "calendar");
  assert.equal(localStorage.getItem(scoreKey("A", 0, "home")), null);
});

