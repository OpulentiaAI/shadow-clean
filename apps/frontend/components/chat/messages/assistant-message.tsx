import { cn } from "@/lib/utils";
import type {
  Message,
  ErrorPart,
  ToolResultTypes,
  ValidationErrorResult,
  ToolCallPart,
  ReasoningPart,
  RedactedReasoningPart,
} from "@repo/types";
import { AlertCircle, Copy, Check, MoreHorizontal } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { MemoizedMarkdown } from "../markdown/memoized-markdown";
import { ToolMessage } from "../tools";
import { ToolComponent } from "../tools/tool";
import { ValidationErrorTool } from "../tools/validation-error";
import { ReasoningComponent, RedactedReasoningComponent } from "./reasoning";
import {
  hasUsefulPartialArgs,
  STREAMING_ENABLED_TOOLS,
} from "@/lib/streaming-args";
import { PRCard } from "./pr-card";
import { LoadingPRCard } from "./loading-pr-card";
import { Button } from "../../ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "../../ui/tooltip";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useTaskSocketContext } from "@/contexts/task-socket-context";
import { useTask } from "@/hooks/tasks/use-task";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

type GroupedPart =
  | { type: "text"; text: string; key: string }
  | { type: "tool-call"; part: any; index: number; key: string }
  | { type: "tool-result"; part: any; index: number; key: string }
  | { type: "error"; part: ErrorPart; index: number; key: string }
  | { type: "reasoning"; part: ReasoningPart; index: number; key: string }
  | {
      type: "redacted-reasoning";
      part: RedactedReasoningPart;
      index: number;
      key: string;
    }
  | { type: "unknown"; part: any; index: number; key: string };

