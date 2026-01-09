import { ApiKeys, ApiKeyProvider } from "../api-keys";

export interface LLMConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  provider: "anthropic" | "openai" | "openrouter" | "fireworks" | "nvidia" /* | "groq" | "ollama" */;
}

// Model Selection
export const AvailableModels = {
  // OpenRouter models (all models routed via OpenRouter)
  CLAUDE_OPUS_4_5: "anthropic/claude-opus-4.5",
  CLAUDE_HAIKU_4_5: "anthropic/claude-haiku-4.5",
  GOOGLE_GEMINI_3: "google/gemini-3-pro-preview",
  GOOGLE_GEMINI_3_FLASH: "google/gemini-3-flash-preview",
  GOOGLE_GEMINI_2_5_FLASH: "google/gemini-2.5-flash",
  MOONSHOT_KIMI_K2_THINKING: "moonshotai/kimi-k2-thinking",
  MISTRAL_DEVSTRAL_2: "mistralai/devstral-2512:free",
  DEEPSEEK_V3: "deepseek/deepseek-chat",
  GROK_CODE_FAST_1: "x-ai/grok-code-fast-1",
  ZAI_GLM_4_7: "z-ai/glm-4.7",
  MINIMAX_M2_1: "minimax/minimax-m2.1",
  // Fireworks models
  FIREWORKS_GLM_4_7: "accounts/fireworks/models/glm-4p7",
  // NVIDIA NIM models (using nim: prefix to distinguish from OpenRouter versions)
  NVIDIA_KIMI_K2_THINKING: "nim:moonshotai/kimi-k2-thinking",
  NVIDIA_DEEPSEEK_V3_2: "nim:deepseek-ai/deepseek-v3.2",
} as const;

export type ModelType = (typeof AvailableModels)[keyof typeof AvailableModels];

export interface ModelInfo {
  id: ModelType;
  name: string;
  provider: "anthropic" | "openai" | "openrouter" | "fireworks" | "nvidia" /* | "groq" | "ollama" */;
}

