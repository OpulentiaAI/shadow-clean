"use server";

import { cookies } from "next/headers";
import {
  ApiKeyProvider,
  ApiKeys,
  ApiKeyValidation,
  getAvailableModels,
  getAllPossibleModels,
  getDefaultSelectedModels,
  ModelInfo,
  ModelInfos,
  ModelType,
} from "@repo/types";
import type { ValidationResult } from "@/lib/types/validation";
import { isAuthenticated } from "@/lib/auth/auth-server";

export type { ApiKeyProvider };

// Environment variable fallbacks for local development
const ENV_OPENAI_KEY = process.env.OPENAI_API_KEY;
const ENV_ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ENV_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

export async function getApiKeys(): Promise<ApiKeys> {
  const cookieStore = await cookies();
  const openaiKey = cookieStore.get("openai-key")?.value;
  const anthropicKey = cookieStore.get("anthropic-key")?.value;
  const openrouterKey = cookieStore.get("openrouter-key")?.value;
  const fireworksKey = cookieStore.get("fireworks-key")?.value;
  const nvidiaKey = cookieStore.get("nvidia-key")?.value;
  const exaKey = cookieStore.get("exa-key")?.value;
  // const groqKey = cookieStore.get("groq-key")?.value;
  // const ollamaKey = cookieStore.get("ollama-key")?.value;

  // Use cookie values first, then fallback to environment variables
  return {
    openai: openaiKey || ENV_OPENAI_KEY || undefined,
    anthropic: anthropicKey || ENV_ANTHROPIC_KEY || undefined,
    openrouter: openrouterKey || ENV_OPENROUTER_KEY || undefined,
    fireworks: fireworksKey || undefined,
    nvidia: nvidiaKey || undefined,
    exa: exaKey || undefined,
    // groq: groqKey || undefined,
    // ollama: ollamaKey || undefined,
  };
}

export async function getModels(): Promise<ModelInfo[]> {
  const apiKeys = await getApiKeys();

  try {
    // Try to get user settings if authenticated
    const authenticated = await isAuthenticated();

    if (authenticated) {
      // For now, use default models since user ID is managed by Convex
      const availableModels = await getAvailableModels(apiKeys);
      return availableModels.map((modelId) => ModelInfos[modelId]);
    }
  } catch (_error) {
    // Could not fetch user settings, fall back to all models
  }

  // Fallback if no user session or error occurred
  const availableModels = await getAvailableModels(apiKeys);
  return availableModels.map((modelId) => ModelInfos[modelId]);
}

export async function getAllPossibleModelsInfo(): Promise<ModelInfo[]> {
  const apiKeys = await getApiKeys();
  const allModels = await getAllPossibleModels(apiKeys);
  return allModels.map((modelId) => ModelInfos[modelId]);
}

export async function getModelDefaults(): Promise<{
  defaultModels: ModelType[];
}> {
  const apiKeys = await getApiKeys();
  return {
    defaultModels: await getDefaultSelectedModels(apiKeys),
  };
}

export async function saveApiKey(provider: ApiKeyProvider, key: string | null) {
  const cookieStore = await cookies();
  const cookieName = `${provider}-key`;

  if (key) {
    const isProduction = process.env.VERCEL_ENV === "production";

    // Note: httpOnly is FALSE so client-side JavaScript can read these keys
    // for passing to Convex streaming actions. The keys are still secured by:
    // 1. secure: true in production (HTTPS only)
    // 2. sameSite protections
    // 3. domain restrictions
    cookieStore.set(cookieName, key, {
      httpOnly: false, // Allow client-side access for Convex streaming
      secure: isProduction,
      // Use "none" for production to allow cross-domain cookies, "lax" for development
      sameSite: isProduction ? "none" : "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      // Allow cookies to be sent to all opulentia.ai subdomains
      domain: isProduction ? ".opulentia.ai" : undefined,
    });
  } else {
    cookieStore.delete(cookieName);
  }

  return { success: true };
}

export async function clearApiKey(provider: ApiKeyProvider) {
  return saveApiKey(provider, null);
}

export async function getApiKeyValidation(): Promise<ApiKeyValidation> {
  const cookieStore = await cookies();

  const openaiValidation = cookieStore.get("openai-validation")?.value;
  const anthropicValidation = cookieStore.get("anthropic-validation")?.value;
  const openrouterValidation = cookieStore.get("openrouter-validation")?.value;
  const fireworksValidation = cookieStore.get("fireworks-validation")?.value;
  const nvidiaValidation = cookieStore.get("nvidia-validation")?.value;
  const exaValidation = cookieStore.get("exa-validation")?.value;
  // const groqValidation = cookieStore.get("groq-validation")?.value;
  // const ollamaValidation = cookieStore.get("ollama-validation")?.value;

  return {
    openai: openaiValidation ? JSON.parse(openaiValidation) : undefined,
    anthropic: anthropicValidation
      ? JSON.parse(anthropicValidation)
      : undefined,
    openrouter: openrouterValidation
      ? JSON.parse(openrouterValidation)
      : undefined,
    fireworks: fireworksValidation
      ? JSON.parse(fireworksValidation)
      : undefined,
    nvidia: nvidiaValidation
      ? JSON.parse(nvidiaValidation)
      : undefined,
    exa: exaValidation ? JSON.parse(exaValidation) : undefined,
    // groq: groqValidation ? JSON.parse(groqValidation) : undefined,
    // ollama: ollamaValidation ? JSON.parse(ollamaValidation) : undefined,
  };
}

export async function saveApiKeyValidation(
  provider: ApiKeyProvider,
  validation: ValidationResult | null
) {
  const cookieStore = await cookies();
  const cookieName = `${provider}-validation`;

  if (validation) {
    const isProduction = process.env.VERCEL_ENV === "production";

    // Add timestamp
    const validationWithTimestamp = {
      ...validation,
      validatedAt: Date.now(),
    };

    cookieStore.set(cookieName, JSON.stringify(validationWithTimestamp), {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      domain: isProduction ? ".opulentia.ai" : undefined,
    });
  } else {
    cookieStore.delete(cookieName);
  }

  return { success: true };
}

export async function clearApiKeyValidation(provider: ApiKeyProvider) {
  return saveApiKeyValidation(provider, null);
}
