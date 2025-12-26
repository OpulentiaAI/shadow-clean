"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { McpConnector, McpDiscoveryResult } from "@repo/types";
import { useMcpConnectors } from "./use-mcp-connectors";
import { useConvexUserByExternalId } from "@/lib/convex/hooks";
import { useAuthSession } from "@/components/auth/session-provider";
import { toConvexId } from "@/lib/convex/id";

export interface McpToolInfo {
  connectorId: string;
  connectorName: string;
  tool: {
    name: string;
    description?: string;
  };
}

export interface McpConnectorWithTools extends McpConnector {
  tools: Array<{ name: string; description?: string }>;
  isDiscovering: boolean;
  discoveryError: string | null;
}

/**
 * Hook to get all MCP tools from enabled connectors
 * Automatically discovers tools when connectors are enabled
 */
export function useMcpTools() {
  const { session } = useAuthSession();
  const user = useConvexUserByExternalId(session?.user?.id);
  const { data: connectors, isLoading: isLoadingConnectors } = useMcpConnectors();
  const discover = useAction(api.mcpConnectors.discover);

  const [discoveredTools, setDiscoveredTools] = useState<
    Record<string, { tools: McpDiscoveryResult["tools"]; error: string | null; loading: boolean }>
  >({});

  // Get enabled connectors
  const enabledConnectors = useMemo(
    () => connectors?.filter((c) => c.enabled) ?? [],
    [connectors]
  );

  // Discover tools for enabled connectors
  const discoverTools = useCallback(
    async (connectorId: string) => {
      if (!user?._id) return;

      setDiscoveredTools((prev) => ({
        ...prev,
        [connectorId]: { tools: prev[connectorId]?.tools ?? [], error: null, loading: true },
      }));

      try {
        const result = await discover({
          connectorId: toConvexId("mcpConnectors", connectorId),
          userId: user._id,
        });

        setDiscoveredTools((prev) => ({
          ...prev,
          [connectorId]: { tools: result.tools, error: null, loading: false },
        }));
      } catch (err) {
        setDiscoveredTools((prev) => ({
          ...prev,
          [connectorId]: {
            tools: [],
            error: err instanceof Error ? err.message : "Discovery failed",
            loading: false,
          },
        }));
      }
    },
    [discover, user?._id]
  );

  // Auto-discover tools when connectors become enabled
  useEffect(() => {
    if (!user?._id) return;

    for (const connector of enabledConnectors) {
      // Only discover if we haven't already and not currently loading
      if (!discoveredTools[connector.id] || discoveredTools[connector.id]?.error) {
        discoverTools(connector.id);
      }
    }
  }, [enabledConnectors, user?._id, discoverTools, discoveredTools]);

  // Combine connectors with their discovered tools
  const connectorsWithTools: McpConnectorWithTools[] = useMemo(() => {
    return (connectors ?? []).map((connector) => ({
      ...connector,
      tools: discoveredTools[connector.id]?.tools ?? [],
      isDiscovering: discoveredTools[connector.id]?.loading ?? false,
      discoveryError: discoveredTools[connector.id]?.error ?? null,
    }));
  }, [connectors, discoveredTools]);

  // Flat list of all tools from enabled connectors
  const allTools: McpToolInfo[] = useMemo(() => {
    return enabledConnectors.flatMap((connector) => {
      const tools = discoveredTools[connector.id]?.tools ?? [];
      return tools.map((tool) => ({
        connectorId: connector.id,
        connectorName: connector.name,
        tool,
      }));
    });
  }, [enabledConnectors, discoveredTools]);

  // Total enabled tools count
  const enabledToolsCount = allTools.length;

  // Check if any connector is discovering
  const isDiscovering = Object.values(discoveredTools).some((d) => d.loading);

  return {
    connectors: connectorsWithTools,
    enabledConnectors: connectorsWithTools.filter((c) => c.enabled),
    allTools,
    enabledToolsCount,
    isLoading: isLoadingConnectors,
    isDiscovering,
    discoverTools,
    refetchTools: (connectorId: string) => discoverTools(connectorId),
  };
}
