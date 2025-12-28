"use client";

import { memo, useState, useCallback, type KeyboardEvent } from "react";
import { Globe, Lock, Unlock } from "lucide-react";
import { useWebPreview } from "./index";

export interface WebPreviewUrlProps {
  className?: string;
  editable?: boolean;
  showSecurityIcon?: boolean;
  placeholder?: string;
}

function WebPreviewUrlComponent({
  className = "",
  editable = true,
  showSecurityIcon = true,
  placeholder = "Enter URL or port number...",
}: WebPreviewUrlProps) {
  const { url, setUrl, port, sandboxId, isLoading } = useWebPreview();
  const [inputValue, setInputValue] = useState(url);
  const [isFocused, setIsFocused] = useState(false);

  const isSecure = url.startsWith("https://");

  // Generate Daytona preview URL from port
  const generatePreviewUrl = useCallback(
    (input: string): string => {
      // If it's just a port number, generate Daytona preview URL
      const portMatch = input.match(/^(\d{4,5})$/);
      if (portMatch && sandboxId) {
        return `https://${portMatch[1]}-${sandboxId}.proxy.daytona.works`;
      }

      // If it's a full URL, use it directly
      if (input.startsWith("http://") || input.startsWith("https://")) {
        return input;
      }

      // If it starts with localhost or 127.0.0.1, convert to Daytona preview
      const localhostMatch = input.match(/^(?:localhost|127\.0\.0\.1):?(\d+)?/);
      if (localhostMatch && sandboxId) {
        const p = localhostMatch[1] || port;
        return `https://${p}-${sandboxId}.proxy.daytona.works`;
      }

      // Default: prepend https://
      return `https://${input}`;
    },
    [sandboxId, port]
  );

  const handleSubmit = useCallback(() => {
    if (inputValue.trim()) {
      const newUrl = generatePreviewUrl(inputValue.trim());
      setUrl(newUrl);
      setInputValue(newUrl);
    }
  }, [inputValue, generatePreviewUrl, setUrl]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSubmit();
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        setInputValue(url);
        e.currentTarget.blur();
      }
    },
    [handleSubmit, url]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setInputValue(url);
  }, [url]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Reset to current URL if input was not submitted
    if (inputValue !== url) {
      setInputValue(url);
    }
  }, [inputValue, url]);

  return (
    <div
      className={`flex flex-1 items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 transition-colors ${
        isFocused ? "border-primary bg-background" : "border-border"
      } ${className}`}
    >
      {showSecurityIcon && (
        <div className="shrink-0">
          {isSecure ? (
            <Lock className="size-3.5 text-green-500" />
          ) : url ? (
            <Unlock className="size-3.5 text-muted-foreground" />
          ) : (
            <Globe className="size-3.5 text-muted-foreground" />
          )}
        </div>
      )}

      {editable ? (
        <input
          type="text"
          value={isFocused ? inputValue : url}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
      ) : (
        <span className="flex-1 truncate text-xs text-muted-foreground">
          {url || `Preview on port ${port}`}
        </span>
      )}
    </div>
  );
}

export const WebPreviewUrl = memo(WebPreviewUrlComponent);
export default WebPreviewUrl;
