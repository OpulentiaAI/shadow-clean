import { action } from "./_generated/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { Agent, stepCountIs } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";

const defaultAgent = new Agent(components.agent, {
  name: "ShadowAgent",
  languageModel: openai.chat("gpt-4o-mini"),
});

export const generateText = action({
  args: { prompt: v.string() },
  handler: async (ctx, args) => {
    const threadId = await defaultAgent.createThread(ctx, {});

    const result = await defaultAgent.generateText(
      ctx,
      { threadId },
      { prompt: args.prompt, stopWhen: stepCountIs(1) },
    );

    return {
      threadId,
      text: result.text,
    };
  },
});

