/**
 * Shadow Agent Queries
 * 
 * This file contains queries for accessing Agent data.
 * These run in the default (non-Node) runtime.
 * 
 * Note: Agent's listMessages is designed to be called from actions.
 * For queries, we use the component's internal tables directly.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";
import { components } from "../_generated/api";

/**
 * Get thread metadata using component's getThread
 */
export const getThread = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    return thread;
  },
});
