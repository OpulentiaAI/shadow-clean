import { ApiKeys, ApiKeyProvider } from "../api-keys";

export interface LLMConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  provider: "anthropic" | "openai" | "openrouter" | "nim" /* | "groq" | "ollama" */;
}

// Model Selection
export const AvailableModels = {
  // OpenAI models
  GPT_5: "gpt-5-2025-08-07",
  GPT_5_MINI: "gpt-5-mini-2025-08-07",
  GPT_4_1: "gpt-4.1",
  GPT_4_1_MINI: "gpt-4.1-mini",
  GPT_4O: "gpt-4o",
  GPT_4O_MINI: "gpt-4o-mini",

  // Anthropic models
  CLAUDE_OPUS_4: "claude-opus-4-1-20250805",
  CLAUDE_SONNET_4: "claude-sonnet-4-20250514",
  CLAUDE_3_5_HAIKU: "claude-3-5-haiku-20241022",

  // OpenRouter models
  CLAUDE_OPUS_4_5: "anthropic/claude-opus-4.5", // Default model via OpenRouter
  XAI_GROK_CODE_FAST_1: "x-ai/grok-code-fast-1", // xAI Grok Code Fast (OpenRouter, spec v2)
  MOONSHOT_KIMI_K2: "moonshotai/kimi-k2",
  MOONSHOT_KIMI_K2_THINKING: "moonshotai/kimi-k2-thinking",
  MISTRAL_CODESTRAL_2508: "mistralai/codestral-2508",
  DEEPSEEK_R1_0528: "deepseek/deepseek-r1-0528",
  DEEPSEEK_CHAT_V3_0324: "deepseek/deepseek-chat-v3-0324",
  QWEN_3_CODER: "qwen/qwen3-coder",
  QWEN_3_235B_A22B_2507: "qwen/qwen3-235b-a22b-2507",
  MISTRAL_DEVSTRAL_2: "mistralai/devstral-2512:free",
  // OpenAI via OpenRouter (reasoning models)
  OPENAI_GPT_5_1: "openai/gpt-5.1",
  OPENAI_GPT_5_1_CODEX_MAX: "openai/gpt-5.1-codex-max",
  OPENAI_GPT_5_2: "openai/gpt-5.2",

  // NVIDIA NIM models (note: these are NIM-specific model IDs)
  NIM_KIMI_K2_THINKING: "nim:moonshotai/kimi-k2-thinking",
  NIM_DEEPSEEK_V3_2: "nim:deepseek-ai/deepseek-v3.2",
  NIM_DEEPSEEK_R1: "nim:deepseek-ai/deepseek-r1",
  NIM_LLAMA_3_3_70B: "nim:meta/llama-3.3-70b-instruct",
} as const;

export type ModelType = (typeof AvailableModels)[keyof typeof AvailableModels];

export interface ModelInfo {
  id: ModelType;
  name: string;
  provider: "anthropic" | "openai" | "openrouter" | "nim" /* | "groq" | "ollama" */;
}

