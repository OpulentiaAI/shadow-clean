import { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import type {
  McpConnector,
  McpConnectorFormData,
  McpDiscoveryResult,
} from "@repo/types";
import { useAuthSession } from "@/components/auth/session-provider";
import {
  useConvexUserByExternalId,
  useUpsertUser,
} from "@/lib/convex/hooks";
import { toConvexId } from "@/lib/convex/id";

type MutationState<TArgs, TResult> = {
  mutateAsync: (args: TArgs) => Promise<TResult>;
  isPending: boolean;
};

function mapConnector(doc: any): McpConnector {
  return {
    id: doc._id?.toString?.() ?? "",
    userId: doc.userId ? doc.userId.toString() : null,
    name: doc.name ?? "",
    nameId: doc.nameId ?? "",
    url: doc.url ?? "",
    type: doc.type ?? "HTTP",
    oauthClientId: doc.oauthClientId ?? null,
    oauthClientSecret: doc.oauthClientSecret ?? null,
    enabled: Boolean(doc.enabled),
    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(0),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(0),
  };
}

function useConvexUserId() {
  const { session, isLoading: isLoadingSession } = useAuthSession();
  const externalId = session?.user?.id;
  const user = useConvexUserByExternalId(externalId);
  const upsertUser = useUpsertUser();
  const [isUpserting, setIsUpserting] = useState(false);

  useEffect(() => {
    if (!externalId || isLoadingSession || user !== null || isUpserting) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setIsUpserting(true);
      try {
        await upsertUser({
          externalId,
          name: session?.user?.name ?? session?.user?.email ?? "Unknown User",
          email: session?.user?.email ?? "unknown@user.local",
          image: session?.user?.image ?? undefined,
          emailVerified: false,
        });
      } catch (error) {
        console.warn("[mcp-connectors] Failed to upsert user", error);
      } finally {
        if (!cancelled) {
          setIsUpserting(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    externalId,
    isLoadingSession,
    user,
    isUpserting,
    upsertUser,
    session?.user?.name,
    session?.user?.email,
    session?.user?.image,
  ]);

  const userId = (user?._id ?? undefined) as Id<"users"> | undefined;
  const isLoading =
    isLoadingSession || (externalId ? user === undefined || isUpserting : false);

  return {
    userId,
    isLoading,
    hasSession: Boolean(session?.user),
  };
}

/**
 * Fetch all MCP connectors for the current user
 */
export function useMcpConnectors(): {
  data: McpConnector[] | undefined;
  isLoading: boolean;
} {
  const { userId, isLoading: isUserLoading, hasSession } = useConvexUserId();
  const connectors = useQuery(
    api.mcpConnectors.listByUser,
    userId ? { userId } : "skip"
  );

  const mapped = useMemo(
    () => (connectors ? connectors.map(mapConnector) : []),
    [connectors]
  );

  const isLoading =
    isUserLoading || (userId ? connectors === undefined : false);
  const data = connectors ? mapped : hasSession ? undefined : [];

  return { data, isLoading };
}

/**
 * Create a new MCP connector
 */
export function useCreateMcpConnector(): MutationState<
  McpConnectorFormData,
  { connectorId: Id<"mcpConnectors"> }
> {
  const { userId } = useConvexUserId();
  const create = useMutation(api.mcpConnectors.create);
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (data: McpConnectorFormData) => {
    if (!userId) {
      throw new Error("User not available");
    }
    setIsPending(true);
    try {
      return await create({ userId, ...data });
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
}

/**
 * Update an MCP connector
 */
export function useUpdateMcpConnector(): MutationState<
  {
    id: string;
    updates: Partial<McpConnectorFormData> & { enabled?: boolean };
  },
  { success: boolean }
> {
  const { userId } = useConvexUserId();
  const update = useMutation(api.mcpConnectors.update);
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async ({
    id,
    updates,
  }: {
    id: string;
    updates: Partial<McpConnectorFormData> & { enabled?: boolean };
  }) => {
    if (!userId) {
      throw new Error("User not available");
    }
    setIsPending(true);
    try {
      return await update({
        connectorId: toConvexId("mcpConnectors", id),
        userId,
        ...updates,
      });
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
}

/**
 * Delete an MCP connector
 */
export function useDeleteMcpConnector(): MutationState<string, { success: boolean }> {
  const { userId } = useConvexUserId();
  const remove = useMutation(api.mcpConnectors.remove);
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (id: string) => {
    if (!userId) {
      throw new Error("User not available");
    }
    setIsPending(true);
    try {
      return await remove({
        connectorId: toConvexId("mcpConnectors", id),
        userId,
      });
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
}

/**
 * Toggle connector enabled state
 */
export function useToggleMcpConnector(): MutationState<
  { id: string; enabled: boolean },
  { success: boolean }
> {
  const { userId } = useConvexUserId();
  const toggle = useMutation(api.mcpConnectors.toggleEnabled);
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async ({ id, enabled }: { id: string; enabled: boolean }) => {
    if (!userId) {
      throw new Error("User not available");
    }
    setIsPending(true);
    try {
      return await toggle({
        connectorId: toConvexId("mcpConnectors", id),
        userId,
        enabled,
      });
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
}

/**
 * Discover tools from an MCP connector
 */
export function useMcpDiscovery(connectorId: string | null): {
  data: McpDiscoveryResult | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { userId, isLoading: isUserLoading } = useConvexUserId();
  const discover = useAction(api.mcpConnectors.discover);
  const [data, setData] = useState<McpDiscoveryResult | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!connectorId || !userId) {
      setData(undefined);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await discover({
          connectorId: toConvexId("mcpConnectors", connectorId),
          userId,
        });
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [connectorId, userId, discover]);

  return { data, isLoading: isUserLoading || isLoading, error };
}
