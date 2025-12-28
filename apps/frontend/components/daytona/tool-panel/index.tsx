"use client";

/**
 * Tool Panel - AI Elements Component
 * A collapsible panel to display tool invocation details/status
 * Supports states: pending, running, completed, error
 * Useful for exposing agent tool calls and outputs
 */

import { useState, memo, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Wrench,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type ToolStatus = "pending" | "running" | "completed" | "error";

export interface ToolInvocation {
  id: string;
  name: string;
  status: ToolStatus;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

export interface ToolPanelProps {
  tool: ToolInvocation;
  defaultExpanded?: boolean;
  showArgs?: boolean;
  showResult?: boolean;
  showDuration?: boolean;
  className?: string;
  children?: ReactNode;
}

function getStatusIcon(status: ToolStatus) {
  switch (status) {
    case "pending":
      return <Clock className="size-4 text-muted-foreground" />;
    case "running":
      return <Loader2 className="size-4 animate-spin text-blue-500" />;
    case "completed":
      return <CheckCircle2 className="size-4 text-green-500" />;
    case "error":
      return <XCircle className="size-4 text-destructive" />;
  }
}

function getStatusText(status: ToolStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "error":
      return "Error";
  }
}

function getStatusColor(status: ToolStatus) {
  switch (status) {
    case "pending":
      return "bg-muted/50 border-border";
    case "running":
      return "bg-blue-500/5 border-blue-500/30";
    case "completed":
      return "bg-green-500/5 border-green-500/30";
    case "error":
      return "bg-destructive/5 border-destructive/30";
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function JsonDisplay({ data, label }: { data: unknown; label: string }) {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-5"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="size-3 text-green-500" />
              ) : (
                <Copy className="size-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {copied ? "Copied!" : "Copy to clipboard"}
          </TooltipContent>
        </Tooltip>
      </div>
      <pre className="max-h-48 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs">
        {jsonString}
      </pre>
    </div>
  );
}

function ToolPanelComponent({
  tool,
  defaultExpanded = false,
  showArgs = true,
  showResult = true,
  showDuration = true,
  className = "",
  children,
}: ToolPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const duration = tool.duration || (tool.endTime && tool.startTime ? tool.endTime - tool.startTime : null);

  return (
    <div className={`overflow-hidden rounded-lg border ${getStatusColor(tool.status)} ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/30"
      >
        <span className="shrink-0">
          {isExpanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </span>

        <Wrench className="size-4 shrink-0 text-muted-foreground" />

        <span className="flex-1 truncate text-sm font-medium">
          {tool.name}
        </span>

        {showDuration && duration && tool.status !== "running" && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDuration(duration)}
          </span>
        )}

        <span className="shrink-0">{getStatusIcon(tool.status)}</span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border/50 px-3 py-2">
          {/* Status */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium">{getStatusText(tool.status)}</span>
          </div>

          {/* Arguments */}
          {showArgs && tool.args && Object.keys(tool.args).length > 0 && (
            <JsonDisplay data={tool.args} label="Arguments" />
          )}

          {/* Result */}
          {showResult && tool.status === "completed" && tool.result !== undefined && (
            <JsonDisplay data={tool.result} label="Result" />
          )}

          {/* Error */}
          {tool.status === "error" && tool.error && (
            <div className="mt-2">
              <span className="text-xs font-medium text-destructive">Error</span>
              <div className="mt-1 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                {tool.error}
              </div>
            </div>
          )}

          {/* Custom children content */}
          {children}
        </div>
      )}
    </div>
  );
}

export const ToolPanel = memo(ToolPanelComponent);

// Tool List Component for multiple tools
export interface ToolListProps {
  tools: ToolInvocation[];
  className?: string;
  defaultExpandedId?: string;
}

function ToolListComponent({ tools, className = "", defaultExpandedId }: ToolListProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {tools.map((tool) => (
        <ToolPanel
          key={tool.id}
          tool={tool}
          defaultExpanded={tool.id === defaultExpandedId || tool.status === "running"}
        />
      ))}
    </div>
  );
}

export const ToolList = memo(ToolListComponent);
export default ToolPanel;
