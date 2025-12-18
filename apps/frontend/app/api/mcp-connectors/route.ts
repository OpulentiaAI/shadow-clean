import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/get-user";
import {
  getMcpConnectorsByUserId,
  createMcpConnector,
} from "@/lib/db-operations/mcp-connectors";
import type { McpTransportType } from "@repo/types";

/**
 * GET /api/mcp-connectors
 * List all MCP connectors for the authenticated user (including global ones)
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectors = await getMcpConnectorsByUserId(user.id);

    return NextResponse.json({ success: true, connectors });
  } catch (error) {
    console.error("Error fetching MCP connectors:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch MCP connectors" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp-connectors
 * Create a new MCP connector
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, url, type, oauthClientId, oauthClientSecret } = body;

    // Validate required fields
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (name.length > 20) {
      return NextResponse.json(
        { error: "Name must be 20 characters or less" },
        { status: 400 }
      );
    }

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Validate transport type
    const validTypes: McpTransportType[] = ["HTTP", "SSE"];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'HTTP' or 'SSE'" },
        { status: 400 }
      );
    }

    const connector = await createMcpConnector(user.id, {
      name,
      url,
      type,
      oauthClientId,
      oauthClientSecret,
    });

    return NextResponse.json({ success: true, connector });
  } catch (error) {
    console.error("Error creating MCP connector:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create MCP connector",
      },
      { status: 500 }
    );
  }
}