export const ModelInfos: Record<ModelType, ModelInfo> = {
  // OpenAI models
  [AvailableModels.GPT_5]: {
    id: AvailableModels.GPT_5,
    name: "GPT-5",
    provider: "openai",
  },
  [AvailableModels.GPT_4_1]: {
    id: AvailableModels.GPT_4_1,
    name: "GPT-4.1",
    provider: "openai",
  },
  [AvailableModels.GPT_4_1_MINI]: {
    id: AvailableModels.GPT_4_1_MINI,
    name: "GPT-4.1 Mini",
    provider: "openai",
  },
  [AvailableModels.GPT_4O]: {
    id: AvailableModels.GPT_4O,
    name: "GPT-4o",
    provider: "openai",
  },
  [AvailableModels.GPT_4O_MINI]: {
    id: AvailableModels.GPT_4O_MINI,
    name: "GPT-4o Mini",
    provider: "openai",
  },
  [AvailableModels.GPT_5_MINI]: {
    id: AvailableModels.GPT_5_MINI,
    name: "GPT-5 Mini",
    provider: "openai",
  },

  // Anthropic models
  [AvailableModels.CLAUDE_OPUS_4]: {
    id: AvailableModels.CLAUDE_OPUS_4,
    name: "Claude Opus 4.1",
    provider: "anthropic",
  },
  [AvailableModels.CLAUDE_SONNET_4]: {
    id: AvailableModels.CLAUDE_SONNET_4,
    name: "Claude Sonnet 4",
    provider: "anthropic",
  },

  [AvailableModels.CLAUDE_3_5_HAIKU]: {
    id: AvailableModels.CLAUDE_3_5_HAIKU,
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
  },

  // OpenRouter models
  [AvailableModels.XAI_GROK_CODE_FAST_1]: {
    id: AvailableModels.XAI_GROK_CODE_FAST_1,
    name: "Grok Code Fast 1",
    provider: "openrouter",
  },
  [AvailableModels.CLAUDE_OPUS_4_5]: {
    id: AvailableModels.CLAUDE_OPUS_4_5,
    name: "Claude Opus 4.5",
    provider: "openrouter",
  },
  [AvailableModels.MOONSHOT_KIMI_K2]: {
    id: AvailableModels.MOONSHOT_KIMI_K2,
    name: "Kimi K2",
    provider: "openrouter",
  },
  [AvailableModels.MOONSHOT_KIMI_K2_THINKING]: {
    id: AvailableModels.MOONSHOT_KIMI_K2_THINKING,
    name: "Kimi K2 Thinking",
    provider: "openrouter",
  },
  [AvailableModels.MISTRAL_CODESTRAL_2508]: {
    id: AvailableModels.MISTRAL_CODESTRAL_2508,
    name: "Codestral 2508",
    provider: "openrouter",
  },
  [AvailableModels.DEEPSEEK_R1_0528]: {
    id: AvailableModels.DEEPSEEK_R1_0528,
    name: "DeepSeek R1 0528",
    provider: "openrouter",
  },
  [AvailableModels.DEEPSEEK_CHAT_V3_0324]: {
    id: AvailableModels.DEEPSEEK_CHAT_V3_0324,
    name: "DeepSeek Chat V3 0324",
    provider: "openrouter",
  },
  [AvailableModels.QWEN_3_CODER]: {
    id: AvailableModels.QWEN_3_CODER,
    name: "Qwen3 Coder",
    provider: "openrouter",
  },
  [AvailableModels.QWEN_3_235B_A22B_2507]: {
    id: AvailableModels.QWEN_3_235B_A22B_2507,
    name: "Qwen 3 235B A22B 2507",
    provider: "openrouter",
  },
  [AvailableModels.MISTRAL_DEVSTRAL_2]: {
    id: AvailableModels.MISTRAL_DEVSTRAL_2,
    name: "Devstral 2 (Free)",
    provider: "openrouter",
  },
  [AvailableModels.OPENAI_GPT_5_1]: {
    id: AvailableModels.OPENAI_GPT_5_1,
    name: "GPT-5.1",
    provider: "openrouter",
  },
  [AvailableModels.OPENAI_GPT_5_1_CODEX_MAX]: {
    id: AvailableModels.OPENAI_GPT_5_1_CODEX_MAX,
    name: "GPT-5.1 Codex Max",
    provider: "openrouter",
  },
  [AvailableModels.OPENAI_GPT_5_2]: {
    id: AvailableModels.OPENAI_GPT_5_2,
    name: "GPT-5.2",
    provider: "openrouter",
  },

  // NVIDIA NIM models
  [AvailableModels.NIM_KIMI_K2_THINKING]: {
    id: AvailableModels.NIM_KIMI_K2_THINKING,
    name: "Kimi K2 Thinking (NIM)",
    provider: "nim",
  },
  [AvailableModels.NIM_DEEPSEEK_V3_2]: {
    id: AvailableModels.NIM_DEEPSEEK_V3_2,
    name: "DeepSeek V3.2 (NIM)",
    provider: "nim",
  },
  [AvailableModels.NIM_DEEPSEEK_R1]: {
    id: AvailableModels.NIM_DEEPSEEK_R1,
    name: "DeepSeek R1 (NIM)",
    provider: "nim",
  },
  [AvailableModels.NIM_LLAMA_3_3_70B]: {
    id: AvailableModels.NIM_LLAMA_3_3_70B,
    name: "Llama 3.3 70B Instruct (NIM)",
    provider: "nim",
  },
};

