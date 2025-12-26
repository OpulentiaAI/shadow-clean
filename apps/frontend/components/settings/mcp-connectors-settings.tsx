"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { McpConnector } from "@repo/types";
import {
  useMcpConnectors,
  useToggleMcpConnector,
  useDeleteMcpConnector,
} from "@/hooks/mcp/use-mcp-connectors";
import { McpConfigDialog } from "./mcp-config-dialog";
import { McpDetailsDialog } from "./mcp-details-dialog";
import { McpConnectorTemplates } from "./mcp-connector-templates";

export function McpConnectorsSettings() {
  const { data: connectors, isLoading } = useMcpConnectors();
  const toggleMutation = useToggleMcpConnector();
  const deleteMutation = useDeleteMcpConnector();

  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [editingConnector, setEditingConnector] = useState<McpConnector | null>(
    null
  );
  const [viewingConnector, setViewingConnector] = useState<McpConnector | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleToggle = async (connector: McpConnector, enabled: boolean) => {
    try {
      await toggleMutation.mutateAsync({ id: connector.id, enabled });
      toast.success(`Connector ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle connector"
      );
    }
  };

  const handleDelete = async (connector: McpConnector) => {
    setDeletingId(connector.id);
    try {
      await deleteMutation.mutateAsync(connector.id);
      toast.success("Connector deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete connector"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (connector: McpConnector) => {
    setEditingConnector(connector);
    setIsConfigDialogOpen(true);
  };

  const handleView = (connector: McpConnector) => {
    setViewingConnector(connector);
  };

  const handleAddNew = () => {
    setEditingConnector(null);
    setIsConfigDialogOpen(true);
  };

  const getFaviconUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`;
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">MCP Connectors</h3>
          <p className="text-muted-foreground text-xs">
            Connect to external MCP servers to add tools to your agent.
          </p>
        </div>
        <Button size="sm" onClick={handleAddNew}>
          <Plus className="mr-1 size-4" />
          Add
        </Button>
      </div>

      {!connectors || connectors.length === 0 ? (
        <div className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
          No MCP connectors configured.
          <br />
          <button
            onClick={handleAddNew}
            className="text-primary hover:underline"
          >
            Add your first connector
          </button>
        </div>
      ) : (
        <div className="divide-y rounded-md border">
          {connectors.map((connector) => {
            const isGlobal = connector.userId === null;
            const faviconUrl = getFaviconUrl(connector.url);
            const isDeleting = deletingId === connector.id;

            return (
              <div
                key={connector.id}
                className="flex items-center justify-between p-3"
              >
                <div className="flex items-center gap-3">
                  {connector.type === "HTTP" && faviconUrl ? (
                    <img
                      src={faviconUrl}
                      alt=""
                      className="size-5 rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="bg-muted size-5 rounded" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {connector.name}
                      </span>
                      {isGlobal && (
                        <Badge variant="secondary" className="text-xs">
                          Global
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-muted-foreground text-xs"
                      >
                        {connector.type}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground max-w-[200px] truncate text-xs">
                      {connector.url}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={connector.enabled}
                    onCheckedChange={(enabled) =>
                      handleToggle(connector, enabled)
                    }
                    disabled={isGlobal || toggleMutation.isPending}
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="size-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(connector)}>
                        <Eye className="mr-2 size-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => window.open(connector.url, "_blank")}
                      >
                        <ExternalLink className="mr-2 size-4" />
                        Open URL
                      </DropdownMenuItem>
                      {!isGlobal && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleEdit(connector)}
                          >
                            <Pencil className="mr-2 size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(connector)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <McpConfigDialog
        open={isConfigDialogOpen}
        onOpenChange={(open) => {
          setIsConfigDialogOpen(open);
          if (!open) setEditingConnector(null);
        }}
        connector={editingConnector}
      />

      <McpDetailsDialog
        open={!!viewingConnector}
        onOpenChange={(open) => {
          if (!open) setViewingConnector(null);
        }}
        connector={viewingConnector}
      />

      {/* Available Integration Templates */}
      <div className="border-t pt-6">
        <McpConnectorTemplates
          configuredConnectorIds={connectors?.map((c) => c.nameId) || []}
        />
      </div>
    </div>
  );
}
