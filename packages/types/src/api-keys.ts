// API Key Provider Constants
export const API_KEY_PROVIDERS = {
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  OPENROUTER: "openrouter",
  FIREWORKS: "fireworks",
  NVIDIA: "nvidia",
  EXA: "exa",
  // GROQ: "groq",
  // OLLAMA: "ollama",
} as const;

export const API_KEY_PROVIDER_NAMES = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  fireworks: "Fireworks",
  nvidia: "NVIDIA NIM",
  exa: "Exa",
} as const;

export type ApiKeyProvider =
  (typeof API_KEY_PROVIDERS)[keyof typeof API_KEY_PROVIDERS];

export interface ApiKeyValidationResult {
  isValid: boolean;
  error?: string;
  latencyMs?: number;
  validatedAt?: number; // timestamp
}

export interface ApiKeys {
  openai?: string;
  anthropic?: string;
  openrouter?: string;
  fireworks?: string;
  nvidia?: string;
  exa?: string;
  // groq?: string;
  // ollama?: string;
}

export interface ApiKeyValidation {
  openai?: ApiKeyValidationResult;
  anthropic?: ApiKeyValidationResult;
  openrouter?: ApiKeyValidationResult;
  fireworks?: ApiKeyValidationResult;
  nvidia?: ApiKeyValidationResult;
  exa?: ApiKeyValidationResult;
  // groq?: ApiKeyValidationResult;
  // ollama?: ApiKeyValidationResult;
}
