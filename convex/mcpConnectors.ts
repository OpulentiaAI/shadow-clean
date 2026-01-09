import { action, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { McpTransportType } from "./schema";
import { internal } from "./_generated/api";

/**
 * SSRF Protection: Validate MCP server URLs
 * Blocks internal IPs, loopback, link-local, and cloud metadata endpoints
 */
function validateMcpUrl(urlString: string): { ok: true } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { ok: false, error: "Invalid URL format" };
  }

  // Only allow HTTPS (or HTTP for localhost in dev - but we block localhost anyway)
  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Only HTTPS URLs are allowed for security" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost variants and bind-all
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname === "[::]" ||
    hostname.endsWith(".localhost")
  ) {
    return { ok: false, error: "Localhost URLs are not allowed" };
  }

  // Block common internal hostnames
  if (
    hostname === "metadata" ||
    hostname === "metadata.google.internal" ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) {
    return { ok: false, error: "Internal hostnames are not allowed" };
  }

  // Block IP address patterns (RFC 1918, loopback, link-local, metadata)
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = hostname.match(ipv4Pattern);
  if (ipMatch) {
    const parts = ipMatch.slice(1).map(Number);
    const a = parts[0] ?? 0;
    const b = parts[1] ?? 0;
    const d = parts[3] ?? 0;
    
    // Loopback (127.0.0.0/8)
    if (a === 127) {
      return { ok: false, error: "Loopback IP addresses are not allowed" };
    }
    
    // Private networks (RFC 1918)
    // 10.0.0.0/8
    if (a === 10) {
      return { ok: false, error: "Private IP addresses (10.x.x.x) are not allowed" };
    }
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) {
      return { ok: false, error: "Private IP addresses (172.16-31.x.x) are not allowed" };
    }
    // 192.168.0.0/16
    if (a === 192 && b === 168) {
      return { ok: false, error: "Private IP addresses (192.168.x.x) are not allowed" };
    }
    
    // Link-local (169.254.0.0/16) - includes AWS/GCP/Azure metadata
    if (a === 169 && b === 254) {
      return { ok: false, error: "Link-local/metadata IP addresses are not allowed" };
    }
    
    // Broadcast
    if (a === 255 || (a === d && d === 255)) {
      return { ok: false, error: "Broadcast addresses are not allowed" };
    }
  }

  return { ok: true };
}

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
 * Note: oauthClientSecret and configJson are redacted for security
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

    // Combine, sort, and redact secrets
    return [...userConnectors, ...globalConnectors]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((c) => ({
        ...c,
        oauthClientSecret: c.oauthClientSecret ? "[REDACTED]" : undefined,
        configJson: c.configJson ? "[CONFIGURED]" : undefined, // Redact config for security
      }));
  },
});

/**
 * Get a single MCP connector by ID (public - secrets redacted)
 */
export const get = query({
  args: { connectorId: v.id("mcpConnectors") },
  handler: async (ctx, args) => {
    const connector = await ctx.db.get(args.connectorId);
    if (!connector) return null;
    return {
      ...connector,
      oauthClientSecret: connector.oauthClientSecret ? "[REDACTED]" : undefined,
    };
  },
});

/**
 * Get a single MCP connector by ID with secrets (internal use only for discover action)
 */
export const getWithSecrets = internalQuery({
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
    templateId: v.optional(v.string()),
    configJson: v.optional(v.string()),
    oauthClientId: v.optional(v.string()),
    oauthClientSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate name length
    if (args.name.length > 20) {
      throw new Error("Name must be 20 characters or less");
    }

    // SECURITY: Validate URL at creation time (not just at discovery)
    // This prevents malicious URLs from being stored in the database
    const urlValidation = validateMcpUrl(args.url);
    if (!urlValidation.ok) {
      throw new Error(`Invalid MCP URL: ${urlValidation.error}`);
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
      templateId: args.templateId,
      configJson: args.configJson,
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
    templateId: v.optional(v.string()),
    configJson: v.optional(v.string()),
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

    if (args.url !== undefined) {
      // SECURITY: Validate URL on update as well
      const urlValidation = validateMcpUrl(args.url);
      if (!urlValidation.ok) {
        throw new Error(`Invalid MCP URL: ${urlValidation.error}`);
      }
      patchData.url = args.url;
    }
    if (args.type !== undefined) patchData.type = args.type;
    if (args.templateId !== undefined) patchData.templateId = args.templateId;
    if (args.configJson !== undefined) patchData.configJson = args.configJson;
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
 * Parse config JSON and extract environment variables for MCP calls
 */
function parseConfigJson(configJson?: string): Record<string, string> {
  if (!configJson) return {};
  try {
    const parsed = JSON.parse(configJson) as { variables?: Record<string, string> };
    return parsed.variables || {};
  } catch {
    return {};
  }
}

/**
 * Discover capabilities from an MCP server
 * This is a simplified implementation for HTTP/SSE MCP servers
 */
async function discoverMcpCapabilities(connector: {
  url: string;
  type: "HTTP" | "SSE";
  configJson?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
}): Promise<McpDiscoveryResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Parse stored config and add as custom headers
  // MCP servers can read these to authenticate with their backing services
  const configVars = parseConfigJson(connector.configJson);
  if (Object.keys(configVars).length > 0) {
    // Pass config as a JSON-encoded header that MCP servers can parse
    headers["X-MCP-Config"] = Buffer.from(JSON.stringify(configVars)).toString("base64");
  }

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

    const toolsData = (await toolsResponse.json()) as { result?: { tools?: Array<{ name: string; description?: string }> } };
    const tools = Array.isArray(toolsData.result?.tools)
      ? toolsData.result.tools.map((tool) => ({
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
        const resourcesData = (await resourcesResponse.json()) as { result?: { resources?: Array<{ name: string; uri: string; description?: string; mimeType?: string }> } };
        resources = Array.isArray(resourcesData.result?.resources)
          ? resourcesData.result.resources.map((resource) => ({
                name: resource.name,
                uri: resource.uri,
                description: resource.description,
                mimeType: resource.mimeType,
              }))
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
        const promptsData = (await promptsResponse.json()) as { result?: { prompts?: Array<{ name: string; description?: string; arguments?: Array<{ name: string; description?: string; required?: boolean }> }> } };
        prompts = Array.isArray(promptsData.result?.prompts)
          ? promptsData.result.prompts.map((prompt) => ({
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
    // Use internal query to get connector with secrets (not redacted)
    const connector = await ctx.runQuery(internal.mcpConnectors.getWithSecrets, {
      connectorId: args.connectorId,
    });

    if (!connector) {
      throw new Error("Connector not found");
    }

    if (connector.userId && connector.userId !== args.userId) {
      throw new Error("Unauthorized");
    }

    // SSRF Protection: Validate URL before making external request
    const urlValidation = validateMcpUrl(connector.url);
    if (!urlValidation.ok) {
      throw new Error(`Invalid MCP URL: ${urlValidation.error}`);
    }

    return discoverMcpCapabilities({
      url: connector.url,
      type: connector.type,
      configJson: connector.configJson ?? undefined,
      oauthClientId: connector.oauthClientId ?? undefined,
      oauthClientSecret: connector.oauthClientSecret ?? undefined,
    });
  },
});
