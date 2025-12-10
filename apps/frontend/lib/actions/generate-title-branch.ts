"use server";

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  cleanTitle,
  generateShadowBranchName,
  getTitleGenerationModel,
  generateTitlePrompt,
} from "@repo/types";
import { getApiKeys } from "./api-keys";

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_HEADERS = {
  "HTTP-Referer": "https://shadowrealm.ai",
  "X-Title": "Shadow Agent",
};

export async function generateTaskTitleAndBranch(
  taskId: string,
  userPrompt: string
) {
  try {
    // Get API keys from cookies
    const apiKeys = await getApiKeys();

    const modelConfig = getTitleGenerationModel({
      taskId,
      userPrompt,
      apiKeys,
    });

    if (!modelConfig) {
      console.warn(
        `[GENERATE_TITLE_BRANCH] No API keys provided, skipping title generation for task ${taskId}`
      );
      return {
        title: userPrompt.slice(0, 50),
        shadowBranch: `shadow/task-${taskId}`,
      };
    }

    const model =
      modelConfig.provider === "openai"
        ? createOpenAI({ apiKey: apiKeys.openai })(modelConfig.modelChoice)
        : modelConfig.provider === "anthropic"
          ? createAnthropic({ apiKey: apiKeys.anthropic })(
              modelConfig.modelChoice
            )
          : createOpenAI({
              apiKey: apiKeys.openrouter!,
              baseURL: OPENROUTER_BASE_URL,
              headers: OPENROUTER_HEADERS,
            })(modelConfig.modelChoice);

    const { text: generatedText } = await generateText({
      model: model as any, // Type cast for OpenRouter compatibility with AI SDK v5
      temperature: 0.3,
      prompt: generateTitlePrompt(userPrompt),
    });

    const title = cleanTitle(generatedText);

    return { title, shadowBranch: generateShadowBranchName(title, taskId) };
  } catch (error) {
    console.error(
      `[GENERATE_TITLE_BRANCH] Failed to generate title for task ${taskId}:`,
      error
    );
    // Don't throw error, just log it - title generation is not critical
    return {
      title: userPrompt.slice(0, 50),
      shadowBranch: `shadow/task-${taskId}`,
    };
  }
}
