import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/ai-predictions.yml", "utf8");

test("workflow da IA roda automaticamente ao longo do dia", () => {
  assert.match(workflow, /cron: "0 9-23 \* \* \*"/);
  assert.match(workflow, /cron: "0 0-5 \* \* \*"/);
});

test("workflow da IA usa secret Gemini e nao forca sobrescrita por padrao", () => {
  assert.match(workflow, /GEMINI_API_KEY: \$\{\{ secrets\.GEMINI_API_KEY \}\}/);
  assert.match(workflow, /npm run ai:predictions -- "\$\{args\[@\]\}"/);
  assert.doesNotMatch(workflow, /args=\(--force\)/);
});
