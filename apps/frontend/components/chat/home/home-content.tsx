"use client";

import { useEffect, useState, useTransition, useCallback, useRef } from "react";
import { OpulentLogo } from "../../graphics/logo/opulent-logo";
import { RichTextEditor } from "../prompt-form/rich-text-editor";
import { RepoIssues } from "./repo-issues";
import { WelcomeModal } from "../../welcome-modal";
import { useAuthSession } from "../../auth/session-provider";
import { createTask } from "@/lib/actions/create-task";
import { saveModelSelectorCookie } from "@/lib/actions/model-selector-cookie";
import { useSelectedModel } from "@/hooks/chat/use-selected-model";
import { useQueryClient } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import { generateIssuePrompt } from "@/lib/github/issue-prompt";
import type { FilteredRepository } from "@/lib/github/types";
import type { ModelType, GitHubIssue } from "@repo/types";

const WELCOME_MODAL_SHOWN_KEY = "shadow-welcome-modal-shown";
const WELCOME_MODAL_COMPLETED_KEY = "shadow-welcome-modal-completed";
const WELCOME_MODAL_DELAY = 300;

export function HomePageContent({
  initialGitCookieState,
  initialSelectedModel,
}: {
  initialGitCookieState?: {
    repo: FilteredRepository | null;
    branch: { name: string; commitSha: string } | null;
  } | null;
  initialSelectedModel?: ModelType | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [message, setMessage] = useState("");
  
  const { session, isLoading } = useAuthSession();
  const { data: querySelectedModel } = useSelectedModel();
  const queryClient = useQueryClient();
  
  const [selectedModel, setSelectedModel] = useState<ModelType | null>(
    initialSelectedModel ?? null
  );
  const [repo, setRepoState] = useState<FilteredRepository | null>(
    initialGitCookieState?.repo || null
  );
  const [branch, setBranchState] = useState<{
    name: string;
    commitSha: string;
  } | null>(initialGitCookieState?.branch || null);
  const [isScratchpadMode, setIsScratchpadMode] = useState(false);
  
  // Use refs to always have latest values in callbacks (avoids stale closure)
  const repoRef = useRef<FilteredRepository | null>(repo);
  const branchRef = useRef<{ name: string; commitSha: string } | null>(branch);
  
  // Keep refs in sync with state (important for initial values and any external updates)
  useEffect(() => {
    repoRef.current = repo;
  }, [repo]);
  
  useEffect(() => {
    branchRef.current = branch;
  }, [branch]);
  
  // Wrapper setters that update both state and ref
  const setRepo = useCallback((newRepo: FilteredRepository | null) => {
    console.log("setRepo called with:", newRepo?.name);
    repoRef.current = newRepo;
    setRepoState(newRepo);
  }, []);
  
  const setBranch = useCallback((newBranch: { name: string; commitSha: string } | null) => {
    console.log("setBranch called with:", newBranch?.name);
    branchRef.current = newBranch;
    setBranchState(newBranch);
  }, []);

  // Sync model from query
  useEffect(() => {
    if (querySelectedModel) {
      setSelectedModel(querySelectedModel);
    }
  }, [querySelectedModel]);

  useEffect(() => {
    // Show welcome modal for authenticated users who haven't completed the welcome flow
    if (!isLoading && session) {
      const hasCompletedWelcome = localStorage.getItem(
        WELCOME_MODAL_COMPLETED_KEY
      );

      if (!hasCompletedWelcome) {
        setTimeout(() => {
          setShowWelcomeModal(true);
        }, WELCOME_MODAL_DELAY);
      }
    }
  }, [session, isLoading]);

  const handleWelcomeModalClose = (open: boolean) => {
    setShowWelcomeModal(open);
    if (!open) {
      localStorage.setItem(WELCOME_MODAL_SHOWN_KEY, "true");
      localStorage.setItem(WELCOME_MODAL_COMPLETED_KEY, "true");
    }
  };

  const handleSelectModel = useCallback(
    async (model: ModelType | null) => {
      setSelectedModel(model);
      try {
        await saveModelSelectorCookie(model);
      } catch (error) {
        console.error("Failed to save model selection:", error);
      }
    },
    []
  );

  const handleSubmit = useCallback((directMessage?: string) => {
    if (isPending) return;
    
    // Use refs for latest values (avoids stale closure issues)
    const currentRepo = repoRef.current;
    const currentBranch = branchRef.current;
    
    // Use directly passed message if available, otherwise use state
    const messageToSubmit = directMessage ?? message;
    
    // Debug logging
    console.log("handleSubmit called with:", { 
      repo: currentRepo?.name, 
      branch: currentBranch?.name, 
      selectedModel, 
      message: messageToSubmit.substring(0, 50),
      directMessage: !!directMessage
    });
    
    if (!selectedModel) {
      toast.error("Please select a model first");
      return;
    }
    if (!messageToSubmit.trim()) {
      toast.error("Please enter a message");
      return;
    }

    const formData = new FormData();
    formData.append("message", messageToSubmit);
    formData.append("model", selectedModel);

    if (isScratchpadMode) {
      formData.append("isScratchpad", "true");
    } else {
      if (!currentRepo || !currentBranch) {
        console.log("Missing repo or branch:", {
          repo: currentRepo ? { name: currentRepo.name, full_name: currentRepo.full_name } : null,
          branch: currentBranch ? { name: currentBranch.name } : null,
        });
        toast.error("Please select a repository first");
        return;
      }

      const isLocalRepo =
        currentRepo.full_name.startsWith("/") ||
        currentRepo.full_name.startsWith("~") ||
        currentRepo.owner?.type === "local";

      const repoUrl = isLocalRepo
        ? currentRepo.full_name
        : `https://github.com/${currentRepo.full_name}`;

      console.log("Submitting task with:", {
        repoUrl,
        repoFullName: currentRepo.full_name,
        baseBranch: currentBranch.name,
      });

      formData.append("repoUrl", repoUrl);
      formData.append("repoFullName", currentRepo.full_name);
      formData.append("baseBranch", currentBranch.name);
      formData.append("baseCommitSha", currentBranch.commitSha);
    }

    startTransition(async () => {
      let taskId: string | null = null;
      try {
        taskId = await createTask(formData);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        if (
          errorMessage.includes("maximum of") &&
          errorMessage.includes("active tasks")
        ) {
          toast.error("Task limit reached", { description: errorMessage });
        } else {
          toast.error("Failed to create task", { description: errorMessage });
        }
      }
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        setMessage("");
        redirect(`/tasks/${taskId}`);
      }
    });
  }, [message, selectedModel, isPending, queryClient]);

  const handleCreateTaskForIssue = useCallback((issue: GitHubIssue) => {
    const currentRepo = repoRef.current;
    const currentBranch = branchRef.current;
    
    if (!currentRepo || !currentBranch || isPending || !selectedModel) {
      if (!selectedModel) toast.error("Please select a model first");
      return;
    }

    const completeRepoUrl = `https://github.com/${currentRepo.full_name}`;
    const issuePrompt = generateIssuePrompt(issue);

    const formData = new FormData();
    formData.append("message", issuePrompt);
    formData.append("model", selectedModel);
    formData.append("repoUrl", completeRepoUrl);
    formData.append("repoFullName", currentRepo.full_name);
    formData.append("baseBranch", currentBranch.name);
    formData.append("baseCommitSha", currentBranch.commitSha);

    startTransition(async () => {
      let taskId: string | null = null;
      try {
        taskId = await createTask(formData);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error("Failed to create task", { description: errorMessage });
      }
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        redirect(`/tasks/${taskId}`);
      }
    });
  }, [isPending, selectedModel, queryClient]);

  return (
    <div className="mx-auto flex w-full flex-col items-center overflow-hidden">
      {/* Header */}
      <div className="mb-6 mt-20 flex select-none items-center gap-4 text-3xl font-medium tracking-tighter">
        <OpulentLogo size="lg" className={isPending ? "animate-pulse" : ""} />
        <span className="font-cybertruck">Opulent Code</span>
      </div>

      {/* Rich Text Editor with integrated selectors */}
      <RichTextEditor
        placeholder="Build features, fix bugs, and understand codebases..."
        value={message}
        onChange={setMessage}
        onSubmit={handleSubmit}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        selectedRepo={repo}
        setSelectedRepo={setRepo}
        selectedBranch={branch}
        setSelectedBranch={setBranch}
        isScratchpadMode={isScratchpadMode}
        onToggleScratchpad={setIsScratchpadMode}
        isDisabled={false}
        isPending={isPending}
        isHome
      />

      {/* GitHub issues - only show for GitHub repos, not local repos */}
      {repo && branch && !isScratchpadMode && !repo.full_name.startsWith("/") && !repo.full_name.startsWith("~") && repo.owner?.type !== "local" && (
        <div className="mt-6 w-full max-w-[805px] px-4">
          <RepoIssues
            repository={repo}
            isPending={isPending}
            handleSubmit={handleCreateTaskForIssue}
          />
        </div>
      )}

      <WelcomeModal
        open={showWelcomeModal}
        onOpenChange={handleWelcomeModalClose}
      />
    </div>
  );
}
