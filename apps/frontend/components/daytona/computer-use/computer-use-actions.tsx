"use client";

import { memo, useState, useCallback } from "react";
import { Keyboard, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useComputerUse } from "./index";

export interface ComputerUseActionsProps {
  className?: string;
}

function ComputerUseActionsComponent({ className = "" }: ComputerUseActionsProps) {
  const { keyboardType, keyboardPress, keyboardHotkey, isConnected } = useComputerUse();
  const [textInput, setTextInput] = useState("");

  const handleTypeSubmit = useCallback(async () => {
    if (textInput.trim()) {
      await keyboardType(textInput);
      setTextInput("");
    }
  }, [textInput, keyboardType]);

  const handleKeyPress = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        await handleTypeSubmit();
      }
    },
    [handleTypeSubmit]
  );

  const commonKeys = [
    { key: "Enter", label: "Enter" },
    { key: "Tab", label: "Tab" },
    { key: "Escape", label: "Esc" },
    { key: "Backspace", label: "←" },
    { key: "Delete", label: "Del" },
  ];

  const commonHotkeys = [
    { keys: ["Control", "c"], label: "Ctrl+C" },
    { keys: ["Control", "v"], label: "Ctrl+V" },
    { keys: ["Control", "z"], label: "Ctrl+Z" },
    { keys: ["Control", "a"], label: "Ctrl+A" },
    { keys: ["Control", "s"], label: "Ctrl+S" },
    { keys: ["Alt", "Tab"], label: "Alt+Tab" },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Text Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          <Keyboard className="mr-1 inline-block size-3" />
          Type Text
        </label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type text to send..."
            disabled={!isConnected}
            className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground disabled:opacity-50"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleTypeSubmit}
            disabled={!isConnected || !textInput.trim()}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Common Keys */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Quick Keys</label>
        <div className="flex flex-wrap gap-1">
          {commonKeys.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => keyboardPress(key)}
              disabled={!isConnected}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Common Hotkeys */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Hotkeys</label>
        <div className="flex flex-wrap gap-1">
          {commonHotkeys.map(({ keys, label }) => (
            <Button
              key={label}
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => keyboardHotkey(...keys)}
              disabled={!isConnected}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Arrow Keys */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Arrow Keys</label>
        <div className="flex items-center justify-center gap-0.5">
          <div className="grid grid-cols-3 gap-0.5">
            <div />
            <Button
              size="sm"
              variant="outline"
              className="size-8"
              onClick={() => keyboardPress("ArrowUp")}
              disabled={!isConnected}
            >
              ↑
            </Button>
            <div />
            <Button
              size="sm"
              variant="outline"
              className="size-8"
              onClick={() => keyboardPress("ArrowLeft")}
              disabled={!isConnected}
            >
              ←
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="size-8"
              onClick={() => keyboardPress("ArrowDown")}
              disabled={!isConnected}
            >
              ↓
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="size-8"
              onClick={() => keyboardPress("ArrowRight")}
              disabled={!isConnected}
            >
              →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ComputerUseActions = memo(ComputerUseActionsComponent);
export default ComputerUseActions;
