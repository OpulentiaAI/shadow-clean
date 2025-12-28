"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  Globe,
  RefreshCw,
  ExternalLink,
  Maximize2,
  Minimize2,
  ArrowLeft,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface BrowserViewPanelProps {
  previewUrl?: string | null;
  taskId?: string;
  port?: number;
  isLoading?: boolean;
  onClose?: () => void;
  onRefresh?: () => void;
  onOpenExternal?: () => void;
}

function BrowserViewPanelComponent({
  previewUrl,
  taskId,
  port = 3000,
  isLoading = false,
  onClose,
  onRefresh,
  onOpenExternal,
}: BrowserViewPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(previewUrl || "");
  const [urlHistory, setUrlHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (previewUrl && previewUrl !== currentUrl) {
      setCurrentUrl(previewUrl);
      setUrlHistory((prev) => [...prev.slice(0, historyIndex + 1), previewUrl]);
      setHistoryIndex((prev) => prev + 1);
    }
  }, [previewUrl, currentUrl, historyIndex]);

  const handleRefresh = useCallback(() => {
    setIframeLoaded(false);
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
    onRefresh?.();
  }, [currentUrl, onRefresh]);

  const handleGoBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentUrl(urlHistory[newIndex] || "");
    }
  }, [historyIndex, urlHistory]);

  const handleGoForward = useCallback(() => {
    if (historyIndex < urlHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentUrl(urlHistory[newIndex] || "");
    }
  }, [historyIndex, urlHistory]);

  const handleOpenExternal = useCallback(() => {
    if (currentUrl) {
      window.open(currentUrl, "_blank");
    }
    onOpenExternal?.();
  }, [currentUrl, onOpenExternal]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
  }, []);

  return (
    <div
      className={`bg-background flex flex-col border-l ${
        isFullscreen
          ? "fixed inset-0 z-50"
          : "h-full"
      }`}
    >
      {/* Browser Toolbar */}
      <div className="border-border bg-card/80 flex h-10 shrink-0 items-center gap-1 border-b px-2 backdrop-blur-sm">
        {/* Navigation buttons */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleGoBack}
                disabled={historyIndex <= 0}
              >
                <ArrowLeft className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Go Back</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleGoForward}
                disabled={historyIndex >= urlHistory.length - 1}
              >
                <ArrowRight className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Go Forward</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleRefresh}
                disabled={isLoading || !currentUrl}
              >
                <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh</TooltipContent>
          </Tooltip>
        </div>

        {/* URL Bar */}
        <div className="bg-muted/50 border-border flex flex-1 items-center gap-2 rounded-md border px-2 py-1">
          <Globe className="text-muted-foreground size-3.5 shrink-0" />
          <span className="text-muted-foreground truncate text-xs">
            {currentUrl || `Preview on port ${port}`}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleOpenExternal}
                disabled={!currentUrl}
              >
                <ExternalLink className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Open in New Tab</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="size-3.5" />
                ) : (
                  <Maximize2 className="size-3.5" />
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={onClose}
                >
                  <X className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close Preview</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Browser Content */}
      <div className="relative flex-1 overflow-hidden">
        {/* Loading overlay */}
        {(isLoading || !iframeLoaded) && currentUrl && (
          <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
              <span className="text-muted-foreground text-sm">Loading preview...</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!currentUrl && !isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground flex flex-col items-center gap-2 text-center">
              <Globe className="size-12 opacity-20" />
              <p className="text-sm font-medium">No Preview Available</p>
              <p className="max-w-xs text-xs opacity-70">
                Start a development server to see a live preview of your application.
              </p>
            </div>
          </div>
        )}

        {/* IFrame */}
        {currentUrl && (
          <iframe
            ref={iframeRef}
            src={currentUrl}
            className="size-full border-0"
            onLoad={handleIframeLoad}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            allow="clipboard-write"
            title={`Preview - ${taskId || "Sandbox"}`}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="border-border bg-card/50 flex h-6 shrink-0 items-center justify-between border-t px-2">
        <span className="text-muted-foreground text-[10px]">
          {iframeLoaded ? "Ready" : isLoading ? "Loading..." : "Waiting for preview"}
        </span>
        <span className="text-muted-foreground text-[10px]">
          Port: {port}
        </span>
      </div>
    </div>
  );
}

export const BrowserViewPanel = memo(BrowserViewPanelComponent);
export default BrowserViewPanel;
