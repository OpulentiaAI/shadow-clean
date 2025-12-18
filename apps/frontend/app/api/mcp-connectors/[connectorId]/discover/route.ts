import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/get-user";
import { getMcpConnectorById } from "@/lib/db-operations/mcp-connectors";
import type { McpDiscoveryResult } from "@repo/types";

interface RouteParams {
  params: Promise<{ connectorId: string }>;
}

/**
 * GET /api/mcp-connectors/[connectorId]/discover
 * Discover tools, resources, and prompts from an MCP connector
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectorId } = await params;
    const connector = await getMcpConnectorById(connectorId);

    if (!connector) {
      return NextResponse.json(
        { error: "Connector not found" },
        { status: 404 }
      );
    }

    // Check if user has access (either owner or global connector)
    if (connector.userId !== null && connector.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Attempt to discover capabilities from the MCP server
    // This is a simplified implementation - in production you'd use @modelcontextprotocol/sdk
    const discoveryResult = await discoverMcpCapabilities(connector);

    return NextResponse.json({ success: true, discovery: discoveryResult });
  } catch (error) {
    console.error("Error discovering MCP capabilities:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to discover MCP capabilities",
      },
      { status: 500 }
    );
  }
}

/**
 * Discover capabilities from an MCP server
 * This is a simplified implementation for HTTP/SSE MCP servers
 */
async function discoverMcpCapabilities(
  connector: { url: string; type: string; oauthClientId: string | null; oauthClientSecret: string | null }
): Promise<McpDiscoveryResult> {
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

  // For HTTP MCP servers, we need to call the appropriate endpoints
  // This is a simplified discovery that attempts to list tools
  try {
    // Try to discover tools using JSON-RPC format
    const toolsResponse = await fetch(connector.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!toolsResponse.ok) {
      throw new Error(`MCP server returned ${toolsResponse.status}`);
    }

    const toolsData = await toolsResponse.json();

    // Parse the response based on JSON-RPC format
    const tools = Array.isArray(toolsData.result?.tools)
      ? toolsData.result.tools.map((tool: { name: string; description?: string }) => ({
          name: tool.name,
          description: tool.description,
        }))
      : [];

    // Attempt to discover resources
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
          ? resourcesData.result.resources.map((r: { name: string; uri: string; description?: string; mimeType?: string }) => ({
              name: r.name,
              uri: r.uri,
              description: r.description,
              mimeType: r.mimeType,
            }))
          : [];
      }
    } catch {
      // Resources discovery failed, continue without them
    }

    // Attempt to discover prompts
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
          ? promptsData.result.prompts.map((p: { name: string; description?: string; arguments?: Array<{ name: string; description?: string; required?: boolean }> }) => ({
              name: p.name,
              description: p.description,
              arguments: p.arguments,
            }))
          : [];
      }
    } catch {
      // Prompts discovery failed, continue without them
    }

    return { tools, resources, prompts };
  } catch (error) {
    console.error("Discovery error:", error);
    throw new Error(
      `Failed to connect to MCP server: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
