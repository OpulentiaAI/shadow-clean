// MCP Manager - Temporarily disabled pending @ai-sdk/mcp integration
// The experimental_createMCPClient was removed in AI SDK v5
// MCP will be re-enabled once @ai-sdk/mcp package is properly integrated

import type { ToolSet } from "ai";
import type { MCPServerConfig, MCPClientWrapper } from "./types";

const MCP_SERVERS: MCPServerConfig[] = [
  {
    name: "context7",
    transport: "sse",
    url: process.env.MCP_CONTEXT7_URL || "https://mcp.context7.com/sse",
    enabled: process.env.MCP_CONTEXT7_ENABLED !== "false", // Default to enabled
    timeout: 30000, // 30 second timeout
    headers: {
      "User-Agent": "Shadow-Agent/1.0",
    },
  },
];

export class MCPManager {
  private clients: Map<string, MCPClientWrapper> = new Map();

  async initializeConnections(): Promise<void> {
    // MCP client creation is temporarily disabled
    // This will be re-enabled once @ai-sdk/mcp is integrated
    console.log("[MCP_MANAGER] MCP connections disabled pending @ai-sdk/mcp integration");

    for (const config of MCP_SERVERS) {
      this.clients.set(config.name, {
        serverName: config.name,
        client: null,
        connected: false,
        lastError: "MCP temporarily disabled - pending @ai-sdk/mcp integration",
      });
    }
  }

  /**
   * Get all available tools from connected MCP servers
   * Currently returns empty toolset while MCP is disabled
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAvailableTools(_serverName?: string): Promise<ToolSet> {
    // Return empty toolset while MCP is disabled
    return {};
  }

  /**
   * Get connection status for all MCP servers
   */
  getConnectionStatus(): Array<{ name: string; connected: boolean; error?: string }> {
    return Array.from(this.clients.entries()).map(([name, wrapper]) => ({
      name,
      connected: wrapper.connected,
      error: wrapper.lastError,
    }));
  }

  /**
   * Close all MCP connections
   */
  async closeAllConnections(): Promise<void> {
    this.clients.clear();
    console.log("[MCP_MANAGER] All MCP connections closed");
  }
}
