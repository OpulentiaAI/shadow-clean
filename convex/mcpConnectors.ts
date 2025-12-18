import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { McpTransportType } from "./schema";
import { api } from "./_generated/api";

type McpDiscoveryResult = {
  tools: Array<{ name: string; description?: string }>;
  resources: Array<{
    name: string;
    uri: string;
    description?: string;
    mimeType?: string;
  }>;
  prompts: Array<{
    name: string;
    description?: string;
    arguments?: Array<{ name: string; description?: string; required?: boolean }>;
  }>;
};

/**
 * Generate a nameId from connector name for tool namespacing
 */
function generateMcpNameId(name: string): { ok: true; nameId: string } | { ok: false; error: string } {
  // Lowercase the name
  let nameId = name.toLowerCase();
  // Replace non-alphanumeric with underscores
  nameId = nameId.replace(/[^a-z0-9]/g, "_");
  // Collapse consecutive underscores
  nameId = nameId.replace(/_+/g, "_");
  // Trim leading/trailing underscores
  nameId = nameId.replace(/^_+|_+$/g, "");

  if (!nameId) {
    return { ok: false, error: "Name must contain at least one alphanumeric character" };
  }

  if (nameId === "global") {
    return { ok: false, error: "Name 'global' is reserved" };
  }

  return { ok: true, nameId };
}

/**
 * List all MCP connectors for a user (including global connectors)
 */
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get user's connectors
    const userConnectors = await ctx.db
      .query("mcpConnectors")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get global connectors (userId is undefined)
    const globalConnectors = await ctx.db
      .query("mcpConnectors")
      .withIndex("by_user", (q) => q.eq("userId", undefined))
      .collect();

    // Combine and sort by createdAt descending
    return [...userConnectors, ...globalConnectors].sort(
      (a, b) => b.createdAt - a.createdAt
    );
  },
});

/**
 * Get a single MCP connector by ID
 */
export const get = query({
  args: { connectorId: v.id("mcpConnectors") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.connectorId);
  },
});

/**
 * Check if a nameId already exists for a user
 */
export const getByNameId = query({
  args: {
    userId: v.optional(v.id("users")),
    nameId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("mcpConnectors")
      .withIndex("by_user_name_id", (q) =>
        q.eq("userId", args.userId).eq("nameId", args.nameId)
      )
      .unique();
  },
});

/**
 * Create a new MCP connector
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    url: v.string(),
    type: McpTransportType,
    oauthClientId: v.optional(v.string()),
    oauthClientSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate name length
    if (args.name.length > 20) {
      throw new Error("Name must be 20 characters or less");
    }

    // Generate nameId from name
    const nameIdResult = generateMcpNameId(args.name);
    if (!nameIdResult.ok) {
      throw new Error(nameIdResult.error);
    }

    // Check for duplicate nameId
    const existing = await ctx.db
      .query("mcpConnectors")
      .withIndex("by_user_name_id", (q) =>
        q.eq("userId", args.userId).eq("nameId", nameIdResult.nameId)
      )
      .unique();

    if (existing) {
      throw new Error(`A connector with the name "${args.name}" already exists`);
    }

    const now = Date.now();
    const connectorId = await ctx.db.insert("mcpConnectors", {
      userId: args.userId,
      name: args.name,
      nameId: nameIdResult.nameId,
      url: args.url,
      type: args.type,
      oauthClientId: args.oauthClientId,
      oauthClientSecret: args.oauthClientSecret,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    return { connectorId };
  },
});

/**
 * Update an MCP connector
 */
export const update = mutation({
  args: {
    connectorId: v.id("mcpConnectors"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    url: v.optional(v.string()),
    type: v.optional(McpTransportType),
    oauthClientId: v.optional(v.string()),
    oauthClientSecret: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.connectorId);

    if (!existing) {
      throw new Error("Connector not found");
    }

    // Only allow updating user-owned connectors (not global ones)
    if (existing.userId !== args.userId) {
      throw new Error("Cannot update this connector");
    }

    const patchData: Record<string, unknown> = { updatedAt: Date.now() };

    // If name is being updated, regenerate nameId
    if (args.name !== undefined) {
      if (args.name.length > 20) {
        throw new Error("Name must be 20 characters or less");
      }

      const nameIdResult = generateMcpNameId(args.name);
      if (!nameIdResult.ok) {
        throw new Error(nameIdResult.error);
      }

      // Check for duplicate nameId (excluding current connector)
      const duplicate = await ctx.db
        .query("mcpConnectors")
        .withIndex("by_user_name_id", (q) =>
          q.eq("userId", args.userId).eq("nameId", nameIdResult.nameId)
        )
        .unique();

      if (duplicate && duplicate._id !== args.connectorId) {
        throw new Error(`A connector with the name "${args.name}" already exists`);
      }

      patchData.name = args.name;
      patchData.nameId = nameIdResult.nameId;
    }

    if (args.url !== undefined) patchData.url = args.url;
    if (args.type !== undefined) patchData.type = args.type;
    if (args.oauthClientId !== undefined) patchData.oauthClientId = args.oauthClientId;
    if (args.oauthClientSecret !== undefined) patchData.oauthClientSecret = args.oauthClientSecret;
    if (args.enabled !== undefined) patchData.enabled = args.enabled;

    await ctx.db.patch(args.connectorId, patchData);

    return { success: true };
  },
});

