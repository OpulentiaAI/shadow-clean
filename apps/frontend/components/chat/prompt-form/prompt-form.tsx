"use client";

import "../messages/messages.css";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector } from "./model-selector";

import { createTask } from "@/lib/actions/create-task";
import { saveModelSelectorCookie } from "@/lib/actions/model-selector-cookie";
import { cn } from "@/lib/utils";
import { type ModelType } from "@repo/types";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  GitBranchPlus,
  ListEnd,
  Loader2,
  MessageCircle,
  MessageCircleX,
  Square,
  X,
} from "lucide-react";
import { redirect, useParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  TransitionStartFunction,
} from "react";
import { toast } from "sonner";
import { GithubConnection } from "./github";
import { LocalRepoConnection } from "./local-repo";
import { RepoIssues } from "../home/repo-issues";
import type { GitHubIssue } from "@repo/types";
import type { FilteredRepository as Repository } from "@/lib/github/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { QueuedAction } from "../messages/queued-message";
import { generateIssuePrompt } from "@/lib/github/issue-prompt";
import { useSelectedModel } from "@/hooks/chat/use-selected-model";

export function PromptForm({
  onSubmit,
  onCreateStackedPR,
  onStopStream,
  isStreaming = false,
  isHome = false,
  onFocus,
  onBlur,
  initialGitCookieState,
  initialSelectedModel,
  isInitializing = false,
  transition,
}: {
  onSubmit?: (message: string, model: ModelType, queue: boolean) => void;
  onCreateStackedPR?: (
    message: string,
    model: ModelType,
    queue: boolean
  ) => void;
  onStopStream?: () => void;
  isStreaming?: boolean;
  isHome?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  initialGitCookieState?: {
    repo: Repository | null;
    branch: { name: string; commitSha: string } | null;
  } | null;
  initialSelectedModel?: ModelType | null;
  isInitializing?: boolean;
  transition?: {
    isPending: boolean;
    startTransition: TransitionStartFunction;
  };
}) {
  const { taskId } = useParams<{ taskId: string }>();
  const { isPending, startTransition } = transition || {};

  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: querySelectedModel } = useSelectedModel();
  const [selectedModel, setSelectedModel] = useState<ModelType | null>(
    initialSelectedModel ?? null
  );

  useEffect(() => {
    if (isHome) {
      setSelectedModel(querySelectedModel ?? null);
    }
  }, [isHome, querySelectedModel]);

  // When not on the home page, sync the selected model once the task-provided
  // initial model arrives (e.g., after the task query resolves). This prevents
  // the selector from showing empty on first load or after submits that trigger
  // a re-render.
  useEffect(() => {
    if (!isHome && initialSelectedModel) {
      setSelectedModel(initialSelectedModel);
    }
  }, [isHome, initialSelectedModel]);

  const [repo, setRepo] = useState<Repository | null>(
    initialGitCookieState?.repo || null
  );
  const [branch, setBranch] = useState<{
    name: string;
    commitSha: string;
  } | null>(initialGitCookieState?.branch || null);

  const handleSelectModel = useCallback(
    async (model: ModelType | null) => {
      setSelectedModel(model);
      // Persist the model selection if on home page
      if (isHome) {
        try {
          await saveModelSelectorCookie(model);
        } catch (error) {
          console.error("Failed to save model selection:", error);
        }
      }
    },
    [isHome]
  );

  const queryClient = useQueryClient();

  const [isMessageOptionsOpen, setIsMessageOptionsOpen] = useState(false);
  const [isGithubConnectionOpen, setIsGithubConnectionOpen] = useState(false);
  const [isLocalRepoOpen, setIsLocalRepoOpen] = useState(false);

  const messageOptions = useMemo(() => {
    const queueAction = () => {
      if (!selectedModel) {
        toast.error("Please select a model first");
        return;
      }
      onSubmit?.(message, selectedModel, true);
      queryClient.setQueryData(["queued-action", taskId], {
        type: "message",
        message,
        model: selectedModel,
      });
      setMessage("");
    };

    const sendAction = () => {
      if (!selectedModel) {
        toast.error("Please select a model first");
        return;
      }
      onSubmit?.(message, selectedModel, false);
      setMessage("");
    };

    const stackPRAction = (queue: boolean) => () => {
      if (!selectedModel) {
        toast.error("Please select a model first");
        return;
      }
      onCreateStackedPR?.(message, selectedModel, queue);
      if (queue) {
        queryClient.setQueryData(["queued-action", taskId], {
          type: "stacked-pr",
          message,
          model: selectedModel,
        });
      }
      setMessage("");
    };

    return isStreaming
      ? [
          {
            id: "queue",
            icon: ListEnd,
            label: "Queue Message",
            action: queueAction,
            shortcut: {
              key: "Enter",
              meta: false,
              ctrl: false,
              alt: false,
              shift: false,
            },
          },
          {
            id: "send",
            icon: MessageCircleX,
            label: "Stop & Send",
            action: sendAction,
            shortcut: {
              key: "Enter",
              meta: true,
              ctrl: false,
              alt: false,
              shift: false,
            },
          },
          {
            id: "stack-pr",
            icon: GitBranchPlus,
            label: "Queue Stacked Branch",
            action: stackPRAction(true),
            shortcut: {
              key: "Enter",
              meta: false,
              ctrl: false,
              alt: true,
              shift: false,
            },
          },
        ]
      : [
          {
            id: "send",
            icon: MessageCircle,
            label: "Send Message",
            action: sendAction,
            shortcut: {
              key: "Enter",
              meta: false,
              ctrl: false,
              alt: false,
              shift: false,
            },
          },
          {
            id: "stack-pr",
            icon: GitBranchPlus,
            label: "Create Stacked Branch",
            action: stackPRAction(false),
            shortcut: {
              key: "Enter",
              meta: false,
              ctrl: false,
              alt: true,
              shift: false,
            },
          },
        ];
  }, [isStreaming, onSubmit, message, selectedModel, queryClient, taskId]);

  const formatShortcut = useCallback(
    (shortcut: {
      key: string;
      meta: boolean;
      ctrl: boolean;
      alt: boolean;
      shift: boolean;
    }) => {
      const modifiers = [];
      if (shortcut.meta) modifiers.push("⌘");
      if (shortcut.ctrl) modifiers.push("⌃");
      if (shortcut.alt) modifiers.push("⌥");
      if (shortcut.shift) modifiers.push("⇧");

      const keyDisplay = shortcut.key === "Enter" ? "⏎" : shortcut.key;
      return modifiers.length > 0
        ? `${modifiers.join("")}${keyDisplay}`
        : keyDisplay;
    },
    []
  );

  const handleInitiateTask = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!repo || !branch || !message.trim() || !selectedModel || isPending) {
        return;
      }

      // Check if this is a local repo (path starts with / or ~, or owner type is "local")
      const isLocalRepo = repo.full_name.startsWith("/") || 
                          repo.full_name.startsWith("~") ||
                          repo.owner?.type === "local";
      
      // For local repos, use the full_name as the path; for GitHub, construct the URL
      const repoUrl = isLocalRepo ? repo.full_name : `https://github.com/${repo.full_name}`;

      const formData = new FormData();
      formData.append("message", message);
      formData.append("model", selectedModel);
      formData.append("repoUrl", repoUrl);
      formData.append("repoFullName", repo.full_name);
      formData.append("baseBranch", branch.name);
      formData.append("baseCommitSha", branch.commitSha);

      startTransition?.(async () => {
        let taskId: string | null = null;
        try {
          taskId = await createTask(formData);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          // Show specific toast for task limit errors
          if (
            errorMessage.includes("maximum of") &&
            errorMessage.includes("active tasks")
          ) {
            toast.error("Task limit reached", {
              description: errorMessage,
            });
          } else {
            toast.error("Failed to create task", {
              description: errorMessage,
            });
          }
        }
        if (taskId) {
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          redirect(`/tasks/${taskId}`);
        }
      });
    },
    [repo, branch, message, selectedModel, queryClient]
  );

  // Submission handling for home page
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isHome) {
        handleInitiateTask(e);
      } else {
        if (isStreaming && !message.trim()) {
          onStopStream?.();
        } else if (message.trim()) {
          handleOpenMessageOptions();
        }
      }
    },
    [isHome, message, handleInitiateTask, isStreaming, onStopStream]
  );

  // Textarea's onKeyDown handler for home page
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && isHome) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [isHome, handleSubmit]
  );

  const handleOpenMessageOptions = useCallback(() => {
    if (!isHome && message.trim()) {
      setIsMessageOptionsOpen(true);
    }
  }, [isHome, message.trim()]);

  // Keyboard shortcuts, including submission handling for task page
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Handle Cmd+/ shortcut to toggle GitHub connection (only on home page)
      if (event.key === "/" && event.metaKey && isHome) {
        event.preventDefault();
        setIsGithubConnectionOpen((prev) => !prev);
        return;
      }

      // For home page, enter handled by handleSubmit
      if (isHome) return;

      if (
        (event.key === "Escape" ||
          event.key === "Delete" ||
          event.key === "Backspace") &&
        isMessageOptionsOpen
      ) {
        event.preventDefault();
        setIsMessageOptionsOpen(false);
      }

      // Keyboard shortcuts when message options are open
      if (isMessageOptionsOpen) {
        for (const option of messageOptions) {
          const shortcut = option.shortcut;

          // Check if the key and all modifiers match
          if (
            event.key === shortcut.key &&
            (shortcut.meta ? event.metaKey : !event.metaKey) &&
            (shortcut.ctrl ? event.ctrlKey : !event.ctrlKey) &&
            (shortcut.alt ? event.altKey : !event.altKey) &&
            (shortcut.shift ? event.shiftKey : !event.shiftKey)
          ) {
            event.preventDefault();
            option.action();
            setIsMessageOptionsOpen(false);
            // TODO: Handle option-specific logic
            break;
          }
        }
      } else {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          handleOpenMessageOptions();
        } else if (event.key === "Escape" && event.metaKey) {
          event.preventDefault();
          if (isStreaming) {
            onStopStream?.();
          }
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    isHome,
    isMessageOptionsOpen,
    messageOptions,
    isStreaming,
    handleOpenMessageOptions,
    isGithubConnectionOpen,
  ]);

  const handleCreateTaskForIssue = (issue: GitHubIssue) => {
    if (!repo || !branch || isPending) {
      return;
    }

    if (!selectedModel) {
      toast.error("Please select a model first");
      return;
    }

    const completeRepoUrl = `https://github.com/${repo.full_name}`;
    const issuePrompt = generateIssuePrompt(issue);

    const formData = new FormData();
    formData.append("message", issuePrompt);
    formData.append("model", selectedModel);
    formData.append("repoUrl", completeRepoUrl);
    formData.append("repoFullName", repo.full_name);
    formData.append("baseBranch", branch.name);
    formData.append("baseCommitSha", branch.commitSha);

    startTransition?.(async () => {
      let taskId: string | null = null;
      try {
        taskId = await createTask(formData);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Show specific toast for task limit errors
        if (
          errorMessage.includes("maximum of") &&
          errorMessage.includes("active tasks")
        ) {
          toast.error("Task limit reached", {
            description: errorMessage,
          });
        } else {
          toast.error("Failed to create task", {
            description: errorMessage,
          });
        }
      }
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        redirect(`/tasks/${taskId}`);
      }
    });
  };

  const isSubmitButtonDisabled = useMemo(
    () =>
      isMessageOptionsOpen ||
      isPending ||
      !selectedModel ||
      isInitializing ||
      (isHome
        ? !repo || !branch || !message.trim()
        : !isStreaming && !message.trim()),
    [
      isMessageOptionsOpen,
      isPending,
      selectedModel,
      isInitializing,
      isHome,
      repo,
      branch,
      message.trim(),
      isStreaming,
    ]
  );

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative z-0 flex w-full flex-col",
          !isHome && "bg-background sticky bottom-0 pb-6"
        )}
      >
        {!isHome && (
          <div className="from-background via-background/60 pointer-events-none absolute -left-px -top-[calc(4rem-1px)] -z-10 h-16 w-[calc(100%+2px)] -translate-y-px bg-gradient-to-t to-transparent" />
        )}

        {!isHome && <QueuedAction />}

        {/* Wrapper div with textarea styling */}
        {/* Outer div acts as a border, with a border-radius 1px larger than the inner div and 1px padding */}
        <div
          className={cn(
            "relative z-0 transition-all",
            isHome
              ? cn(
                  "shadow-highlight/10 rounded-[calc(var(--radius)+1px)] p-px shadow-lg",
                  "focus-within:ring-ring/5 focus-within:border-sidebar-border focus-within:ring-4",
                  "user-message-border hover:shadow-highlight/20 focus-within:shadow-highlight/20"
                )
              : cn(
                  "border-border/40 bg-card rounded-2xl border-[1.5px] shadow-[0_0_1px_0_rgba(0,0,0,0.05),0_0_2px_0_rgba(0,0,0,0.10)]",
                  "focus-within:shadow-[0_0_0_3px_hsl(var(--chocolate-400)/0.3)]"
                ),
            isPending && "opacity-50"
          )}
        >
          {/* Message options */}
          {!isHome && (
            <div
              className={cn(
                "ease-out-expo select-none overflow-clip transition-all duration-500",
                isMessageOptionsOpen
                  ? isStreaming
                    ? "h-[126px]"
                    : "h-[96px]"
                  : "h-0"
              )}
            >
              <div className="flex flex-col gap-0.5 p-1.5">
                <div className="text-muted-foreground flex w-full items-center justify-between gap-1 pl-1.5 text-xs font-medium">
                  <span>Select Message Option</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="iconXs"
                        tabIndex={-1}
                        className="text-muted-foreground hover:text-foreground hover:bg-sidebar-border p-0"
                        onClick={() => setIsMessageOptionsOpen(false)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="end" shortcut="esc">
                      Cancel
                    </TooltipContent>
                  </Tooltip>
                </div>
                {messageOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <Button
                      key={option.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      tabIndex={-1}
                      onClick={() => {
                        option.action();
                        setIsMessageOptionsOpen(false);
                      }}
                      className="hover:bg-sidebar-border justify-between font-normal"
                    >
                      <div className="flex items-center gap-1.5">
                        <IconComponent className="size-4" />
                        <span>{option.label}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {formatShortcut(option.shortcut)}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {isHome && (
            <>
              <div className="bg-background absolute inset-px -z-10 rounded-[calc(var(--radius)+1px)]" />
              <div className="absolute inset-0 -z-20 overflow-hidden rounded-[calc(var(--radius)+1px)]">
                <div className="new-task-pulse rotate-right absolute left-1/2 top-1/2 aspect-square w-[110%] -translate-x-1/2 -translate-y-1/2"></div>
                <div className="new-task-pulse rotate-left absolute left-1/2 top-1/2 aspect-square w-[110%] -translate-x-1/2 -translate-y-1/2"></div>
              </div>
            </>
          )}

          <div
            className={cn(
              "relative flex flex-col",
              isHome
                ? "from-card/10 to-card min-h-24 rounded-lg bg-gradient-to-t"
                : "min-h-[100px]"
            )}
          >
            {isHome && (
              <div className="bg-background absolute inset-0 -z-20 rounded-[calc(var(--radius)+1px)]" />
            )}
            <Textarea
              ref={textareaRef}
              autoFocus
              value={message}
              onChange={(e) => {
                if (!isMessageOptionsOpen && !isPending) {
                  setMessage(e.target.value);
                }
              }}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
              placeholder={
                isHome
                  ? "Build features, fix bugs, and understand codebases..."
                  : "Follow-up message..."
              }
              className={cn(
                "placeholder:text-muted-foreground/50 max-h-48 flex-1 resize-none border-0 shadow-none focus-visible:ring-0",
                isHome ? "bg-transparent!" : "bg-transparent p-3.5 text-base"
              )}
            />

            {/* Buttons inside the container */}
            <div
              className={cn(
                "flex items-center justify-between gap-2",
                isHome ? "p-2" : "px-3 pb-3"
              )}
              onClick={() => textareaRef.current?.focus()}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                <ModelSelector
                  selectedModel={selectedModel}
                  handleSelectModel={handleSelectModel}
                />
                {isHome && (
                  <>
                    <LocalRepoConnection
                      isOpen={isLocalRepoOpen}
                      setIsOpen={setIsLocalRepoOpen}
                      selectedRepo={repo}
                      selectedBranch={branch}
                      setSelectedRepo={setRepo}
                      setSelectedBranch={setBranch}
                    />
                    <GithubConnection
                      isOpen={isGithubConnectionOpen}
                      setIsOpen={setIsGithubConnectionOpen}
                      selectedRepo={repo}
                      selectedBranch={branch}
                      setSelectedRepo={setRepo}
                      setSelectedBranch={setBranch}
                    />
                  </>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isHome ? (
                  <Button
                    type="submit"
                    size="iconSm"
                    disabled={isSubmitButtonDisabled}
                    className="focus-visible:ring-primary focus-visible:ring-offset-input rounded-full focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                  </Button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitButtonDisabled}
                    title="Submit"
                    aria-label="Submit"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 disabled:bg-muted disabled:text-muted-foreground inline-flex h-7 w-9 items-center justify-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-1 text-sm font-medium shadow-sm focus:outline-none focus-visible:shadow-[0_0_0_3px_hsl(var(--chocolate-400)/0.5)] disabled:shadow-none"
                  >
                    {isPending ? (
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                    ) : isStreaming && !message.trim() ? (
                      <Square className="h-4 w-4 shrink-0 fill-current" />
                    ) : (
                      <ArrowUp className="h-5 w-5 shrink-0" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Github issues: only show on home page when repo is selected */}
      {isHome && repo && branch && (
        <RepoIssues
          repository={repo}
          isPending={isPending ?? false}
          handleSubmit={handleCreateTaskForIssue}
        />
      )}
    </>
  );
}
