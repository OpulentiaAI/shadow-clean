"use client";

/**
 * Web Terminal - Daytona Integration
 * Browser-based terminal for viewing files, running commands, and debugging
 * Default port 22222, accessible from Sandbox UI
 */

import { memo, useRef, useEffect, useState, useCallback } from "react";
import { Terminal, Loader2, WifiOff, Maximize2, Minimize2, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface WebTerminalProps {
  sandboxId?: string;
  port?: number;
  className?: string;
  onClose?: () => void;
}

function WebTerminalComponent({
  sandboxId,
  port = 22222,
  className = "",
  onClose,
}: WebTerminalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [terminalUrl, setTerminalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate Daytona terminal URL
  useEffect(() => {
    if (sandboxId) {
      const url = `https://${port}-${sandboxId}.proxy.daytona.works`;
      setTerminalUrl(url);
    }
  }, [sandboxId, port]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setIsConnected(true);
  }, []);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setIsConnected(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleCopyUrl = useCallback(async () => {
    if (terminalUrl) {
      await navigator.clipboard.writeText(terminalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [terminalUrl]);

  const handleOpenExternal = useCallback(() => {
    if (terminalUrl) {
      window.open(terminalUrl, "_blank");
    }
  }, [terminalUrl]);

  // No sandbox ID
  if (!sandboxId) {
    return (
      <div className={`flex h-full flex-col bg-background ${className}`}>
        <div className="flex h-8 items-center justify-between border-b px-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Terminal className="size-3.5" />
            Terminal
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
              <X className="size-3" />
            </Button>
          )}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
            <WifiOff className="size-12 opacity-20" />
            <div>
              <p className="text-sm font-medium">No Sandbox Connected</p>
              <p className="mt-1 max-w-xs text-xs opacity-70">
                Connect to a sandbox to use the web terminal.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col bg-background ${
        isFullscreen ? "fixed inset-0 z-50" : "h-full"
      } ${className}`}
    >
      {/* Terminal Header */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b px-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Terminal className="size-3.5" />
          Terminal
          <span
            className={`ml-1 size-1.5 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
        </div>

        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={handleCopyUrl}
                disabled={!terminalUrl}
              >
                {copied ? (
                  <Check className="size-3 text-green-500" />
                ) : (
                  <Copy className="size-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {copied ? "Copied!" : "Copy Terminal URL"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="size-3" />
                ) : (
                  <Maximize2 className="size-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </TooltipContent>
          </Tooltip>

          {onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
                  <X className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close Terminal</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Connecting to terminal...</span>
            </div>
          </div>
        )}

        {/* Terminal iframe */}
        {terminalUrl && (
          <iframe
            ref={iframeRef}
            src={terminalUrl}
            className="size-full border-0"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title={`Terminal - ${sandboxId}`}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="flex h-5 shrink-0 items-center justify-between border-t bg-card/50 px-2">
        <span className="text-[10px] text-muted-foreground">
          {isConnected ? "Connected" : isLoading ? "Connecting..." : "Disconnected"}
        </span>
        <button
          type="button"
          onClick={handleOpenExternal}
          className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground"
        >
          Port: {port}
        </button>
      </div>
    </div>
  );
}

export const WebTerminal = memo(WebTerminalComponent);
export default WebTerminal;
