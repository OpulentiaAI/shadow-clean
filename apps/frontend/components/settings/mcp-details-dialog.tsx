"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Wrench, FileText, MessageSquare, ExternalLink, AlertCircle } from "lucide-react";
import type { McpConnector } from "@repo/types";
import { useMcpDiscovery } from "@/hooks/mcp/use-mcp-connectors";

interface McpDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connector: McpConnector | null;
}

export function McpDetailsDialog({
  open,
  onOpenChange,
  connector,
}: McpDetailsDialogProps) {
  const { data: discovery, isLoading, error } = useMcpDiscovery(
    open && connector ? connector.id : null
  );

  const getFaviconUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`;
    } catch {
      return null;
    }
  };

  const faviconUrl = connector ? getFaviconUrl(connector.url) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {faviconUrl && (
              <img
                src={faviconUrl}
                alt=""
                className="size-6 rounded"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <div>
              <DialogTitle>{connector?.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-1">
                {connector?.url}
                <a
                  href={connector?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3" />
                </a>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-4">
              <AlertCircle className="size-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-500">
                  Failed to discover capabilities
                </p>
                <p className="text-muted-foreground text-xs">
                  {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
            </div>
          ) : discovery ? (
            <>
              {/* Tools */}
              {discovery.tools.length > 0 && (
                <div className="space-y-2">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Wrench className="size-4" />
                    <span>Tools ({discovery.tools.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {discovery.tools.map((tool) => (
                      <Badge
                        key={tool.name}
                        variant="secondary"
                        className="font-mono text-xs"
                        title={tool.description}
                      >
                        {tool.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Resources */}
              {discovery.resources.length > 0 && (
                <div className="space-y-2">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <FileText className="size-4" />
                    <span>Resources ({discovery.resources.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {discovery.resources.map((resource) => (
                      <Badge
                        key={resource.uri}
                        variant="secondary"
                        className="font-mono text-xs"
                        title={resource.description || resource.uri}
                      >
                        {resource.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompts */}
              {discovery.prompts.length > 0 && (
                <div className="space-y-2">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <MessageSquare className="size-4" />
                    <span>Prompts ({discovery.prompts.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {discovery.prompts.map((prompt) => (
                      <Badge
                        key={prompt.name}
                        variant="secondary"
                        className="font-mono text-xs"
                        title={prompt.description}
                      >
                        {prompt.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {discovery.tools.length === 0 &&
                discovery.resources.length === 0 &&
                discovery.prompts.length === 0 && (
                  <div className="text-muted-foreground py-4 text-center text-sm">
                    No tools, resources, or prompts discovered from this server.
                  </div>
                )}
            </>
          ) : null}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
