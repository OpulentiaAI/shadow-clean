import { ApiKeys, ApiKeyProvider } from "../api-keys";

export interface LLMConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  provider: "anthropic" | "openai" | "openrouter" /* | "groq" | "ollama" */;
}

// Model Selection
export const AvailableModels = {
  // OpenRouter models (all models routed via OpenRouter)
  CLAUDE_OPUS_4_5: "anthropic/claude-opus-4.5",
  CLAUDE_SONNET_4_5: "anthropic/claude-sonnet-4.5",
  CLAUDE_HAIKU_4_5: "anthropic/claude-haiku-4.5",
  GOOGLE_GEMINI_3: "google/gemini-3",
  MOONSHOT_KIMI_K2_THINKING: "moonshotai/kimi-k2-thinking",
  MISTRAL_DEVSTRAL_2: "mistralai/devstral-2512:free",
  DEEPSEEK_V3_2: "deepseek/deepseek-chat-v3.2",
  OPENAI_GPT_5_1_CODEX: "openai/gpt-5.1-codex",
  OPENAI_GPT_5_2: "openai/gpt-5.2",
} as const;

export type ModelType = (typeof AvailableModels)[keyof typeof AvailableModels];

export interface ModelInfo {
  id: ModelType;
  name: string;
  provider: "anthropic" | "openai" | "openrouter" /* | "groq" | "ollama" */;
}

export const ModelInfos: Record<ModelType, ModelInfo> = {
  // All models via OpenRouter
  [AvailableModels.CLAUDE_OPUS_4_5]: {
    id: AvailableModels.CLAUDE_OPUS_4_5,
    name: "Claude Opus 4.5",
    provider: "openrouter",
  },
  [AvailableModels.CLAUDE_SONNET_4_5]: {
    id: AvailableModels.CLAUDE_SONNET_4_5,
    name: "Claude Sonnet 4.5",
    provider: "openrouter",
  },
  [AvailableModels.CLAUDE_HAIKU_4_5]: {
    id: AvailableModels.CLAUDE_HAIKU_4_5,
    name: "Claude Haiku 4.5",
    provider: "openrouter",
  },
  [AvailableModels.GOOGLE_GEMINI_3]: {
    id: AvailableModels.GOOGLE_GEMINI_3,
    name: "Gemini 3",
    provider: "openrouter",
  },
  [AvailableModels.MOONSHOT_KIMI_K2_THINKING]: {
    id: AvailableModels.MOONSHOT_KIMI_K2_THINKING,
    name: "Kimi K2 Thinking",
    provider: "openrouter",
  },
  [AvailableModels.MISTRAL_DEVSTRAL_2]: {
    id: AvailableModels.MISTRAL_DEVSTRAL_2,
    name: "Devstral 2 (Free)",
    provider: "openrouter",
  },
  [AvailableModels.DEEPSEEK_V3_2]: {
    id: AvailableModels.DEEPSEEK_V3_2,
    name: "DeepSeek 3.2",
    provider: "openrouter",
  },
  [AvailableModels.OPENAI_GPT_5_1_CODEX]: {
    id: AvailableModels.OPENAI_GPT_5_1_CODEX,
    name: "GPT-5.1 Codex",
    provider: "openrouter",
  },
  [AvailableModels.OPENAI_GPT_5_2]: {
    id: AvailableModels.OPENAI_GPT_5_2,
    name: "GPT-5.2 (Reasoning)",
    provider: "openrouter",
  },
};

