import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { McpConnector, McpConnectorFormData, McpDiscoveryResult } from "@repo/types";

const MCP_CONNECTORS_QUERY_KEY = ["mcp-connectors"];

interface McpConnectorResponse {
  success: boolean;
  connector?: McpConnector;
  connectors?: McpConnector[];
  error?: string;
}

interface McpDiscoveryResponse {
  success: boolean;
  discovery?: McpDiscoveryResult;
  error?: string;
}

/**
 * Fetch all MCP connectors for the current user
 */
export function useMcpConnectors() {
  return useQuery<McpConnector[]>({
    queryKey: MCP_CONNECTORS_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/mcp-connectors");
      const data: McpConnectorResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch MCP connectors");
      }

      return data.connectors || [];
    },
  });
}

/**
 * Create a new MCP connector
 */
export function useCreateMcpConnector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: McpConnectorFormData) => {
      const response = await fetch("/api/mcp-connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result: McpConnectorResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create MCP connector");
      }

      return result.connector;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MCP_CONNECTORS_QUERY_KEY });
    },
  });
}

/**
 * Update an MCP connector
 */
export function useUpdateMcpConnector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<McpConnectorFormData> & { enabled?: boolean };
    }) => {
      const response = await fetch(`/api/mcp-connectors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const result: McpConnectorResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update MCP connector");
      }

      return result.connector;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MCP_CONNECTORS_QUERY_KEY });
    },
  });
}

/**
 * Delete an MCP connector
 */
export function useDeleteMcpConnector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/mcp-connectors/${id}`, {
        method: "DELETE",
      });

      const result: McpConnectorResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to delete MCP connector");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MCP_CONNECTORS_QUERY_KEY });
    },
  });
}

/**
 * Toggle connector enabled state with optimistic updates
 */
export function useToggleMcpConnector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await fetch(`/api/mcp-connectors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      const result: McpConnectorResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to toggle MCP connector");
      }

      return result.connector;
    },
    onMutate: async ({ id, enabled }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: MCP_CONNECTORS_QUERY_KEY });

      // Snapshot the previous value
      const previousConnectors = queryClient.getQueryData<McpConnector[]>(MCP_CONNECTORS_QUERY_KEY);

      // Optimistically update
      if (previousConnectors) {
        queryClient.setQueryData<McpConnector[]>(
          MCP_CONNECTORS_QUERY_KEY,
          previousConnectors.map((c) =>
            c.id === id ? { ...c, enabled } : c
          )
        );
      }

      return { previousConnectors };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousConnectors) {
        queryClient.setQueryData(MCP_CONNECTORS_QUERY_KEY, context.previousConnectors);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: MCP_CONNECTORS_QUERY_KEY });
    },
  });
}

/**
 * Discover tools from an MCP connector
 */
export function useMcpDiscovery(connectorId: string | null) {
  return useQuery<McpDiscoveryResult>({
    queryKey: ["mcp-discovery", connectorId],
    queryFn: async () => {
      if (!connectorId) {
        throw new Error("No connector ID provided");
      }

      const response = await fetch(`/api/mcp-connectors/${connectorId}/discover`);
      const data: McpDiscoveryResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to discover MCP capabilities");
      }

      return data.discovery || { tools: [], resources: [], prompts: [] };
    },
    enabled: !!connectorId,
    staleTime: 30000, // Cache for 30 seconds
    retry: 1,
  });
}