function getMessageCopyContent(groupedParts: GroupedPart[]): string {
  return groupedParts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      } else if (
        part.type === "tool-call" &&
        typeof part.part === "object" &&
        part.part !== null &&
        "toolName" in part.part
      ) {
        return `Tool Call: ${part.part.toolName}`;
      } else if (part.type === "reasoning") {
        return `Thinking: ${part.part.text}`;
      } else if (part.type === "redacted-reasoning") {
        return `Thinking: [redacted]`;
      } else if (part.type === "unknown") {
        return `Data: ${JSON.stringify(part.part)}`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export function AssistantMessage({
  message,
  taskId,
  showGenerating,
}: {
  message: Message;
  taskId: string;
  showGenerating: boolean;
}) {
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const {
    copyToClipboard: copyMessageContent,
    isCopied: isMessageContentCopied,
  } = useCopyToClipboard();
  const { copyToClipboard: copyMessageId } = useCopyToClipboard();
  const { autoPRStatus } = useTaskSocketContext();
  const { task } = useTask(taskId);
  const isScratchpadTask = !!task?.isScratchpad;

  const normalizedParts = useMemo(() => {
    if (!message.metadata?.parts || message.metadata.parts.length === 0) {
      return [] as any[];
    }

    return message.metadata.parts.map((part: any) => {
      const rawType = typeof part.type === "string" ? part.type : "";
      const normalizedType = rawType.replace(/_/g, "-");

      if (
        normalizedType === "tool-call-delta" ||
        normalizedType === "tool-call" ||
        normalizedType === "tool-call-start"
      ) {
        return {
          ...part,
          type: "tool-call",
          toolCallId: part.toolCallId ?? part.id,
          toolName: part.toolName ?? part.name,
          args: part.args ?? part.input ?? part.partialArgs,
          partialArgs: part.partialArgs ?? part.args ?? part.input,
          streamingState:
            part.streamingState ??
            (normalizedType === "tool-call-delta" ? "streaming" : undefined),
          argsComplete: normalizedType !== "tool-call-delta",
        };
      }

      if (normalizedType === "tool-result") {
        return {
          ...part,
          type: "tool-result",
          toolCallId: part.toolCallId ?? part.id,
          toolName: part.toolName ?? part.name,
          result: part.result ?? part.output,
          output: part.output ?? part.result,
        };
      }

      if (normalizedType === "text-delta") {
        return {
          ...part,
          type: "text",
          text: part.text ?? part.delta ?? "",
        };
      }

      return { ...part, type: normalizedType || part.type };
    });
  }, [message.metadata?.parts]);

  const toolResultsMap = useMemo(() => {
    const map = new Map<string, { result: unknown; toolName: string }>();
    if (normalizedParts.length === 0) return map;
    normalizedParts.forEach((part: any) => {
      if (part.type === "tool-result") {
        // Handle both AI SDK v4 (result) and v5 (output) property names
        const resultValue = (part as any).output ?? (part as any).result;
        map.set(part.toolCallId, {
          result: resultValue,
          toolName: part.toolName,
        });
      }
    });
    return map;
  }, [normalizedParts]);

  // Group consecutive text parts together for better rendering
  const groupedParts = useMemo(() => {
    if (normalizedParts.length === 0) {
      return message.content
        ? ([{ type: "text", text: message.content }] as GroupedPart[])
        : [];
    }

    const parts: GroupedPart[] = [];
    let currentTextGroup = "";
    const toolCallIndex = new Map<string, number>();

    const flushTextGroup = () => {
      if (!currentTextGroup) return;
      parts.push({
        type: "text",
        text: currentTextGroup,
        key: `${message.id}-text-${parts.length}`,
      });
      currentTextGroup = "";
    };

    const pushToolCall = (part: any, index: number) => {
      const toolCallId = part.toolCallId ?? `tool-${index}`;
      const groupedPart: GroupedPart = {
        type: "tool-call",
        part,
        index,
        key: `${message.id}-tool-${toolCallId}`,
      };

      if (toolCallIndex.has(toolCallId)) {
        const existingIndex = toolCallIndex.get(toolCallId)!;
        parts[existingIndex] = groupedPart;
      } else {
        toolCallIndex.set(toolCallId, parts.length);
        parts.push(groupedPart);
      }
    };

    normalizedParts.forEach((part: any, index: number) => {
      if (part.type === "text" && part.text !== undefined) {
        currentTextGroup += part.text;
      } else {
        flushTextGroup();
        if (part.type === "tool-call") {
          pushToolCall(part, index);
        } else if (part.type === "tool-result") {
          parts.push({
            type: "tool-result",
            part,
            index,
            key: `${message.id}-tool-result-${part.toolCallId ?? index}`,
          });
        } else if (part.type === "error") {
          parts.push({
            type: "error",
            part: part as ErrorPart,
            index,
            key: `${message.id}-error-${index}`,
          });
        } else if (part.type === "reasoning") {
          parts.push({
            type: "reasoning",
            part: part as ReasoningPart,
            index,
            key: `${message.id}-reasoning-${index}`,
          });
        } else if (part.type === "redacted-reasoning") {
          parts.push({
            type: "redacted-reasoning",
            part: part as RedactedReasoningPart,
            index,
            key: `${message.id}-redacted-${index}`,
          });
        } else {
          parts.push({
            type: "unknown",
            part,
            index,
            key: `${message.id}-unknown-${index}`,
          });
        }
      }
    });

    if (currentTextGroup) {
      parts.push({
        type: "text",
        text: currentTextGroup,
        key: `${message.id}-text-${parts.length}`,
      });
    }

    return parts;
  }, [normalizedParts, message.content, message.id]);

  const copyContent = useMemo(
    () => getMessageCopyContent(groupedParts),
    [groupedParts]
  );

  const handleCopyMessageContent = useCallback(() => {
    copyMessageContent(copyContent);
  }, [copyMessageContent, copyContent]);

  const handleCopyMessageId = useCallback(() => {
    copyMessageId(message.id);
  }, [copyMessageId, message.id]);

  // Debug: Log grouped parts for tool call troubleshooting
  console.log("[ASSISTANT_MESSAGE] Rendering:", {
    messageId: message.id,
    hasMetadata: !!message.metadata,
    partsCount: message.metadata?.parts?.length ?? 0,
    normalizedPartsCount: normalizedParts.length,
    groupedPartsCount: groupedParts.length,
    groupedPartsTypes: groupedParts.map((g) => g.type),
    toolResultsMapSize: toolResultsMap.size,
    toolResultsMapKeys: Array.from(toolResultsMap.keys()),
  });

  return (
    <div
      className={cn(
        "group/assistant-message relative flex flex-col gap-1",
        groupedParts[groupedParts.length - 1]?.type !== "text" ? "pb-3" : ""
      )}
    >
      {groupedParts.map((group, groupIndex) => {
        if (group.type === "text") {
          return (
            <div key={group.key} className="px-3 py-2 text-sm">
              <MemoizedMarkdown
                content={group.text}
                id={`${message.id}-text-${groupIndex}`}
              />
            </div>
          );
        }

        if (group.type === "tool-call") {
          const part = group.part as ToolCallPart;
          const toolResult = toolResultsMap.get(part.toolCallId);

          // Check if result is a validation error
          const isValidationError =
            toolResult?.result &&
            typeof toolResult.result === "object" &&
            "success" in toolResult.result &&
            toolResult.result.success === false &&
            // Exclude terminal commands that actually executed (have exitCode)
            !(
              part.toolName === "run_terminal_cmd" &&
              "exitCode" in toolResult.result
            );

          if (isValidationError) {
            return (
              <ValidationErrorTool
                key={group.key}
                toolName={part.toolName}
                toolCallId={part.toolCallId}
                args={part.args as Record<string, unknown>}
                error={toolResult.result as ValidationErrorResult}
              />
            );
          }

          // Determine status from streaming state and result availability
          const isStreamingMessage = part.streamingState !== undefined;
          const isInProgress = isStreamingMessage
            ? !part.argsComplete || !toolResult // Streaming: check both
            : !toolResult; // Database: only check result exists
          const status = isInProgress ? "RUNNING" : "COMPLETED";

          if (isStreamingMessage && isInProgress) {
            if (
              STREAMING_ENABLED_TOOLS.includes(
                part.toolName as (typeof STREAMING_ENABLED_TOOLS)[number]
              )
            ) {
              const hasUseful = hasUsefulPartialArgs(
                part.partialArgs || {},
                part.toolName
              );

              if (!hasUseful) {
                return null;
              }
            } else {
              // For all other tools, hide until complete to avoid errors with incomplete data
              // This can be removed once support is added for streaming all tool calls
              // For the initial launch we'll leave at this
              return null;
            }
          }

          // Create a proper tool message for rendering
          // Merge regular args with partial args from streaming
          const mergedArgs = {
            ...(part.args || {}),
            ...(part.partialArgs || {}), // Partial args take precedence during streaming
          } as Record<string, unknown>;

          const toolMessage: Message = {
            id: `${message.id}-tool-${part.toolCallId}`,
            role: "tool",
            content: "",
            createdAt: message.createdAt,
            llmModel: message.llmModel,
            metadata: {
              tool: {
                name: part.toolName,
                args: mergedArgs,
                status,
                result: toolResult?.result as ToolResultTypes["result"],
              },
              streamingState: part.streamingState,
              partialArgs: part.partialArgs,
            },
          };

          return (
            <div key={group.key}>
              <ToolMessage message={toolMessage} />
            </div>
          );
        }

        // Skip standalone tool-result parts since they're handled with tool-call parts
        if (group.type === "tool-result") {
          return null;
        }

        // Render error parts
        if (group.type === "error") {
          return (
            <ToolComponent
              key={group.key}
              icon={<AlertCircle className="text-destructive" />}
              title="Error occurred"
              type={"error"}
              collapsible
            >
              {group.part.error}
            </ToolComponent>
          );
        }

        // Render reasoning parts
        if (group.type === "reasoning") {
          // Detect if this is a streaming message and if reasoning is the latest part
          const isStreamingMessage = message.metadata?.isStreaming === true;
          const isLatestPart = groupIndex === groupedParts.length - 1;
          const isLoading = isStreamingMessage && isLatestPart;

          return (
            <ReasoningComponent
              key={group.key}
              part={group.part}
              isLoading={isLoading}
              forceOpen={isLoading}
            />
          );
        }

        // Render redacted reasoning parts
        if (group.type === "redacted-reasoning") {
          return <RedactedReasoningComponent key={group.key} />;
        }

        return null;
      })}

      {showGenerating && (
        <div
          key={JSON.stringify(message.metadata?.parts)}
          className="animate-in fade-in delay-2000 fill-mode-both ease-out-quad duration-300"
        >
          <div className="shimmer flex h-7 w-fit items-center px-3 text-[13px]">
            Reasoning
          </div>
        </div>
      )}

      {/* Show PR card if this assistant message has a PR snapshot */}
      {!isScratchpadTask && message.pullRequestSnapshot && (
        <PRCard
          taskId={taskId}
          snapshot={message.pullRequestSnapshot}
          messageId={message.id}
        />
      )}

      {/* Show loading PR card during auto-PR creation */}
      {!isScratchpadTask &&
        !message.pullRequestSnapshot &&
        autoPRStatus?.messageId === message.id &&
        (autoPRStatus.status === "in-progress" ||
          (autoPRStatus.status === "completed" && autoPRStatus.snapshot)) &&
        (autoPRStatus.status === "in-progress" ? (
          <LoadingPRCard />
        ) : autoPRStatus.status === "completed" && autoPRStatus.snapshot ? (
          <PRCard
            taskId={taskId}
            snapshot={{
              id: "temp-snapshot",
              messageId: message.id,
              status: autoPRStatus.snapshot.status,
              title: autoPRStatus.snapshot.title,
              description: autoPRStatus.snapshot.description,
              filesChanged: autoPRStatus.snapshot.filesChanged,
              linesAdded: autoPRStatus.snapshot.linesAdded,
              linesRemoved: autoPRStatus.snapshot.linesRemoved,
              commitSha: autoPRStatus.snapshot.commitSha,
              createdAt: new Date(),
            }}
            messageId={message.id}
          />
        ) : null)}

      <div
        className={cn(
          "absolute -bottom-4 left-0 flex w-full items-center justify-end px-3 opacity-0 transition-all",
          "focus-within:opacity-100 group-hover/assistant-message:opacity-100",
          isMoreDropdownOpen && "opacity-100"
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="iconSm"
              className="text-muted-foreground hover:text-foreground"
              disabled={isMessageContentCopied}
              onClick={handleCopyMessageContent}
            >
              {isMessageContentCopied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>
          </TooltipTrigger>

          <TooltipContent side="bottom" align="end">
            Copy to Clipboard
          </TooltipContent>
        </Tooltip>

        <DropdownMenu
          open={isMoreDropdownOpen}
          onOpenChange={setIsMoreDropdownOpen}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="iconSm"
              className="text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="rounded-lg" align="end">
            <DropdownMenuItem
              className="text-muted-foreground hover:text-foreground h-7 rounded-md py-0"
              onClick={handleCopyMessageId}
            >
              Copy Message ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
