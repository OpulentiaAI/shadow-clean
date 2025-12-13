import { generateObject } from "ai";
import { z } from "zod";
import { ModelProvider } from "../models/model-provider";
import { PRPrompts } from "./pr-prompts";
import { AvailableModels, ApiKeys } from "@repo/types";

const prMetadataSchema = z.object({
  title: z.string().max(50),
  description: z.string(),
});

export class PRGenerator {
  private modelProvider = new ModelProvider();
  private prPrompts = new PRPrompts();

  /**
   * Generate PR metadata using LLM based on task context and git changes
   */
  async generatePRMetadata(
    options: {
      taskTitle: string;
      gitDiff: string;
      commitMessages: string[];
      wasTaskCompleted: boolean;
    },
    userApiKeys: ApiKeys
  ): Promise<{
    title: string;
    description: string;
    isDraft: boolean;
  }> {
    try {
      const prompt = this.prPrompts.buildPRGenerationPrompt(options);

      const prModel = userApiKeys.openai
        ? AvailableModels.OPENAI_GPT_5_1_CODEX
        : AvailableModels.CLAUDE_HAIKU_4_5;

      const { object } = await generateObject({
        model: this.modelProvider.getModel(prModel, userApiKeys),
        temperature: 0.3,
        maxOutputTokens: 1000,
        schema: prMetadataSchema,
        prompt,
      });

      const result = {
        ...object,
        isDraft: true,
      };

      console.log(`[LLM] Generated PR metadata:`, {
        title: result.title,
        isDraft: result.isDraft,
        descriptionLength: result.description.length,
      });

      return result;
    } catch (error) {
      console.error(`[LLM] Failed to generate PR metadata:`, error);
      throw error;
    }
  }
}
