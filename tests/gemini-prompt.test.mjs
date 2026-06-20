import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGeminiPredictionPrompt,
  buildGeminiRetryPrompt,
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

test("prompt de retry do Gemini pede somente JSON curto", () => {
  const prompt = buildGeminiRetryPrompt({
    home: "Turquia",
    away: "Paraguai"
  });

  assert.match(prompt, /Turquia x Paraguai/);
  assert.match(prompt, /somente este JSON completo/);
  assert.match(prompt, /\{"homeScore":number,"awayScore":number\}/);
});

test("parser extrai homeScore e awayScore sem salvar campos extras", () => {
  assert.deepEqual(
    parseGeminiPredictionResponse('{"homeScore":1,"awayScore":1}'),
    { homeScore: 1, awayScore: 1 }
  );

  assert.deepEqual(
    parseGeminiPredictionResponse('{"homeScore":1,"awayScore":1,"reason":"x"}'),
    { homeScore: 1, awayScore: 1 }
  );
});

test("parser aceita resposta quase JSON sem derrubar o workflow", () => {
  assert.deepEqual(
    parseGeminiPredictionResponse("homeScore: 2\nawayScore: 1"),
    { homeScore: 2, awayScore: 1 }
  );
});

test("parser aceita placar em texto quando o Gemini ignora o JSON", () => {
  assert.deepEqual(
    parseGeminiPredictionResponse("Turquia 1 x 0 Paraguai"),
    { homeScore: 1, awayScore: 0 }
  );
});

test("parser rejeita placar fora do intervalo permitido", () => {
  assert.throws(
    () => parseGeminiPredictionResponse('{"homeScore":7,"awayScore":0}'),
    /fora do intervalo/
  );
});
