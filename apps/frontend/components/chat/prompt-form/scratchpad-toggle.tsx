"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";

interface ScratchpadToggleProps {
  active: boolean;
  onToggle: (next: boolean) => void;
}

export function ScratchpadToggle({ active, onToggle }: ScratchpadToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "default" : "ghost"}
          size="sm"
          className={active ? "shadow-sm" : "text-muted-foreground"}
          onClick={() => onToggle(!active)}
          aria-pressed={active}
        >
          <Sparkles className="size-4" />
          <span className="ml-1">Scratchpad</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start">
        Toggle scratchpad mode
      </TooltipContent>
    </Tooltip>
  );
}