export function getModelProvider(
  model: ModelType
): "anthropic" | "openai" | "openrouter" /* | "ollama" */ {
  const modelInfo = ModelInfos[model];
  if (modelInfo) {
    return modelInfo.provider;
  }

  // Defensive fallback: If model not found in registry, try to infer provider from model string
  // This handles cases where a model string is passed that isn't in our static registry
  const modelStr = model as string;
  console.warn(
    `[getModelProvider] Model "${modelStr}" not found in ModelInfos, attempting to infer provider`
  );

  // OpenRouter models typically have format "organization/model-name"
  if (modelStr.includes("/")) {
    console.warn(
      `[getModelProvider] Inferred OpenRouter provider for model: ${modelStr}`
    );
    return "openrouter";
  }

  // Claude direct models (from Anthropic)
  if (modelStr.toLowerCase().includes("claude") && !modelStr.includes("/")) {
    console.warn(
      `[getModelProvider] Inferred Anthropic provider for model: ${modelStr}`
    );
    return "anthropic";
  }

  // GPT/OpenAI models
  if (
    modelStr.toLowerCase().includes("gpt") ||
    modelStr.toLowerCase().includes("o3") ||
    modelStr.toLowerCase().includes("o4")
  ) {
    console.warn(
      `[getModelProvider] Inferred OpenAI provider for model: ${modelStr}`
    );
    return "openai";
  }

  // Default to OpenRouter for unknown models
  console.warn(
    `[getModelProvider] Defaulting to OpenRouter for unknown model: ${modelStr}`
  );
  return "openrouter";
}

export function getModelInfo(model: ModelType): ModelInfo {
  return ModelInfos[model];
}

export function getProviderDefaultModel(provider: ApiKeyProvider): ModelType {
  switch (provider) {
    case "anthropic":
      return AvailableModels.CLAUDE_SONNET_4_5;
    case "openai":
      return AvailableModels.OPENAI_GPT_5_1_CODEX;
    case "openrouter":
      return AvailableModels.CLAUDE_OPUS_4_5;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Check if a model is a reasoning/thinking model
 */
export function isReasoningModel(model: string): boolean {
  const reasoningModels = [
    "anthropic/claude-opus-4.5",
    "moonshotai/kimi-k2-thinking",
    "openai/gpt-5.2",
  ];
  return reasoningModels.some((rm) =>
    model.toLowerCase().includes(rm.toLowerCase())
  );
}

/**
 * Get all possible models based on user API keys (for settings UI)
 * All models are available via OpenRouter
 */
export async function getAllPossibleModels(
  userApiKeys: ApiKeys
): Promise<ModelType[]> {
  const models: ModelType[] = [];

  // All models available via OpenRouter
  if (userApiKeys.openrouter) {
    models.push(
      AvailableModels.CLAUDE_OPUS_4_5,
      AvailableModels.GOOGLE_GEMINI_3,
      AvailableModels.CLAUDE_SONNET_4_5,
      AvailableModels.CLAUDE_HAIKU_4_5,
      AvailableModels.MOONSHOT_KIMI_K2_THINKING,
      AvailableModels.MISTRAL_DEVSTRAL_2,
      AvailableModels.DEEPSEEK_V3_2,
      AvailableModels.OPENAI_GPT_5_1_CODEX,
      AvailableModels.OPENAI_GPT_5_2
    );
  }

  return models;
}

/**
 * Get default selected models based on user API keys
 */
export async function getDefaultSelectedModels(
  userApiKeys: ApiKeys
): Promise<ModelType[]> {
  const defaultModels: ModelType[] = [];

  // All models available via OpenRouter
  if (userApiKeys.openrouter) {
    defaultModels.push(
      AvailableModels.CLAUDE_OPUS_4_5,
      AvailableModels.GOOGLE_GEMINI_3,
      AvailableModels.CLAUDE_SONNET_4_5,
      AvailableModels.CLAUDE_HAIKU_4_5,
      AvailableModels.MOONSHOT_KIMI_K2_THINKING,
      AvailableModels.MISTRAL_DEVSTRAL_2,
      AvailableModels.DEEPSEEK_V3_2,
      AvailableModels.OPENAI_GPT_5_1_CODEX,
      AvailableModels.OPENAI_GPT_5_2
    );
  }

  return defaultModels;
}

/**
 * Get available models based on user API keys and selected models in settings
 */
export async function getAvailableModels(
  userApiKeys: ApiKeys,
  selectedModels?: ModelType[]
): Promise<ModelType[]> {
  const allPossible = await getAllPossibleModels(userApiKeys);

  // If no user selection, return all possible (backward compatibility)
  if (!selectedModels || selectedModels.length === 0) {
    return allPossible;
  }

  // Filter selected models to only include those that user has API keys for
  return selectedModels.filter((model) => allPossible.includes(model));
}
