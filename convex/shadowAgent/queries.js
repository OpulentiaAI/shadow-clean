"use strict";
/**
 * Shadow Agent Queries
 *
 * This file contains queries for accessing Agent data.
 * These run in the default (non-Node) runtime.
 *
 * Note: Agent's listMessages is designed to be called from actions.
 * For queries, we use the component's internal tables directly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getThread = void 0;
const server_1 = require("../_generated/server");
const values_1 = require("convex/values");
const api_1 = require("../_generated/api");
/**
 * Get thread metadata using component's getThread
 */
exports.getThread = (0, server_1.query)({
    args: {
        threadId: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const thread = await ctx.runQuery(api_1.components.agent.threads.getThread, {
            threadId: args.threadId,
        });
        return thread;
    },
});
