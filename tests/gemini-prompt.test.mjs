import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGeminiPredictionPrompt,
  parseGeminiPredictionResponse
} from "../scripts/gemini-prompt.mjs";

test("prompt do Gemini exige somente placar em JSON", () => {
  const prompt = buildGeminiPredictionPrompt({
    home: "Turquia",
    away: "Paraguai"
  });

  assert.match(prompt, /Turquia x Paraguai/);
  assert.match(prompt, /Responda apenas JSON valido/);
  assert.match(prompt, /Nao inclua confidence, reason/);
  assert.match(prompt, /"homeScore": number/);
  assert.match(prompt, /"awayScore": number/);
});

test("parser aceita apenas homeScore e awayScore", () => {
  assert.deepEqual(
    parseGeminiPredictionResponse('{"homeScore":1,"awayScore":1}'),
    { homeScore: 1, awayScore: 1 }
  );

  assert.throws(
    () => parseGeminiPredictionResponse('{"homeScore":1,"awayScore":1,"reason":"x"}'),
    /campos extras/
  );
});

test("parser rejeita placar fora do intervalo permitido", () => {
  assert.throws(
    () => parseGeminiPredictionResponse('{"homeScore":7,"awayScore":0}'),
    /fora do intervalo/
  );
});
