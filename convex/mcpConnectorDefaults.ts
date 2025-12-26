import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Default MCP connectors available to all users
 * These are "global" connectors with userId: undefined
 */
export const DEFAULT_MCP_CONNECTORS = [
  {
    name: "Atlassian",
    nameId: "atlassian",
    description: "Connect to Jira and Confluence via Atlassian Cloud or Server/Data Center",
    url: "https://mcp-atlassian.example.com", // Placeholder - users configure their own instance
    type: "HTTP" as const,
    category: "project_management",
    icon: "atlassian",
    repo: "https://github.com/sooperset/mcp-atlassian",
    requiredEnvVars: [
      { name: "ATLASSIAN_URL", description: "Your Atlassian instance URL" },
      { name: "ATLASSIAN_EMAIL", description: "Your Atlassian account email" },
      { name: "ATLASSIAN_API_TOKEN", description: "API token from id.atlassian.com" },
    ],
    features: [
      "Search Jira issues with JQL",
      "Create and update Jira issues",
      "Manage Confluence pages",
      "Track issue relationships",
    ],
  },
  {
    name: "Linear",
    nameId: "linear",
    description: "Manage Linear issues, projects, and teams",
    url: "https://mcp-linear.example.com", // Placeholder
    type: "HTTP" as const,
    category: "project_management",
    icon: "linear",
    repo: "https://github.com/cline/linear-mcp",
    requiredEnvVars: [
      { name: "LINEAR_API_KEY", description: "Personal API key from Linear settings" },
    ],
    features: [
      "Create and update issues",
      "Manage projects and cycles",
      "Search across workspace",
      "Track team workload",
    ],
  },
  {
    name: "Jira",
    nameId: "jira",
    description: "Dedicated Jira MCP server with optimized AI context payloads",
    url: "https://mcp-jira.example.com", // Placeholder
    type: "HTTP" as const,
    category: "project_management",
    icon: "jira",
    repo: "https://github.com/cosmix/jira-mcp",
    requiredEnvVars: [
      { name: "JIRA_BASE_URL", description: "Your Jira instance URL" },
      { name: "JIRA_USER_EMAIL", description: "Your Jira account email" },
      { name: "JIRA_API_TOKEN", description: "API token for authentication" },
      { name: "JIRA_TYPE", description: "cloud or server (optional, defaults to cloud)" },
    ],
    features: [
      "Search with JQL (max 50 results)",
      "Get epic children with comments",
      "Create and update issues",
      "File attachments support",
      "Optimized payloads for AI context",
    ],
  },
];

/**
 * Get all available default connector templates
 */
export const listDefaultTemplates = mutation({
  args: {},
  handler: async () => {
    return DEFAULT_MCP_CONNECTORS.map((connector) => ({
      name: connector.name,
      nameId: connector.nameId,
      description: connector.description,
      category: connector.category,
      icon: connector.icon,
      repo: connector.repo,
      requiredEnvVars: connector.requiredEnvVars,
      features: connector.features,
    }));
  },
});

/**
 * Seed global MCP connectors (admin only - run once)
 * Creates connectors with userId: undefined so they appear for all users
 */
export const seedGlobalConnectors = internalMutation({
  args: {
    connectors: v.array(
      v.object({
        name: v.string(),
        nameId: v.string(),
        url: v.string(),
        type: v.union(v.literal("HTTP"), v.literal("SSE")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results = [];

    for (const connector of args.connectors) {
      // Check if already exists
      const existing = await ctx.db
        .query("mcpConnectors")
        .withIndex("by_user_name_id", (q) =>
          q.eq("userId", undefined).eq("nameId", connector.nameId)
        )
        .unique();

      if (existing) {
        results.push({ nameId: connector.nameId, status: "exists" });
        continue;
      }

      // Create global connector (userId: undefined)
      const id = await ctx.db.insert("mcpConnectors", {
        userId: undefined,
        name: connector.name,
        nameId: connector.nameId,
        url: connector.url,
        type: connector.type,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });

      results.push({ nameId: connector.nameId, status: "created", id });
    }

    return results;
  },
});

/**
 * Create a user's instance of a default connector template
 * This allows users to configure their own credentials for a default connector
 */
export const createFromTemplate = mutation({
  args: {
    userId: v.id("users"),
    templateNameId: v.string(),
    url: v.string(),
    oauthClientId: v.optional(v.string()),
    oauthClientSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the template
    const template = DEFAULT_MCP_CONNECTORS.find(
      (c) => c.nameId === args.templateNameId
    );

    if (!template) {
      throw new Error(`Template "${args.templateNameId}" not found`);
    }

    // Check if user already has this connector
    const existing = await ctx.db
      .query("mcpConnectors")
      .withIndex("by_user_name_id", (q) =>
        q.eq("userId", args.userId).eq("nameId", template.nameId)
      )
      .unique();

    if (existing) {
      throw new Error(`You already have a "${template.name}" connector configured`);
    }

    const now = Date.now();
    const connectorId = await ctx.db.insert("mcpConnectors", {
      userId: args.userId,
      name: template.name,
      nameId: template.nameId,
      url: args.url,
      type: template.type,
      oauthClientId: args.oauthClientId,
      oauthClientSecret: args.oauthClientSecret,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    return { connectorId, name: template.name };
  },
});