export const ModelInfos: Record<ModelType, ModelInfo> = {
  // All models via OpenRouter
  [AvailableModels.CLAUDE_OPUS_4_5]: {
    id: AvailableModels.CLAUDE_OPUS_4_5,
    name: "Claude Opus 4.5",
    provider: "openrouter",
  },
  [AvailableModels.CLAUDE_HAIKU_4_5]: {
    id: AvailableModels.CLAUDE_HAIKU_4_5,
    name: "Claude Haiku 4.5",
    provider: "openrouter",
  },
  [AvailableModels.GOOGLE_GEMINI_3]: {
    id: AvailableModels.GOOGLE_GEMINI_3,
    name: "Gemini 3 Pro",
    provider: "openrouter",
  },
  [AvailableModels.GOOGLE_GEMINI_3_FLASH]: {
    id: AvailableModels.GOOGLE_GEMINI_3_FLASH,
    name: "Gemini 3 Flash",
    provider: "openrouter",
  },
  [AvailableModels.GOOGLE_GEMINI_2_5_FLASH]: {
    id: AvailableModels.GOOGLE_GEMINI_2_5_FLASH,
    name: "Gemini 2.5 Flash",
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
  [AvailableModels.DEEPSEEK_V3]: {
    id: AvailableModels.DEEPSEEK_V3,
    name: "DeepSeek V3",
    provider: "openrouter",
  },
  [AvailableModels.GROK_CODE_FAST_1]: {
    id: AvailableModels.GROK_CODE_FAST_1,
    name: "Grok Code Fast 1",
    provider: "openrouter",
  },
  [AvailableModels.ZAI_GLM_4_7]: {
    id: AvailableModels.ZAI_GLM_4_7,
    name: "GLM 4.7",
    provider: "openrouter",
  },
  [AvailableModels.MINIMAX_M2_1]: {
    id: AvailableModels.MINIMAX_M2_1,
    name: "MiniMax M2.1",
    provider: "openrouter",
  },
  // Fireworks models
  [AvailableModels.FIREWORKS_GLM_4_7]: {
    id: AvailableModels.FIREWORKS_GLM_4_7,
    name: "GLM-4.7 (Fireworks)",
    provider: "fireworks",
  },
  // NVIDIA NIM models
  [AvailableModels.NVIDIA_KIMI_K2_THINKING]: {
    id: AvailableModels.NVIDIA_KIMI_K2_THINKING,
    name: "Kimi K2 Thinking (NVIDIA)",
    provider: "nvidia",
  },
  [AvailableModels.NVIDIA_DEEPSEEK_V3_2]: {
    id: AvailableModels.NVIDIA_DEEPSEEK_V3_2,
    name: "DeepSeek V3.2 (NVIDIA)",
    provider: "nvidia",
  },
};

export function getModelProvider(
  model: ModelType
): "anthropic" | "openai" | "openrouter" | "fireworks" | "nvidia" /* | "ollama" */ {
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

  // Fireworks models
  if (modelStr.includes("accounts/fireworks/models/")) {
    console.warn(
      `[getModelProvider] Inferred Fireworks provider for model: ${modelStr}`
    );
    return "fireworks";
  }

  // NVIDIA NIM models
  if (modelStr.startsWith("nim:")) {
    console.warn(
      `[getModelProvider] Inferred NVIDIA provider for model: ${modelStr}`
    );
    return "nvidia";
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
      return AvailableModels.CLAUDE_HAIKU_4_5;
    case "openai":
      return AvailableModels.CLAUDE_HAIKU_4_5;
    case "openrouter":
      return AvailableModels.CLAUDE_OPUS_4_5;
    case "fireworks":
      return AvailableModels.FIREWORKS_GLM_4_7;
    case "nvidia":
      return AvailableModels.NVIDIA_KIMI_K2_THINKING;
    case "exa":
      // Exa is a tool provider, not a model provider - return a sensible default
      return AvailableModels.CLAUDE_HAIKU_4_5;
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
    "google/gemini-2.5-flash",
    "google/gemini-3-pro-preview",
    "google/gemini-3-flash-preview",
    "x-ai/grok-code-fast-1",
    "deepseek-ai/deepseek-v3.2",
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
      AvailableModels.GOOGLE_GEMINI_3_FLASH,
      AvailableModels.GOOGLE_GEMINI_2_5_FLASH,
      AvailableModels.CLAUDE_HAIKU_4_5,
      AvailableModels.MOONSHOT_KIMI_K2_THINKING,
      AvailableModels.MISTRAL_DEVSTRAL_2,
      AvailableModels.DEEPSEEK_V3,
      AvailableModels.GROK_CODE_FAST_1,
      AvailableModels.ZAI_GLM_4_7,
      AvailableModels.MINIMAX_M2_1
    );
  }

  // Fireworks models
  if (userApiKeys.fireworks) {
    models.push(AvailableModels.FIREWORKS_GLM_4_7);
  }

  // NVIDIA NIM models
  if (userApiKeys.nvidia) {
    models.push(
      AvailableModels.NVIDIA_KIMI_K2_THINKING,
      AvailableModels.NVIDIA_DEEPSEEK_V3_2
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
      AvailableModels.GOOGLE_GEMINI_3_FLASH,
      AvailableModels.GOOGLE_GEMINI_2_5_FLASH,
      AvailableModels.CLAUDE_HAIKU_4_5,
      AvailableModels.MOONSHOT_KIMI_K2_THINKING,
      AvailableModels.MISTRAL_DEVSTRAL_2,
      AvailableModels.DEEPSEEK_V3,
      AvailableModels.GROK_CODE_FAST_1,
      AvailableModels.ZAI_GLM_4_7,
      AvailableModels.MINIMAX_M2_1
    );
  }

  // Fireworks models
  if (userApiKeys.fireworks) {
    defaultModels.push(AvailableModels.FIREWORKS_GLM_4_7);
  }

  // NVIDIA NIM models
  if (userApiKeys.nvidia) {
    defaultModels.push(
      AvailableModels.NVIDIA_KIMI_K2_THINKING,
      AvailableModels.NVIDIA_DEEPSEEK_V3_2
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
