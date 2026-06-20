import {
  DEFAULT_GEMINI_MODEL,
  buildGeminiPredictionPrompt,
  parseGeminiPredictionResponse
} from "./gemini-prompt.mjs";
import { generateGeminiText } from "./gemini-client.mjs";

const HELP = `
Uso:
  npm run ai:debug -- --home Turquia --away Paraguai
  npm run ai:debug -- --home "Estados Unidos" --away Mexico --show-prompt

Variaveis:
  GEMINI_API_KEY obrigatoria
  GEMINI_MODEL opcional, padrao ${DEFAULT_GEMINI_MODEL}
`;

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "--show-prompt") {
      options[token.slice(2)] = true;
      continue;
    }
    if (!token.startsWith("--")) {
      throw new Error(`Argumento inesperado: ${token}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Informe um valor para ${token}.`);
    }
    options[token.slice(2)] = value;
    index += 1;
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(HELP.trim());
  process.exit(0);
}

const home = options.home || "Turquia";
const away = options.away || "Paraguai";
const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
const prompt = buildGeminiPredictionPrompt({ home, away });

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY ausente. Configure a variavel antes de rodar o debug.");
}

console.log(`Modelo: ${model}`);
console.log(`Partida: ${home} x ${away}`);
if (options["show-prompt"]) {
  console.log("\nPROMPT:");
  console.log(prompt);
}

const raw = await generateGeminiText({
  apiKey: process.env.GEMINI_API_KEY,
  model,
  prompt
});

console.log("\nRAW_RESPONSE:");
console.log(raw);

try {
  const parsed = parseGeminiPredictionResponse(raw);
  console.log("\nPARSED_RESPONSE:");
  console.log(JSON.stringify(parsed, null, 2));
} catch (error) {
  console.log("\nPARSE_ERROR:");
  console.log(error.message);
  process.exitCode = 1;
}
