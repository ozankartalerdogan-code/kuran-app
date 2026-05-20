import type { SemanticAiProvider } from "./semanticPrompt";

type GroqProviderOptions = {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const defaultGroqModel = "llama-3.1-8b-instant";
const defaultTemperature = 0.2;
const defaultMaxTokens = 120;

function extractGroqResponseText(payload: GroqChatCompletionResponse): string {
  const text = payload.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("Groq response did not contain a usable text payload.");
  }

  return text;
}

export function createGroqSemanticProvider(
  options: GroqProviderOptions
): SemanticAiProvider {
  const apiKey = options.apiKey.trim();

  if (apiKey.length === 0) {
    throw new Error("GROQ_API_KEY is required");
  }

  const model = options.model?.trim() || defaultGroqModel;
  const temperature = options.temperature ?? defaultTemperature;
  const maxTokens = options.maxTokens ?? defaultMaxTokens;

  return {
    async generateSemanticAnalysis(prompt: string): Promise<string> {
      let response: Response;
      try {
        response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are a strict JSON generator for a Qur'anic semantic analysis feature. Return ONLY valid JSON. The JSON must have exactly one field: \"summary\". The summary must be a natural Turkish sentence for end users. Do not include labels, prefixes, explanations, markdown, or prompt instructions. Do not write phrases like \"Ayetin kısa anlam analizi\", \"Verilen verilere göre\", or \"Bu analiz\". Do not add any fields other than \"summary\"."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature,
            max_tokens: maxTokens,
            response_format: {
              type: "json_object"
            }
          })
        });
      } catch (err) {
        throw new Error(`[Groq] Ağ hatası: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (!response.ok) {
        throw new Error(`[Groq] İstek başarısız: HTTP ${response.status}`);
      }

      const payload = (await response.json()) as GroqChatCompletionResponse;
      return extractGroqResponseText(payload);
    }
  };
}
