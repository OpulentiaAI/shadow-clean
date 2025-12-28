"use client";

import { memo, useCallback } from "react";
import { Loader2, Globe, AlertTriangle } from "lucide-react";
import { useWebPreview } from "./index";

export interface WebPreviewBodyProps {
  className?: string;
  placeholder?: React.ReactNode;
}

function WebPreviewBodyComponent({ className = "", placeholder }: WebPreviewBodyProps) {
  const { url, isLoading, setIsLoading, error, setError, sandboxId, iframeRef } = useWebPreview();

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, [setIsLoading]);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setError("Failed to load preview");
  }, [setIsLoading, setError]);

  // Empty state
  if (!url) {
    return (
      <div className={`flex flex-1 items-center justify-center bg-muted/20 ${className}`}>
        {placeholder || (
          <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
            <Globe className="size-12 opacity-20" />
            <div>
              <p className="text-sm font-medium">No Preview Available</p>
              <p className="mt-1 max-w-xs text-xs opacity-70">
                Start a development server to see a live preview of your application.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex flex-1 items-center justify-center bg-muted/20 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="size-10 text-destructive opacity-60" />
          <div>
            <p className="text-sm font-medium text-destructive">Preview Error</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex-1 overflow-hidden ${className}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading preview...</span>
          </div>
        </div>
      )}

      {/* Preview iframe */}
      <iframe
        ref={iframeRef}
        src={url}
        className="size-full border-0"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        allow="clipboard-write; clipboard-read"
        title={`Preview - ${sandboxId || "Sandbox"}`}
      />
    </div>
  );
}

export const WebPreviewBody = memo(WebPreviewBodyComponent);
export default WebPreviewBody;
