"use client";

import { memo } from "react";
import {
  MousePointer2,
  Move,
  Type,
  Hand,
  Scroll,
  Eye,
  Camera,
  Plug,
  Unplug,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useComputerUse, type InteractionMode } from "./index";

export interface ComputerUseToolbarProps {
  className?: string;
  showConnectionControls?: boolean;
}

const INTERACTION_MODES: { mode: InteractionMode; icon: typeof MousePointer2; label: string }[] = [
  { mode: "click", icon: MousePointer2, label: "Click" },
  { mode: "move", icon: Move, label: "Move" },
  { mode: "type", icon: Type, label: "Type" },
  { mode: "drag", icon: Hand, label: "Drag" },
  { mode: "scroll", icon: Scroll, label: "Scroll" },
  { mode: "observe", icon: Eye, label: "Observe" },
];

function ComputerUseToolbarComponent({
  className = "",
  showConnectionControls = true,
}: ComputerUseToolbarProps) {
  const {
    interactionMode,
    setInteractionMode,
    isConnected,
    connect,
    disconnect,
    takeScreenshot,
  } = useComputerUse();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Connection Controls */}
      {showConnectionControls && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isConnected ? "default" : "outline"}
                size="icon"
                className="size-7"
                onClick={() => (isConnected ? disconnect() : connect())}
              >
                {isConnected ? (
                  <Unplug className="size-3.5" />
                ) : (
                  <Plug className="size-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isConnected ? "Disconnect" : "Connect"}
            </TooltipContent>
          </Tooltip>

          <div className="mx-1 h-4 w-px bg-border" />
        </>
      )}

      {/* Interaction Mode Buttons */}
      {INTERACTION_MODES.map(({ mode, icon: Icon, label }) => (
        <Tooltip key={mode}>
          <TooltipTrigger asChild>
            <Button
              variant={interactionMode === mode ? "default" : "ghost"}
              size="icon"
              className="size-7"
              onClick={() => setInteractionMode(mode)}
              disabled={!isConnected}
            >
              <Icon className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
      ))}

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Screenshot Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => takeScreenshot()}
            disabled={!isConnected}
          >
            <Camera className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Take Screenshot</TooltipContent>
      </Tooltip>

      {/* Refresh Screenshot */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => takeScreenshot()}
            disabled={!isConnected}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Refresh Display</TooltipContent>
      </Tooltip>
    </div>
  );
}

export const ComputerUseToolbar = memo(ComputerUseToolbarComponent);
export default ComputerUseToolbar;
