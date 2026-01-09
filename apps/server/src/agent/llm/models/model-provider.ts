import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createFireworks } from "@ai-sdk/fireworks";
// import { createGroq } from "@ai-sdk/groq";
// import { createOllama } from "ollama-ai-provider";
import { ModelType, getModelProvider, ApiKeys, isReasoningModel } from "@repo/types";
import { LanguageModel } from "ai";

const OPENROUTER_HEADERS = {
  "HTTP-Referer": "https://code.opulentia.ai",
  "X-Title": "Shadow Agent",
};

/**
 * Get reasoning configuration for OpenRouter models
 * See: https://openrouter.ai/docs/guides/best-practices/reasoning-tokens
 */
function getOpenRouterReasoningConfig(modelId: string): {
  reasoning?: {
    enabled?: boolean;
    exclude?: boolean;
  } & ({ max_tokens: number } | { effort: "high" | "medium" | "low" });
} | undefined {
  if (!isReasoningModel(modelId)) {
    return undefined;
  }

  const isClaudeModel = modelId.includes("claude");
  const isGeminiModel = modelId.includes("gemini");
  const isGrokModel = modelId.includes("grok");
  const isKimiModel = modelId.includes("kimi");

  // Claude models on OpenRouter: use max_tokens (minimum 1024)
  if (isClaudeModel) {
    return {
      reasoning: {
        enabled: true,
        max_tokens: 12000,
        exclude: false,
      },
    };
  }

  // Gemini 2.5 Flash has built-in thinking capabilities
  if (isGeminiModel) {
    return {
      reasoning: {
        enabled: true,
        max_tokens: 8000,
        exclude: false,
      },
    };
  }

  // Grok Code Fast 1 - reasoning traces visible in response
  if (isGrokModel) {
    return {
      reasoning: {
        enabled: true,
        effort: "high",
        exclude: false,
      },
    };
  }

  // Kimi K2 Thinking - optimized for reasoning
  if (isKimiModel) {
    return {
      reasoning: {
        enabled: true,
        effort: "high",
        exclude: false,
      },
    };
  }

  // Default reasoning config for other reasoning models
  return {
    reasoning: {
      enabled: true,
      effort: "medium",
      exclude: false,
    },
  };
}

export class ModelProvider {
  /**
   * Creates and returns a language model instance based on the model type and user API keys
   */
  getModel(modelId: ModelType, userApiKeys: ApiKeys): LanguageModel {
    const provider = getModelProvider(modelId);

    switch (provider) {
      case "anthropic": {
        if (!userApiKeys.anthropic) {
          throw new Error(
            "Anthropic API key not provided. Please configure your API key in settings."
          );
        }

        console.log("Creating Anthropic client with API key");

        const anthropicClient = createAnthropic({
          apiKey: userApiKeys.anthropic,
        });
        const model = anthropicClient(modelId);
        console.log(`[MODEL_PROVIDER] Created Anthropic model: ${modelId}`);
        return model;
      }

      case "openai": {
        if (!userApiKeys.openai) {
          throw new Error(
            "OpenAI API key not provided. Please configure your API key in settings."
          );
        }

        console.log("Creating OpenAI client with API key");

        const openaiClient = createOpenAI({ apiKey: userApiKeys.openai });
        const model = openaiClient(modelId);
        console.log(`[MODEL_PROVIDER] Created OpenAI model: ${modelId}`);
        return model;
      }

      case "openrouter": {
        if (!userApiKeys.openrouter) {
          throw new Error(
            "OpenRouter API key not provided. Please configure your API key in settings."
          );
        }

        console.log("Creating OpenRouter client with native provider");

        try {
          // Use the native OpenRouter AI SDK provider for proper reasoning support
          const openrouterClient = createOpenRouter({
            apiKey: userApiKeys.openrouter,
            headers: OPENROUTER_HEADERS,
            compatibility: "strict",
          });

          // Get reasoning configuration for this model
          const reasoningConfig = getOpenRouterReasoningConfig(modelId);

          // Create the model with reasoning settings if applicable
          const model = openrouterClient.chat(modelId, {
            ...reasoningConfig,
          });

          console.log(`[MODEL_PROVIDER] Created OpenRouter model: ${modelId}`, {
            hasReasoningConfig: !!reasoningConfig,
            isReasoningModel: isReasoningModel(modelId),
          });

          return model as unknown as LanguageModel;
        } catch (error) {
          console.error("OpenRouter client creation failed:", error);
          throw error;
        }
      }

      case "fireworks": {
        if (!userApiKeys.fireworks) {
          throw new Error(
            "Fireworks API key not provided. Please configure your API key in settings."
          );
        }

        console.log("Creating Fireworks client with API key");

        try {
          const fireworksClient = createFireworks({
            apiKey: userApiKeys.fireworks,
          });
          const model = fireworksClient(modelId);
          console.log(`[MODEL_PROVIDER] Created Fireworks model: ${modelId}`);
          return model as unknown as LanguageModel;
        } catch (error) {
          console.error("Fireworks client creation failed:", error);
          throw error;
        }
      }

      // case "groq": {
      //   if (!userApiKeys.groq) {
      //     throw new Error(
      //       "Groq API key not provided. Please configure your API key in settings."
      //     );
      //   }

      //   console.log("Creating Groq client");

      //   try {
      //     const groqClient = createGroq({
      //       apiKey: userApiKeys.groq,
      //     });
      //     return groqClient(modelId) as unknown as LanguageModel;
      //   } catch (error) {
      //     console.error("Groq client creation failed:", error);
      //     throw error;
      //   }
      // }

      // case "ollama": {
      //   if (!userApiKeys.ollama) {
      //     throw new Error(
      //       "Ollama API key not provided. Please configure your API key in settings."
      //     );
      //   }

      //   console.log("Creating Ollama client");

      //   try {
      //     const ollamaClient = createOllama({
      //       baseURL: "https://ollama.com",
      //       headers: {
      //         Authorization: `Bearer ${userApiKeys.ollama}`,
      //       },
      //     });
      //     return ollamaClient(modelId);
      //   } catch (error) {
      //     console.error("Ollama client creation failed:", error);
      //     throw error;
      //   }
      // }

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
