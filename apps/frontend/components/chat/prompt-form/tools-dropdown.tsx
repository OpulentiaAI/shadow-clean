"use client";

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
import { Wrench, Settings, ExternalLink, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useModal } from "@/components/layout/modal-context";
import {
  useMcpConnectors,
  useToggleMcpConnector,
} from "@/hooks/mcp/use-mcp-connectors";
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
  const { data: connectors, isLoading } = useMcpConnectors();
  const toggleMutation = useToggleMcpConnector();
  const { openSettingsModal, setSettingsModalTab } = useModal();

  const enabledCount = connectors?.filter((c) => c.enabled).length ?? 0;

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
    openSettingsModal("connectors" as any);
  };

  const getFaviconUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`;
    } catch {
      return null;
    }
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
              {enabledCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 size-5 justify-center p-0 text-xs"
                >
                  {enabledCount}
                </Badge>
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
                  const faviconUrl = getFaviconUrl(connector.url);
                  const isGlobal = connector.userId === null;

                  return (
                    <div
                      key={connector.id}
                      className="hover:bg-accent/50 flex items-center justify-between p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {connector.type === "HTTP" && faviconUrl ? (
                          <img
                            src={faviconUrl}
                            alt=""
                            className="size-4 shrink-0 rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="bg-muted size-4 shrink-0 rounded" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">
                              {connector.name}
                            </span>
                            {isGlobal && (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground h-4 px-1 text-[10px]"
                              >
                                Global
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground max-w-[160px] truncate text-xs">
                            {connector.url}
                          </p>
                        </div>
                      </div>

                      <Switch
                        checked={connector.enabled}
                        onCheckedChange={(checked) =>
                          handleToggle(
                            connector.id,
                            checked,
                            { stopPropagation: () => {} } as any
                          )
                        }
                        disabled={isGlobal || toggleMutation.isPending}
                      />
                    </div>
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
