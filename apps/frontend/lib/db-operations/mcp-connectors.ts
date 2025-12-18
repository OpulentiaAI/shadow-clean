import { prisma, McpTransportType as PrismaMcpTransportType } from "@repo/db";
import type { McpConnector, McpTransportType, McpConnectorFormData } from "@repo/types";

/**
 * Generate a nameId from connector name for tool namespacing
 */
export function generateMcpNameId(name: string): { ok: true; nameId: string } | { ok: false; error: string } {
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
 * Get all MCP connectors for a user (including global connectors)
 */
export async function getMcpConnectorsByUserId(userId: string): Promise<McpConnector[]> {
  const connectors = await prisma.mcpConnector.findMany({
    where: {
      OR: [
        { userId },
        { userId: null }, // Global connectors
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return connectors.map(c => ({
    ...c,
    type: c.type as McpTransportType,
  }));
}

/**
 * Get a single MCP connector by ID
 */
export async function getMcpConnectorById(id: string): Promise<McpConnector | null> {
  const connector = await prisma.mcpConnector.findUnique({
    where: { id },
  });

  if (!connector) return null;

  return {
    ...connector,
    type: connector.type as McpTransportType,
  };
}

/**
 * Check if a nameId already exists for a user
 */
export async function getMcpConnectorByNameId(
  userId: string | null,
  nameId: string,
  excludeId?: string
): Promise<McpConnector | null> {
  const whereClause: {
    nameId: string;
    userId?: string | null;
    NOT?: { id: string };
  } = { nameId };

  if (userId) {
    // Check for user connectors or global connectors with same nameId
    whereClause.userId = userId;
  } else {
    whereClause.userId = null;
  }

  if (excludeId) {
    whereClause.NOT = { id: excludeId };
  }

  const connector = await prisma.mcpConnector.findFirst({
    where: whereClause,
  });

  if (!connector) return null;

  return {
    ...connector,
    type: connector.type as McpTransportType,
  };
}

/**
 * Create a new MCP connector
 */
export async function createMcpConnector(
  userId: string,
  data: McpConnectorFormData
): Promise<McpConnector> {
  // Generate nameId from name
  const nameIdResult = generateMcpNameId(data.name);
  if (!nameIdResult.ok) {
    throw new Error(nameIdResult.error);
  }

  // Check for duplicate nameId
  const existing = await getMcpConnectorByNameId(userId, nameIdResult.nameId);
  if (existing) {
    throw new Error(`A connector with the name "${data.name}" already exists`);
  }

  const connector = await prisma.mcpConnector.create({
    data: {
      userId,
      name: data.name,
      nameId: nameIdResult.nameId,
      url: data.url,
      type: data.type,
      oauthClientId: data.oauthClientId || null,
      oauthClientSecret: data.oauthClientSecret || null,
      enabled: true,
    },
  });

  return {
    ...connector,
    type: connector.type as McpTransportType,
  };
}

/**
 * Update an MCP connector
 */
export async function updateMcpConnector(
  id: string,
  userId: string,
  updates: Partial<McpConnectorFormData> & { enabled?: boolean }
): Promise<McpConnector> {
  // First verify ownership
  const existing = await prisma.mcpConnector.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Connector not found");
  }

  // Only allow updating user-owned connectors (not global ones)
  if (existing.userId !== userId) {
    throw new Error("Cannot update this connector");
  }

  const updateData: {
    name?: string;
    nameId?: string;
    url?: string;
    type?: PrismaMcpTransportType;
    oauthClientId?: string | null;
    oauthClientSecret?: string | null;
    enabled?: boolean;
  } = {};

  // If name is being updated, regenerate nameId
  if (updates.name !== undefined) {
    const nameIdResult = generateMcpNameId(updates.name);
    if (!nameIdResult.ok) {
      throw new Error(nameIdResult.error);
    }

    // Check for duplicate nameId (excluding current connector)
    const duplicate = await getMcpConnectorByNameId(userId, nameIdResult.nameId, id);
    if (duplicate) {
      throw new Error(`A connector with the name "${updates.name}" already exists`);
    }

    updateData.name = updates.name;
    updateData.nameId = nameIdResult.nameId;
  }

  if (updates.url !== undefined) updateData.url = updates.url;
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.oauthClientId !== undefined) updateData.oauthClientId = updates.oauthClientId || null;
  if (updates.oauthClientSecret !== undefined) updateData.oauthClientSecret = updates.oauthClientSecret || null;
  if (updates.enabled !== undefined) updateData.enabled = updates.enabled;

  const connector = await prisma.mcpConnector.update({
    where: { id },
    data: updateData,
  });

  return {
    ...connector,
    type: connector.type as McpTransportType,
  };
}

/**
 * Delete an MCP connector
 */
export async function deleteMcpConnector(id: string, userId: string): Promise<void> {
  // First verify ownership
  const existing = await prisma.mcpConnector.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Connector not found");
  }

  // Only allow deleting user-owned connectors (not global ones)
  if (existing.userId !== userId) {
    throw new Error("Cannot delete this connector");
  }

  await prisma.mcpConnector.delete({
    where: { id },
  });
}

/**
 * Toggle connector enabled state
 */
export async function toggleMcpConnectorEnabled(
  id: string,
  userId: string,
  enabled: boolean
): Promise<McpConnector> {
  return updateMcpConnector(id, userId, { enabled });
}