export function getModelProvider(
  model: ModelType
): "anthropic" | "openai" | "openrouter" | "nim" /* | "ollama" */ {
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
      return AvailableModels.CLAUDE_SONNET_4;
    case "openai":
      return AvailableModels.GPT_5;
    case "openrouter":
      return AvailableModels.MOONSHOT_KIMI_K2_THINKING; // Kimi K2 Thinking (default)
    case "nim":
      return AvailableModels.NIM_KIMI_K2_THINKING; // Kimi K2 Thinking on NIM
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Check if a model is a reasoning/thinking model
 */
export function isReasoningModel(model: string): boolean {
  const reasoningModels = [
    "moonshotai/kimi-k2-thinking",
    "deepseek/deepseek-r1",
    "anthropic/claude-opus-4.5", // Extended thinking
    "openai/gpt-5.1", // GPT-5.1 reasoning
    "openai/gpt-5.1-codex-max", // GPT-5.1 Codex Max reasoning
    "openai/gpt-5.2", // GPT-5.2 adaptive reasoning
    "o1",
    "o3",
    "o4",
  ];
  return reasoningModels.some((rm) =>
    model.toLowerCase().includes(rm.toLowerCase())
  );
}

/**
 * Get all possible models based on user API keys (for settings UI)
 */
export async function getAllPossibleModels(
  userApiKeys: ApiKeys
): Promise<ModelType[]> {
  const models: ModelType[] = [];

  if (userApiKeys.anthropic) {
    models.push(AvailableModels.CLAUDE_OPUS_4, AvailableModels.CLAUDE_SONNET_4);
  }

  if (userApiKeys.openai) {
    models.push(
      AvailableModels.GPT_5,
      AvailableModels.GPT_5_MINI,
      AvailableModels.GPT_4_1,
      AvailableModels.GPT_4O
    );
  }

  if (userApiKeys.openrouter) {
    models.push(
      AvailableModels.MOONSHOT_KIMI_K2_THINKING, // Default OpenRouter (reasoning model)
      AvailableModels.OPENAI_GPT_5_2, // GPT-5.2 (reasoning, adaptive)
      AvailableModels.OPENAI_GPT_5_1_CODEX_MAX, // GPT-5.1 Codex Max (reasoning)
      AvailableModels.OPENAI_GPT_5_1, // GPT-5.1 (reasoning)
      AvailableModels.XAI_GROK_CODE_FAST_1,
      AvailableModels.CLAUDE_OPUS_4_5,
      AvailableModels.MOONSHOT_KIMI_K2,
      AvailableModels.MISTRAL_CODESTRAL_2508,
      AvailableModels.DEEPSEEK_R1_0528,
      AvailableModels.DEEPSEEK_CHAT_V3_0324,
      AvailableModels.QWEN_3_CODER,
      AvailableModels.QWEN_3_235B_A22B_2507,
      AvailableModels.MISTRAL_DEVSTRAL_2
    );
  }

  // if (userApiKeys.groq) {
  //   models.push(
  //     AvailableModels.GROQ_MIXTRAL_8X7B,
  //     AvailableModels.GROQ_LLAMA3_70B,
  //     AvailableModels.GROQ_LLAMA3_8B
  //   );
  // }

  // if (userApiKeys.ollama) {
  //   // models.push(
  //   //   AvailableModels.OLLAMA_GPT_OSS_120B,
  //   //   AvailableModels.OLLAMA_GPT_OSS_20B
  //   // );
  // }

  return models;
}

/**
 * Get default selected models based on user API keys
 */
export async function getDefaultSelectedModels(
  userApiKeys: ApiKeys
): Promise<ModelType[]> {
  const defaultModels: ModelType[] = [];

  // Add defaults for each provider (matching the user's request)
  if (userApiKeys.openai) {
    defaultModels.push(
      AvailableModels.GPT_5, // default
      AvailableModels.GPT_5_MINI, // default
      AvailableModels.GPT_4_1, // default
      AvailableModels.GPT_4O // default
      // AvailableModels.O3, // default
      // AvailableModels.O4_MINI // default
    );
  }

  if (userApiKeys.anthropic) {
    defaultModels.push(
      AvailableModels.CLAUDE_OPUS_4, // default
      AvailableModels.CLAUDE_SONNET_4 // default
    );
  }

  if (userApiKeys.openrouter) {
    // All OpenRouter models default - Kimi K2 Thinking first as primary
    defaultModels.push(
      AvailableModels.MOONSHOT_KIMI_K2_THINKING, // Default OpenRouter (reasoning model)
      AvailableModels.OPENAI_GPT_5_2, // GPT-5.2 (reasoning, adaptive)
      AvailableModels.OPENAI_GPT_5_1_CODEX_MAX, // GPT-5.1 Codex Max (reasoning)
      AvailableModels.OPENAI_GPT_5_1, // GPT-5.1 (reasoning)
      AvailableModels.XAI_GROK_CODE_FAST_1,
      AvailableModels.CLAUDE_OPUS_4_5,
      AvailableModels.MOONSHOT_KIMI_K2,
      AvailableModels.MISTRAL_CODESTRAL_2508,
      AvailableModels.DEEPSEEK_R1_0528,
      AvailableModels.DEEPSEEK_CHAT_V3_0324,
      AvailableModels.QWEN_3_CODER,
      AvailableModels.QWEN_3_235B_A22B_2507,
      AvailableModels.MISTRAL_DEVSTRAL_2
    );
  }

  // if (userApiKeys.ollama) {
  //   // For Ollama, we get the dynamic models but use static fallbacks for defaults
  //   // defaultModels.push(
  //   //   AvailableModels.OLLAMA_GPT_OSS_120B,
  //   //   AvailableModels.OLLAMA_GPT_OSS_20B
  //   // );
  // }

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
