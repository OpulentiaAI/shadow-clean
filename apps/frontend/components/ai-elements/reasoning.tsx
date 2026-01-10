"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const Reasoning = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root> & {
    isStreaming?: boolean;
  }
>(({ isStreaming = false, className, children, ...props }, ref) => (
  <CollapsiblePrimitive.Root
    ref={ref}
    defaultOpen={false}
    open={isStreaming ? true : undefined}
    className={cn("w-full", className)}
    {...props}
  >
    {children}
  </CollapsiblePrimitive.Root>
));
Reasoning.displayName = "Reasoning";

const ReasoningTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleTrigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger> & {
    title?: string;
    getThinkingMessage?: (isStreaming: boolean, duration?: number) => React.ReactNode;
  }
>(({ title, getThinkingMessage, className, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [startTime] = React.useState(Date.now());
  
  React.useEffect(() => {
    // Update open state based on Collapsible state
    const updateOpenState = () => {
      const collapsible = ref as any;
      if (collapsible?.current) {
        // This would need to be implemented based on Radix UI's API
        // For now, we'll use internal state management
      }
    };
    
    const interval = setInterval(updateOpenState, 100);
    return () => clearInterval(interval);
  }, [ref]);

  const isStreaming = isOpen && !getThinkingMessage;
  const duration = Date.now() - startTime;

  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      ref={ref}
      className={cn(
        "group flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {isStreaming ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
        )}
        <span>
          {title || (isStreaming ? "Thinking..." : "Reasoning")}
        </span>
      </div>
      
      {getThinkingMessage && isStreaming && (
        <span className="text-muted-foreground text-xs">
          {getThinkingMessage(true, duration)}
        </span>
      )}
      
      {children}
    </CollapsiblePrimitive.CollapsibleTrigger>
  );
});
ReasoningTrigger.displayName = "ReasoningTrigger";

const ReasoningContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleContent
    ref={ref}
    className={cn(
      "overflow-hidden text-sm animate-in slide-in-from-top-2 fade-in-0 duration-200",
      className
    )}
    {...props}
  >
    <div className="rounded-md border p-3 bg-muted/50">
      <div className="whitespace-pre-wrap">{children}</div>
    </div>
  </CollapsiblePrimitive.CollapsibleContent>
));
ReasoningContent.displayName = "ReasoningContent";

export { Reasoning, ReasoningContent, ReasoningTrigger };
