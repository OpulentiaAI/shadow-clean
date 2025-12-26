"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Wrench, Settings, ChevronDown, ChevronRight, RefreshCw, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { useModal } from "@/components/layout/modal-context";
import { useToggleMcpConnector } from "@/hooks/mcp/use-mcp-connectors";
import { useMcpTools } from "@/hooks/mcp/use-mcp-tools";
import { cn } from "@/lib/utils";

interface ToolsDropdownProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  disabled?: boolean;
}

export function ToolsDropdown({
  isOpen,
  setIsOpen,
  disabled = false,
}: ToolsDropdownProps) {
  const {
    connectors,
    enabledToolsCount,
    isLoading,
    isDiscovering,
    refetchTools,
  } = useMcpTools();
  const toggleMutation = useToggleMcpConnector();
  const { openSettingsModal } = useModal();
  const [expandedConnectors, setExpandedConnectors] = useState<Set<string>>(new Set());

  const enabledCount = connectors?.filter((c) => c.enabled).length ?? 0;

  const toggleExpanded = (connectorId: string) => {
    setExpandedConnectors((prev) => {
      const next = new Set(prev);
      if (next.has(connectorId)) {
        next.delete(connectorId);
      } else {
        next.add(connectorId);
      }
      return next;
    });
  };

  const handleToggle = async (
    connectorId: string,
    enabled: boolean,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      await toggleMutation.mutateAsync({ id: connectorId, enabled });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle connector"
      );
    }
  };

  const handleOpenSettings = () => {
    setIsOpen(false);
    openSettingsModal("connectors");
  };

  return (
    <Popover open={disabled ? false : isOpen} onOpenChange={disabled ? undefined : setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "text-muted-foreground hover:bg-accent shrink overflow-hidden font-normal",
                enabledCount > 0 && "text-foreground"
              )}
              disabled={disabled}
            >
              <Wrench className="size-4" />
              <span>Tools</span>
              {enabledToolsCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 justify-center px-1 text-xs"
                >
                  {enabledToolsCount}
                </Badge>
              )}
              {isDiscovering && (
                <Loader2 className="size-3 animate-spin opacity-50" />
              )}
              <ChevronDown className="size-3 opacity-50" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        {!isOpen && (
          <TooltipContent side="top" align="end">
            External MCP Tools
          </TooltipContent>
        )}
      </Tooltip>

      <PopoverContent
        className="w-72 p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-3">
            <div className="flex items-center gap-2">
              <Wrench className="size-4" />
              <span className="text-sm font-medium">MCP Tools</span>
            </div>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={handleOpenSettings}
              title="Manage connectors"
            >
              <Settings className="size-4" />
            </Button>
          </div>

          {/* Connectors List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !connectors || connectors.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-muted-foreground text-sm">
                  No MCP connectors configured.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleOpenSettings}
                  className="mt-1 h-auto p-0 text-sm"
                >
                  Add a connector
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {connectors.map((connector) => {
                  const isGlobal = connector.userId === null;
                  const isExpanded = expandedConnectors.has(connector.id);
                  const hasTools = connector.tools.length > 0;

                  return (
                    <Collapsible
                      key={connector.id}
                      open={isExpanded && connector.enabled}
                      onOpenChange={() => connector.enabled && toggleExpanded(connector.id)}
                    >
                      <div className="hover:bg-accent/50 flex items-center justify-between p-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {/* Expand button for enabled connectors with tools */}
                          {connector.enabled ? (
                            <CollapsibleTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="iconSm"
                                className="size-5 shrink-0 p-0"
                                disabled={!hasTools && !connector.isDiscovering}
                              >
                                {connector.isDiscovering ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : isExpanded ? (
                                  <ChevronDown className="size-3" />
                                ) : (
                                  <ChevronRight className="size-3" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          ) : (
                            <div className="size-5 shrink-0" />
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "truncate text-sm font-medium",
                                !connector.enabled && "text-muted-foreground"
                              )}>
                                {connector.name}
                              </span>
                              {connector.enabled && hasTools && (
                                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                                  {connector.tools.length} tools
                                </Badge>
                              )}
                              {isGlobal && (
                                <Badge
                                  variant="outline"
                                  className="text-muted-foreground h-4 px-1 text-[10px]"
                                >
                                  Global
                                </Badge>
                              )}
                            </div>
                            {connector.discoveryError && (
                              <p className="text-destructive text-xs">
                                {connector.discoveryError}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {connector.enabled && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="iconSm"
                              className="size-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                refetchTools(connector.id);
                              }}
                              disabled={connector.isDiscovering}
                              title="Refresh tools"
                            >
                              <RefreshCw className={cn(
                                "size-3",
                                connector.isDiscovering && "animate-spin"
                              )} />
                            </Button>
                          )}
                          <Switch
                            checked={connector.enabled}
                            onCheckedChange={(checked) =>
                              handleToggle(
                                connector.id,
                                checked,
                                { stopPropagation: () => {} } as React.MouseEvent
                              )
                            }
                            disabled={isGlobal || toggleMutation.isPending}
                          />
                        </div>
                      </div>

                      {/* Tools list */}
                      <CollapsibleContent>
                        {connector.tools.length > 0 && (
                          <div className="bg-muted/30 border-t px-3 py-2">
                            <div className="space-y-1">
                              {connector.tools.map((tool) => (
                                <div
                                  key={tool.name}
                                  className="flex items-start gap-2 py-1"
                                >
                                  <Check className="text-primary mt-0.5 size-3 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-medium">
                                      {tool.name}
                                    </p>
                                    {tool.description && (
                                      <p className="text-muted-foreground line-clamp-2 text-[10px]">
                                        {tool.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {connectors && connectors.length > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground w-full justify-start text-xs"
                onClick={handleOpenSettings}
              >
                <Settings className="mr-2 size-3" />
                Manage connectors
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
