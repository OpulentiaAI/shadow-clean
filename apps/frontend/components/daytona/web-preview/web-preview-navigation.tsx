"use client";

import { memo } from "react";
import { ArrowLeft, ArrowRight, RefreshCw, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWebPreview } from "./index";

export interface WebPreviewNavigationProps {
  className?: string;
  showExternalLink?: boolean;
  showFullscreen?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onOpenExternal?: () => void;
}

function WebPreviewNavigationComponent({
  className = "",
  showExternalLink = true,
  showFullscreen = true,
  isFullscreen = false,
  onToggleFullscreen,
  onOpenExternal,
}: WebPreviewNavigationProps) {
  const { url, isLoading, goBack, goForward, refresh, canGoBack, canGoForward } = useWebPreview();

  const handleOpenExternal = () => {
    if (url) {
      window.open(url, "_blank");
    }
    onOpenExternal?.();
  };

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={goBack}
            disabled={!canGoBack}
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
            onClick={goForward}
            disabled={!canGoForward}
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
            onClick={refresh}
            disabled={isLoading || !url}
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Refresh</TooltipContent>
      </Tooltip>

      {showExternalLink && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleOpenExternal}
              disabled={!url}
            >
              <ExternalLink className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Open in New Tab</TooltipContent>
        </Tooltip>
      )}

      {showFullscreen && onToggleFullscreen && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onToggleFullscreen}
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
      )}
    </div>
  );
}

export const WebPreviewNavigation = memo(WebPreviewNavigationComponent);
export default WebPreviewNavigation;
