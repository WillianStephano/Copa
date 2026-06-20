export const GEMINI_BOT_UID = "ai-gemini-bot";
export const GEMINI_BOT_NAME = "IA do Bolao";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

export function buildGeminiPredictionPrompt({ home, away }) {
  return `
Voce e um analista frio, conservador e realista de futebol internacional.
Sua tarefa e gerar um unico palpite de placar para um bolao da Copa 2026.

Partida:
${home} x ${away}

Regras do bolao:
- Placar exato vale 3 pontos.
- Acertar vencedor ou empate vale 2 pontos.
- Erro vale 0.

Objetivo:
- Maximize a chance esperada de pontuar no bolao.
- Nao tente ser criativo, torcedor, provocador ou dramatico.
- Priorize o resultado mais plausivel, mesmo que pareca "sem graca".

Criterios obrigatorios:
- Avalie a forca historica das selecoes.
- Avalie tradicao em Copa do Mundo e competicoes internacionais.
- Avalie equilibrio tecnico provavel entre as equipes.
- Avalie tendencia de gols e probabilidade de jogo truncado.
- Avalie se existe favorito claro ou se o empate e uma opcao forte.
- Em selecoes proximas, considere muito seriamente 0x0, 1x1, 1x0 e 2x1.
- Em favorito moderado, prefira 1x0, 2x0, 2x1 ou 3x1.
- Em favorito claro, prefira 2x0, 3x0 ou 3x1, mas evite goleadas raras.
- Evite placares exagerados ou improvaveis.
- Use placares comuns no futebol: 0x0, 1x0, 1x1, 2x1, 2x0, 0x1, 1x2, 3x1, 3x0.
- Se nao tiver certeza sobre noticias atuais, lesoes, suspensoes ou escalacoes, nao invente.
- Nao use informacoes dos palpites de outros participantes.
- Nao explique o palpite.

Formato de resposta obrigatorio:
- Responda apenas JSON valido.
- Nao use markdown.
- Nao inclua texto antes ou depois.
- Nao inclua confidence, reason, comentario ou qualquer outro campo.
- A resposta deve comecar com { e terminar com }.
- Se quiser explicar algo, nao explique: retorne somente o JSON.
- Os valores devem ser inteiros entre 0 e 6.

Schema exato:
{
  "homeScore": number,
  "awayScore": number
}

Exemplo de resposta valida:
{"homeScore":1,"awayScore":1}
`.trim();
}

export function buildGeminiRetryPrompt({ home, away }) {
  return `
Gere um palpite conservador para ${home} x ${away}.
Responda somente este JSON completo, em uma unica linha, sem markdown e sem texto extra:
{"homeScore":number,"awayScore":number}
Use numeros inteiros entre 0 e 6.
`.trim();
}

export function parseGeminiPredictionResponse(text) {
  const cleaned = String(text ?? "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    const looseMatch = matchLooseScore(cleaned);
    if (!looseMatch) {
      throw new Error("Gemini nao retornou JSON valido.");
    }

    return validatePredictionScores(looseMatch);
  }

  try {
    const data = JSON.parse(cleaned.slice(start, end + 1));
    if (!Object.hasOwn(data, "homeScore") || !Object.hasOwn(data, "awayScore")) {
      throw new Error("Gemini retornou JSON sem homeScore ou awayScore.");
    }

    return validatePredictionScores(data);
  } catch (error) {
    const looseMatch = matchLooseScore(cleaned);
    if (looseMatch) return validatePredictionScores(looseMatch);
    throw error;
  }
}

function validatePredictionScores(data) {
  const homeScore = Number(data.homeScore);
  const awayScore = Number(data.awayScore);
  if (![homeScore, awayScore].every((score) => Number.isInteger(score) && score >= 0 && score <= 6)) {
    throw new Error("Gemini retornou placar fora do intervalo permitido.");
  }

  return { homeScore, awayScore };
}

function matchLooseScore(text) {
  const keyedMatch = text.match(
    /homeScore["'\s]*[:=]\s*"?(\d+)"?[\s\S]*awayScore["'\s]*[:=]\s*"?(\d+)"?/i
  );
  if (keyedMatch) {
    return {
      homeScore: Number(keyedMatch[1]),
      awayScore: Number(keyedMatch[2])
    };
  }

  const scoreMatch = text.match(/\b(\d+)\s*[xX-]\s*(\d+)\b/);
  if (scoreMatch) {
    return {
      homeScore: Number(scoreMatch[1]),
      awayScore: Number(scoreMatch[2])
    };
  }

  return null;
}
