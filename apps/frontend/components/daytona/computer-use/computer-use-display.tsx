"use client";

import { memo, useCallback, useRef, useState } from "react";
import { Monitor, Loader2, WifiOff } from "lucide-react";
import { useComputerUse } from "./index";

export interface ComputerUseDisplayProps {
  className?: string;
  showCursor?: boolean;
  interactive?: boolean;
}

function ComputerUseDisplayComponent({
  className = "",
  showCursor = true,
  interactive = true,
}: ComputerUseDisplayProps) {
  const {
    screenshot,
    displayInfo,
    cursorPosition,
    interactionMode,
    isConnected,
    mouseClick,
    mouseMove,
    mouseDrag,
    mouseScroll,
  } = useComputerUse();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const getScaledCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || !displayInfo) return { x: 0, y: 0 };

      const rect = containerRef.current.getBoundingClientRect();
      const scaleX = displayInfo.width / rect.width;
      const scaleY = displayInfo.height / rect.height;

      return {
        x: Math.round((clientX - rect.left) * scaleX),
        y: Math.round((clientY - rect.top) * scaleY),
      };
    },
    [displayInfo]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!interactive) return;

      const coords = getScaledCoordinates(e.clientX, e.clientY);

      if (interactionMode === "drag") {
        setIsDragging(true);
        setDragStart(coords);
      }
    },
    [interactive, interactionMode, getScaledCoordinates]
  );

  const handleMouseUp = useCallback(
    async (e: React.MouseEvent) => {
      if (!interactive) return;

      const coords = getScaledCoordinates(e.clientX, e.clientY);

      if (interactionMode === "drag" && isDragging) {
        await mouseDrag(dragStart.x, dragStart.y, coords.x, coords.y);
        setIsDragging(false);
      } else if (interactionMode === "click") {
        const button = e.button === 2 ? "right" : e.button === 1 ? "middle" : "left";
        await mouseClick(coords.x, coords.y, button);
      }
    },
    [interactive, interactionMode, isDragging, dragStart, getScaledCoordinates, mouseDrag, mouseClick]
  );

  const handleMouseMove = useCallback(
    async (e: React.MouseEvent) => {
      if (!interactive) return;

      const coords = getScaledCoordinates(e.clientX, e.clientY);

      if (interactionMode === "move") {
        await mouseMove(coords.x, coords.y);
      }
    },
    [interactive, interactionMode, getScaledCoordinates, mouseMove]
  );

  const handleWheel = useCallback(
    async (e: React.WheelEvent) => {
      if (!interactive || interactionMode !== "scroll") return;
      e.preventDefault();
      await mouseScroll(e.deltaX, e.deltaY);
    },
    [interactive, interactionMode, mouseScroll]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Not connected state
  if (!isConnected) {
    return (
      <div className={`flex flex-1 items-center justify-center bg-muted/20 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
          <WifiOff className="size-12 opacity-20" />
          <div>
            <p className="text-sm font-medium">Not Connected</p>
            <p className="mt-1 max-w-xs text-xs opacity-70">
              Connect to start computer use session
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No screenshot yet
  if (!screenshot) {
    return (
      <div className={`flex flex-1 items-center justify-center bg-muted/20 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
          <Loader2 className="size-8 animate-spin opacity-50" />
          <p className="text-sm">Waiting for screenshot...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 overflow-hidden bg-black ${className}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
      style={{
        cursor: interactive ? getCursorForMode(interactionMode) : "default",
      }}
    >
      {/* Screenshot Image */}
      <img
        src={screenshot.startsWith("data:") ? screenshot : `data:image/png;base64,${screenshot}`}
        alt="Desktop Screenshot"
        className="size-full object-contain"
        draggable={false}
      />

      {/* Cursor Overlay */}
      {showCursor && displayInfo && (
        <div
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${(cursorPosition.x / displayInfo.width) * 100}%`,
            top: `${(cursorPosition.y / displayInfo.height) * 100}%`,
          }}
        >
          <svg viewBox="0 0 24 24" className="size-full drop-shadow-md">
            <path
              d="M5.5 3.21V20.8l4.86-4.86h7.84L5.5 3.21z"
              fill="white"
              stroke="black"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}

      {/* Drag Rectangle */}
      {isDragging && (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-blue-500 bg-blue-500/10"
          style={{
            left: `${Math.min(dragStart.x, cursorPosition.x)}px`,
            top: `${Math.min(dragStart.y, cursorPosition.y)}px`,
            width: `${Math.abs(cursorPosition.x - dragStart.x)}px`,
            height: `${Math.abs(cursorPosition.y - dragStart.y)}px`,
          }}
        />
      )}

      {/* Mode Indicator */}
      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
        {interactionMode.charAt(0).toUpperCase() + interactionMode.slice(1)} mode
      </div>
    </div>
  );
}

function getCursorForMode(mode: string): string {
  switch (mode) {
    case "click":
      return "pointer";
    case "move":
      return "move";
    case "drag":
      return "grab";
    case "scroll":
      return "ns-resize";
    case "type":
      return "text";
    default:
      return "default";
  }
}

export const ComputerUseDisplay = memo(ComputerUseDisplayComponent);
export default ComputerUseDisplay;
