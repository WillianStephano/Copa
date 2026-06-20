import test from "node:test";
import assert from "node:assert/strict";
import { generateGeminiText } from "../scripts/gemini-client.mjs";

test("cliente Gemini envia prompt e extrai texto da resposta", async () => {
  let request;
  const fetchMock = async (url, options) => {
    request = { url: String(url), options };
    return {
      ok: true,
      async json() {
        return {
          candidates: [{
            content: { parts: [{ text: '{"homeScore":1,"awayScore":0}' }] }
          }]
        };
      }
    };
  };

  const text = await generateGeminiText({
    apiKey: "secret",
    prompt: "Palpite",
    model: "gemini-test",
    fetchImplementation: fetchMock
  });

  assert.equal(text, '{"homeScore":1,"awayScore":0}');
  assert.match(request.url, /models\/gemini-test:generateContent/);
  assert.match(request.url, /key=secret/);
  const body = JSON.parse(request.options.body);
  assert.equal(body.generationConfig.maxOutputTokens, 512);
  assert.equal(body.generationConfig.responseFormat.text.mimeType, "APPLICATION_JSON");
  assert.deepEqual(body.generationConfig.responseFormat.text.schema.required, ["homeScore", "awayScore"]);
  assert.equal(body.generationConfig.responseFormat.text.schema.properties.homeScore.type, "integer");
});