/**
 * Toggle connector enabled state
 */
export const toggleEnabled = mutation({
  args: {
    connectorId: v.id("mcpConnectors"),
    userId: v.id("users"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.connectorId);

    if (!existing) {
      throw new Error("Connector not found");
    }

    // Only allow updating user-owned connectors (not global ones)
    if (existing.userId !== args.userId) {
      throw new Error("Cannot update this connector");
    }

    await ctx.db.patch(args.connectorId, {
      enabled: args.enabled,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete an MCP connector
 */
export const remove = mutation({
  args: {
    connectorId: v.id("mcpConnectors"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.connectorId);

    if (!existing) {
      throw new Error("Connector not found");
    }

    // Only allow deleting user-owned connectors (not global ones)
    if (existing.userId !== args.userId) {
      throw new Error("Cannot delete this connector");
    }

    await ctx.db.delete(args.connectorId);

    return { success: true };
  },
});

/**
 * List all enabled connectors for a user (for agent use)
 */
export const listEnabledByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get user's enabled connectors
    const userConnectors = await ctx.db
      .query("mcpConnectors")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("enabled"), true))
      .collect();

    // Get global enabled connectors
    const globalConnectors = await ctx.db
      .query("mcpConnectors")
      .withIndex("by_user", (q) => q.eq("userId", undefined))
      .filter((q) => q.eq(q.field("enabled"), true))
      .collect();

    return [...userConnectors, ...globalConnectors];
  },
});

/**
 * Discover capabilities from an MCP server
 * This is a simplified implementation for HTTP/SSE MCP servers
 */
async function discoverMcpCapabilities(connector: {
  url: string;
  type: "HTTP" | "SSE";
  oauthClientId?: string;
  oauthClientSecret?: string;
}): Promise<McpDiscoveryResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add OAuth credentials if provided
  if (connector.oauthClientId && connector.oauthClientSecret) {
    const credentials = Buffer.from(
      `${connector.oauthClientId}:${connector.oauthClientSecret}`
    ).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  }

  try {
    const toolsResponse = await fetch(connector.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!toolsResponse.ok) {
      throw new Error(`MCP server returned ${toolsResponse.status}`);
    }

    const toolsData = await toolsResponse.json();
    const tools = Array.isArray(toolsData.result?.tools)
      ? toolsData.result.tools.map((tool: { name: string; description?: string }) => ({
          name: tool.name,
          description: tool.description,
        }))
      : [];

    let resources: McpDiscoveryResult["resources"] = [];
    try {
      const resourcesResponse = await fetch(connector.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "resources/list",
          params: {},
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (resourcesResponse.ok) {
        const resourcesData = await resourcesResponse.json();
        resources = Array.isArray(resourcesData.result?.resources)
          ? resourcesData.result.resources.map(
              (resource: {
                name: string;
                uri: string;
                description?: string;
                mimeType?: string;
              }) => ({
                name: resource.name,
                uri: resource.uri,
                description: resource.description,
                mimeType: resource.mimeType,
              })
            )
          : [];
      }
    } catch {
      // Resources discovery failed, continue without them
    }

    let prompts: McpDiscoveryResult["prompts"] = [];
    try {
      const promptsResponse = await fetch(connector.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "prompts/list",
          params: {},
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (promptsResponse.ok) {
        const promptsData = await promptsResponse.json();
        prompts = Array.isArray(promptsData.result?.prompts)
          ? promptsData.result.prompts.map(
              (prompt: {
                name: string;
                description?: string;
                arguments?: Array<{
                  name: string;
                  description?: string;
                  required?: boolean;
                }>;
              }) => ({
                name: prompt.name,
                description: prompt.description,
                arguments: prompt.arguments,
              })
            )
          : [];
      }
    } catch {
      // Prompts discovery failed, continue without them
    }

    return { tools, resources, prompts };
  } catch (error) {
    console.error("Discovery error:", error);
    throw new Error(
      `Failed to connect to MCP server: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Discover tools, resources, and prompts from an MCP connector
 */
export const discover = action({
  args: {
    connectorId: v.id("mcpConnectors"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<McpDiscoveryResult> => {
    const connector = await ctx.runQuery(api.mcpConnectors.get, {
      connectorId: args.connectorId,
    });

    if (!connector) {
      throw new Error("Connector not found");
    }

    if (connector.userId && connector.userId !== args.userId) {
      throw new Error("Unauthorized");
    }

    return discoverMcpCapabilities({
      url: connector.url,
      type: connector.type,
      oauthClientId: connector.oauthClientId ?? undefined,
      oauthClientSecret: connector.oauthClientSecret ?? undefined,
    });
  },
});
