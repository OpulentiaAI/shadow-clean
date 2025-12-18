import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/get-user";
import {
  getMcpConnectorById,
  updateMcpConnector,
  deleteMcpConnector,
} from "@/lib/db-operations/mcp-connectors";
import type { McpTransportType } from "@repo/types";

interface RouteParams {
  params: Promise<{ connectorId: string }>;
}

/**
 * GET /api/mcp-connectors/[connectorId]
 * Get a single MCP connector by ID
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

    return NextResponse.json({ success: true, connector });
  } catch (error) {
    console.error("Error fetching MCP connector:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch MCP connector" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/mcp-connectors/[connectorId]
 * Update an MCP connector
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectorId } = await params;
    const body = await request.json();
    const { name, url, type, oauthClientId, oauthClientSecret, enabled } = body;

    // Build updates object with only provided fields
    const updates: {
      name?: string;
      url?: string;
      type?: McpTransportType;
      oauthClientId?: string;
      oauthClientSecret?: string;
      enabled?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string") {
        return NextResponse.json(
          { error: "Name must be a string" },
          { status: 400 }
        );
      }
      if (name.length > 20) {
        return NextResponse.json(
          { error: "Name must be 20 characters or less" },
          { status: 400 }
        );
      }
      updates.name = name;
    }

    if (url !== undefined) {
      if (typeof url !== "string") {
        return NextResponse.json(
          { error: "URL must be a string" },
          { status: 400 }
        );
      }
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }
      updates.url = url;
    }

    if (type !== undefined) {
      const validTypes: McpTransportType[] = ["HTTP", "SSE"];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: "Type must be 'HTTP' or 'SSE'" },
          { status: 400 }
        );
      }
      updates.type = type;
    }

    if (oauthClientId !== undefined) {
      updates.oauthClientId = oauthClientId;
    }

    if (oauthClientSecret !== undefined) {
      updates.oauthClientSecret = oauthClientSecret;
    }

    if (enabled !== undefined) {
      if (typeof enabled !== "boolean") {
        return NextResponse.json(
          { error: "Enabled must be a boolean" },
          { status: 400 }
        );
      }
      updates.enabled = enabled;
    }

    const connector = await updateMcpConnector(connectorId, user.id, updates);

    return NextResponse.json({ success: true, connector });
  } catch (error) {
    console.error("Error updating MCP connector:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update MCP connector",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mcp-connectors/[connectorId]
 * Delete an MCP connector
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectorId } = await params;

    await deleteMcpConnector(connectorId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting MCP connector:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete MCP connector",
      },
      { status: 500 }
    );
  }
}
