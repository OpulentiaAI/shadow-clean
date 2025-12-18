/**
 * Shared MCP (Model Context Protocol) types used across backend and frontend
 */

/**
 * MCP transport type (matches Prisma enum)
 */
export type McpTransportType = 'HTTP' | 'SSE';

/**
 * MCP connector stored in database
 */
export interface McpConnector {
  id: string;
  userId: string | null; // null = global connector
  name: string;
  nameId: string;
  url: string;
  type: McpTransportType;
  oauthClientId: string | null;
  oauthClientSecret: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Form data for creating/updating MCP connector
 */
export interface McpConnectorFormData {
  name: string;
  url: string;
  type: McpTransportType;
  oauthClientId?: string;
  oauthClientSecret?: string;
}

/**
 * MCP tool discovered from a connector
 */
export interface McpDiscoveredTool {
  name: string;
  description?: string;
}

/**
 * MCP resource discovered from a connector
 */
export interface McpDiscoveredResource {
  name: string;
  uri: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP prompt discovered from a connector
 */
export interface McpDiscoveredPrompt {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

/**
 * Discovery result from an MCP connector
 */
export interface McpDiscoveryResult {
  tools: McpDiscoveredTool[];
  resources: McpDiscoveredResource[];
  prompts: McpDiscoveredPrompt[];
}

/**
 * MCP tool metadata for tracking original and transformed names
 */
export interface MCPToolMeta {
  originalName: string;
  transformedName: string;
  serverName: string;
  toolName: string;
}

/**
 * MCP server configuration options
 */
export interface MCPServerConfig {
  name: string;
  transport: 'sse' | 'stdio' | 'http';
  url?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
  enabled?: boolean;
}

/**
 * MCP connection status for monitoring
 */
export interface MCPConnectionStatus {
  serverName: string;
  connected: boolean;
  lastConnected?: Date;
  lastError?: string;
  toolCount: number;
}

/**
 * MCP client wrapper for managing connections
 */
export interface MCPClientWrapper {
  serverName: string;
  client: any; // MCP client instance (varies by transport)
  connected: boolean;
  lastConnected?: Date;
  lastError?: string;
}

/**
 * MCP tool information for display and management
 */
export interface MCPToolInfo {
  name: string;
  serverName: string;
  description: string;
}

/**
 * MCP tool wrapper that includes metadata and execution function
 */
export interface MCPToolWrapper {
  execute: (params: Record<string, unknown>) => Promise<unknown>;
  description: string;
  parameters: unknown;
  meta: MCPToolMeta;
}