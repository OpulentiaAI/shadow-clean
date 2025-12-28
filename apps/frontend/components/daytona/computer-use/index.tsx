"use client";

/**
 * Computer Use Panel - Daytona Integration
 * Provides mouse, keyboard, screenshot, and display operations
 * for automating GUI interactions in sandboxes.
 * Supports VNC interface for human-in-the-loop control.
 */

import { createContext, useContext, useState, useCallback, memo, type ReactNode } from "react";

// Types
export interface ComputerUseContextValue {
  sandboxId?: string;
  isConnected: boolean;
  isStreaming: boolean;
  screenshot: string | null;
  displayInfo: DisplayInfo | null;
  cursorPosition: Position;
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  takeScreenshot: () => Promise<string | null>;
  mouseMove: (x: number, y: number) => Promise<void>;
  mouseClick: (x: number, y: number, button?: MouseButton) => Promise<void>;
  mouseDoubleClick: (x: number, y: number) => Promise<void>;
  mouseDrag: (startX: number, startY: number, endX: number, endY: number) => Promise<void>;
  mouseScroll: (deltaX: number, deltaY: number) => Promise<void>;
  keyboardType: (text: string) => Promise<void>;
  keyboardPress: (key: string, modifiers?: KeyModifier[]) => Promise<void>;
  keyboardHotkey: (...keys: string[]) => Promise<void>;
  
  // Event callbacks
  onScreenshotUpdate?: (screenshot: string) => void;
  onCursorMove?: (position: Position) => void;
  onError?: (error: Error) => void;
}

export interface Position {
  x: number;
  y: number;
}

export interface DisplayInfo {
  width: number;
  height: number;
  scaleFactor?: number;
}

export type MouseButton = "left" | "right" | "middle";
export type KeyModifier = "Control" | "Shift" | "Alt" | "Meta";
export type InteractionMode = "click" | "move" | "type" | "drag" | "scroll" | "observe";

export interface ComputerUseProviderProps {
  children: ReactNode;
  sandboxId?: string;
  onMouseClick?: (x: number, y: number, button?: MouseButton) => Promise<void>;
  onMouseMove?: (x: number, y: number) => Promise<void>;
  onMouseDrag?: (startX: number, startY: number, endX: number, endY: number) => Promise<void>;
  onMouseScroll?: (deltaX: number, deltaY: number) => Promise<void>;
  onKeyboardType?: (text: string) => Promise<void>;
  onKeyboardPress?: (key: string, modifiers?: KeyModifier[]) => Promise<void>;
  onKeyboardHotkey?: (...keys: string[]) => Promise<void>;
  onScreenshot?: () => Promise<string | null>;
  onConnect?: () => Promise<void>;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

// Context
const ComputerUseContext = createContext<ComputerUseContextValue | null>(null);

export function useComputerUse() {
  const context = useContext(ComputerUseContext);
  if (!context) {
    throw new Error("useComputerUse must be used within a ComputerUseProvider");
  }
  return context;
}

// Provider Component
function ComputerUseProviderComponent({
  children,
  sandboxId,
  onMouseClick,
  onMouseMove,
  onMouseDrag,
  onMouseScroll,
  onKeyboardType,
  onKeyboardPress,
  onKeyboardHotkey,
  onScreenshot,
  onConnect,
  onDisconnect,
  onError,
}: ComputerUseProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [displayInfo, setDisplayInfo] = useState<DisplayInfo | null>(null);
  const [cursorPosition, setCursorPosition] = useState<Position>({ x: 0, y: 0 });
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("click");

  const connect = useCallback(async () => {
    try {
      await onConnect?.();
      setIsConnected(true);
      // Default display info if not provided
      setDisplayInfo({ width: 1920, height: 1080 });
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Connection failed"));
    }
  }, [onConnect, onError]);

  const disconnect = useCallback(() => {
    onDisconnect?.();
    setIsConnected(false);
    setIsStreaming(false);
  }, [onDisconnect]);

  const takeScreenshot = useCallback(async () => {
    try {
      const result = await onScreenshot?.();
      if (result) {
        setScreenshot(result);
      }
      return result || null;
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Screenshot failed"));
      return null;
    }
  }, [onScreenshot, onError]);

  const mouseMove = useCallback(async (x: number, y: number) => {
    try {
      await onMouseMove?.(x, y);
      setCursorPosition({ x, y });
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Mouse move failed"));
    }
  }, [onMouseMove, onError]);

  const mouseClick = useCallback(async (x: number, y: number, button: MouseButton = "left") => {
    try {
      await onMouseClick?.(x, y, button);
      setCursorPosition({ x, y });
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Mouse click failed"));
    }
  }, [onMouseClick, onError]);

  const mouseDoubleClick = useCallback(async (x: number, y: number) => {
    try {
      await onMouseClick?.(x, y, "left");
      await onMouseClick?.(x, y, "left");
      setCursorPosition({ x, y });
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Double click failed"));
    }
  }, [onMouseClick, onError]);

  const mouseDrag = useCallback(async (startX: number, startY: number, endX: number, endY: number) => {
    try {
      await onMouseDrag?.(startX, startY, endX, endY);
      setCursorPosition({ x: endX, y: endY });
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Mouse drag failed"));
    }
  }, [onMouseDrag, onError]);

  const mouseScroll = useCallback(async (deltaX: number, deltaY: number) => {
    try {
      await onMouseScroll?.(deltaX, deltaY);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Mouse scroll failed"));
    }
  }, [onMouseScroll, onError]);

  const keyboardType = useCallback(async (text: string) => {
    try {
      await onKeyboardType?.(text);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Keyboard type failed"));
    }
  }, [onKeyboardType, onError]);

  const keyboardPress = useCallback(async (key: string, modifiers?: KeyModifier[]) => {
    try {
      await onKeyboardPress?.(key, modifiers);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Keyboard press failed"));
    }
  }, [onKeyboardPress, onError]);

  const keyboardHotkey = useCallback(async (...keys: string[]) => {
    try {
      await onKeyboardHotkey?.(...keys);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Hotkey failed"));
    }
  }, [onKeyboardHotkey, onError]);

  const contextValue: ComputerUseContextValue = {
    sandboxId,
    isConnected,
    isStreaming,
    screenshot,
    displayInfo,
    cursorPosition,
    interactionMode,
    setInteractionMode,
    connect,
    disconnect,
    takeScreenshot,
    mouseMove,
    mouseClick,
    mouseDoubleClick,
    mouseDrag,
    mouseScroll,
    keyboardType,
    keyboardPress,
    keyboardHotkey,
    onError,
  };

  return (
    <ComputerUseContext.Provider value={contextValue}>
      {children}
    </ComputerUseContext.Provider>
  );
}

export const ComputerUseProvider = memo(ComputerUseProviderComponent);
export { ComputerUseDisplay } from "./computer-use-display";
export { ComputerUseToolbar } from "./computer-use-toolbar";
export { ComputerUseActions } from "./computer-use-actions";
export default ComputerUseProvider;
