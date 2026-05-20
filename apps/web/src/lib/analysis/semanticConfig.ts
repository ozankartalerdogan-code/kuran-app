export type SemanticAnalysisConfig = {
  provider: "openai" | "gemini" | "local" | "none";
  model: string;
  temperature: number;
  maxTokens: number;
  enableFallback: boolean;
};

export const defaultSemanticAnalysisConfig: SemanticAnalysisConfig = {
  provider: "none",
  model: "gemini-2.5-flash-lite",
  temperature: 0.2,
  maxTokens: 120,
  enableFallback: true
};

export function normalizeSemanticConfig(
  config: Partial<SemanticAnalysisConfig>
): SemanticAnalysisConfig {
  return {
    provider: config.provider ?? defaultSemanticAnalysisConfig.provider,
    model: config.model ?? defaultSemanticAnalysisConfig.model,
    temperature: config.temperature ?? defaultSemanticAnalysisConfig.temperature,
    maxTokens: config.maxTokens ?? defaultSemanticAnalysisConfig.maxTokens,
    enableFallback: config.enableFallback ?? defaultSemanticAnalysisConfig.enableFallback
  };
}

export function getSemanticAnalysisConfig(): SemanticAnalysisConfig {
  return { ...defaultSemanticAnalysisConfig };
}
