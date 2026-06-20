import { DEFAULT_GEMINI_MODEL } from "./gemini-prompt.mjs";

export const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export async function generateGeminiText({
  apiKey,
  prompt,
  model = DEFAULT_GEMINI_MODEL,
  fetchImplementation = fetch
}) {
  if (!apiKey) throw new Error("GEMINI_API_KEY ausente.");
  if (!prompt) throw new Error("Prompt do Gemini ausente.");

  const url = new URL(`${GEMINI_API_BASE_URL}/models/${model}:generateContent`);
  url.searchParams.set("key", apiKey);

  const response = await fetchImplementation(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.35,
        topP: 0.82,
        topK: 32,
        maxOutputTokens: 80,
        responseMimeType: "application/json"
      }
    })
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Gemini respondeu ${response.status}: ${JSON.stringify(payload)}`);
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini nao retornou texto.");
  }

  return text;
}
