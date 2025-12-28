"use client";

/**
 * WebPreview - AI Elements Component
 * A composable preview frame to show generated UI live from Daytona sandbox
 * with navigation controls, URL input, and an optional console.
 * 
 * Subcomponents:
 * - WebPreviewBody: The iframe container for the preview
 * - WebPreviewNavigation: Back/forward/refresh controls
 * - WebPreviewUrl: URL input bar
 * - WebPreviewConsole: Console output panel
 */

import { createContext, useContext, useState, useCallback, useRef, memo, type ReactNode } from "react";

// Types
export interface WebPreviewContextValue {
  url: string;
  setUrl: (url: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  history: string[];
  historyIndex: number;
  goBack: () => void;
  goForward: () => void;
  refresh: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  consoleLogs: ConsoleLog[];
  addConsoleLog: (log: ConsoleLog) => void;
  clearConsoleLogs: () => void;
  sandboxId?: string;
  port: number;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export interface ConsoleLog {
  id: string;
  type: "log" | "warn" | "error" | "info";
  message: string;
  timestamp: number;
  source?: string;
}

export interface WebPreviewProps {
  children: ReactNode;
  sandboxId?: string;
  port?: number;
  initialUrl?: string;
  className?: string;
}

// Context
const WebPreviewContext = createContext<WebPreviewContextValue | null>(null);

export function useWebPreview() {
  const context = useContext(WebPreviewContext);
  if (!context) {
    throw new Error("useWebPreview must be used within a WebPreview component");
  }
  return context;
}

// Main WebPreview Component
function WebPreviewComponent({
  children,
  sandboxId,
  port = 3000,
  initialUrl = "",
  className = "",
}: WebPreviewProps) {
  const [url, setUrlState] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(initialUrl ? [initialUrl] : []);
  const [historyIndex, setHistoryIndex] = useState(initialUrl ? 0 : -1);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const setUrl = useCallback((newUrl: string) => {
    if (newUrl && newUrl !== url) {
      setUrlState(newUrl);
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), newUrl]);
      setHistoryIndex((prev) => prev + 1);
      setError(null);
    }
  }, [url, historyIndex]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setUrlState(history[newIndex] || "");
    }
  }, [historyIndex, history]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setUrlState(history[newIndex] || "");
    }
  }, [historyIndex, history]);

  const refresh = useCallback(() => {
    if (iframeRef.current && url) {
      setIsLoading(true);
      iframeRef.current.src = url;
    }
  }, [url]);

  const addConsoleLog = useCallback((log: ConsoleLog) => {
    setConsoleLogs((prev) => [...prev.slice(-499), log]); // Keep last 500 logs
  }, []);

  const clearConsoleLogs = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  const contextValue: WebPreviewContextValue = {
    url,
    setUrl,
    isLoading,
    setIsLoading,
    error,
    setError,
    history,
    historyIndex,
    goBack,
    goForward,
    refresh,
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < history.length - 1,
    consoleLogs,
    addConsoleLog,
    clearConsoleLogs,
    sandboxId,
    port,
    iframeRef,
  };

  return (
    <WebPreviewContext.Provider value={contextValue}>
      <div className={`flex h-full flex-col ${className}`}>
        {children}
      </div>
    </WebPreviewContext.Provider>
  );
}

export const WebPreview = memo(WebPreviewComponent);
export { WebPreviewBody } from "./web-preview-body";
export { WebPreviewNavigation } from "./web-preview-navigation";
export { WebPreviewUrl } from "./web-preview-url";
export { WebPreviewConsole } from "./web-preview-console";
export default WebPreview;
