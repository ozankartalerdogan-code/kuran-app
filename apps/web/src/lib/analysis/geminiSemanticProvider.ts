import type { SemanticAiProvider } from "./semanticPrompt";

type GeminiProviderOptions = {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

const defaultGeminiModel = "gemini-2.5-flash-lite";
const defaultTemperature = 0.2;
const defaultMaxTokens = 120;

function buildGeminiEndpoint(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

function extractGeminiResponseText(payload: GeminiGenerateContentResponse): string {
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!text) {
    throw new Error("Gemini response did not contain a usable text payload.");
  }

  return text;
}

export function createGeminiSemanticProvider(
  options: GeminiProviderOptions
): SemanticAiProvider {
  const apiKey = options.apiKey.trim();

  if (apiKey.length === 0) {
    throw new Error("Gemini API key is required.");
  }

  const model = options.model?.trim() || defaultGeminiModel;
  const temperature = options.temperature ?? defaultTemperature;
  const maxTokens = options.maxTokens ?? defaultMaxTokens;

  return {
    async generateSemanticAnalysis(prompt: string): Promise<string> {
      let response: Response;
      try {
        response = await fetch(buildGeminiEndpoint(model, apiKey), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              responseMimeType: "application/json"
            }
          })
        });
      } catch (err) {
        throw new Error(`[Gemini] Ağ hatası: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (!response.ok) {
        throw new Error(`[Gemini] İstek başarısız: HTTP ${response.status}`);
      }

      const payload = (await response.json()) as GeminiGenerateContentResponse;
      return extractGeminiResponseText(payload);
    }
  };
}
