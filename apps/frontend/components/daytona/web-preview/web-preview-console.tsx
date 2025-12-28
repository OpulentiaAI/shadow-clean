"use client";

import { memo, useRef, useEffect } from "react";
import { Terminal, Trash2, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWebPreview, type ConsoleLog } from "./index";

export interface WebPreviewConsoleProps {
  className?: string;
  maxHeight?: number;
  showHeader?: boolean;
}

function getLogIcon(type: ConsoleLog["type"]) {
  switch (type) {
    case "error":
      return <AlertCircle className="size-3 text-destructive" />;
    case "warn":
      return <AlertTriangle className="size-3 text-yellow-500" />;
    case "info":
      return <Info className="size-3 text-blue-500" />;
    default:
      return <Terminal className="size-3 text-muted-foreground" />;
  }
}

function getLogColor(type: ConsoleLog["type"]) {
  switch (type) {
    case "error":
      return "text-destructive";
    case "warn":
      return "text-yellow-500";
    case "info":
      return "text-blue-500";
    default:
      return "text-foreground";
  }
}

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

function WebPreviewConsoleComponent({
  className = "",
  maxHeight = 200,
  showHeader = true,
}: WebPreviewConsoleProps) {
  const { consoleLogs, clearConsoleLogs } = useWebPreview();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  return (
    <div className={`flex flex-col border-t bg-card/50 ${className}`}>
      {showHeader && (
        <div className="flex h-8 shrink-0 items-center justify-between border-b px-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Terminal className="size-3.5" />
            Console
            {consoleLogs.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                {consoleLogs.length}
              </span>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={clearConsoleLogs}
                disabled={consoleLogs.length === 0}
              >
                <Trash2 className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Clear Console</TooltipContent>
          </Tooltip>
        </div>
      )}

      <div
        ref={scrollRef}
        className="overflow-auto font-mono text-xs"
        style={{ maxHeight }}
      >
        {consoleLogs.length === 0 ? (
          <div className="flex h-16 items-center justify-center text-muted-foreground">
            No console output
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {consoleLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 px-2 py-1 hover:bg-muted/30"
              >
                <div className="mt-0.5 shrink-0">{getLogIcon(log.type)}</div>
                <span className="shrink-0 text-muted-foreground">
                  {formatTimestamp(log.timestamp)}
                </span>
                {log.source && (
                  <span className="shrink-0 text-muted-foreground/70">
                    [{log.source}]
                  </span>
                )}
                <span className={`flex-1 break-all ${getLogColor(log.type)}`}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const WebPreviewConsole = memo(WebPreviewConsoleComponent);
export default WebPreviewConsole;
