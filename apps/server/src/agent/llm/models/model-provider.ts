import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
// import { createGroq } from "@ai-sdk/groq";
// import { createOllama } from "ollama-ai-provider";
import { ModelType, getModelProvider, ApiKeys } from "@repo/types";
import { LanguageModel } from "ai";

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_HEADERS = {
  "HTTP-Referer": "https://code.opulentia.ai",
  "X-Title": "Shadow Agent",
};

// NVIDIA NIM configuration
const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

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

        console.log("Creating OpenRouter client");

        try {
          const openrouterClient = createOpenAI({
            apiKey: userApiKeys.openrouter,
            baseURL: OPENROUTER_BASE_URL,
            headers: OPENROUTER_HEADERS,
          });
          const model = openrouterClient(modelId);

          console.log(`[MODEL_PROVIDER] Created OpenRouter model: ${modelId}`);
          return model;
        } catch (error) {
          console.error("OpenRouter client creation failed:", error);
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

      case "nim": {
        if (!userApiKeys.nim) {
          throw new Error(
            "NVIDIA NIM API key not provided. Please configure your API key in settings."
          );
        }

        console.log("Creating NVIDIA NIM client");

        try {
          const nimClient = createOpenAICompatible({
            name: "nim",
            baseURL: NIM_BASE_URL,
            headers: {
              Authorization: `Bearer ${userApiKeys.nim}`,
            },
          });
          // Strip the "nim:" prefix from model ID for actual API call
          const actualModelId = modelId.replace(/^nim:/, "");
          const model = nimClient.chatModel(actualModelId);

          console.log(`[MODEL_PROVIDER] Created NVIDIA NIM model: ${actualModelId}`);
          return model as unknown as LanguageModel;
        } catch (error) {
          console.error("NVIDIA NIM client creation failed:", error);
          throw error;
        }
      }

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
