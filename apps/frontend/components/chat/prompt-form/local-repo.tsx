"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  saveGitSelectorCookie,
  deleteGitSelectorCookie,
} from "@/lib/actions/git-selector-cookie";
import { cn } from "@/lib/utils";
import {
  FolderOpen,
  GitBranch,
  Loader2,
  HardDrive,
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

import type { FilteredRepository as Repository } from "@/lib/github/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";

// Type for local repo selection
export interface LocalRepoSelection {
  path: string;
  name: string;
  branch: string;
}

export function LocalRepoConnection({
  isOpen,
  setIsOpen,
  selectedRepo,
  selectedBranch,
  setSelectedRepo,
  setSelectedBranch,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedRepo: Repository | null;
  selectedBranch: { name: string; commitSha: string } | null;
  setSelectedRepo: (repo: Repository | null) => void;
  setSelectedBranch: (
    branch: { name: string; commitSha: string } | null
  ) => void;
}) {
  const [localPath, setLocalPath] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleSelectLocalRepo = useCallback(async () => {
    if (!localPath.trim()) {
      toast.error("Please enter a local repository path");
      return;
    }

    // Normalize the path
    const normalizedPath = localPath.trim();
    
    // Basic validation - check if it looks like an absolute path
    if (!normalizedPath.startsWith("/") && !normalizedPath.startsWith("~")) {
      toast.error("Please enter an absolute path (starting with / or ~)");
      return;
    }

    setIsValidating(true);

    try {
      // Create a Repository-like object for local repos
      // The path serves as the unique identifier
      const repoName = normalizedPath.split("/").filter(Boolean).pop() || "local-repo";
      
      const localRepo: Repository = {
        id: Date.now(), // Use timestamp as a unique ID
        name: repoName,
        full_name: normalizedPath, // Store the full path as full_name for local repos
        owner: {
          login: "local",
          type: "local",
        },
        pushed_at: new Date().toISOString(),
      };

      // Set the default branch - in a real implementation, we'd detect this from git
      const defaultBranch = { name: "main", commitSha: "local" };

      console.log("Setting local repo:", { localRepo, defaultBranch });
      setSelectedRepo(localRepo);
      setSelectedBranch(defaultBranch);
      setIsOpen(false);

      // Save to cookie
      try {
        await saveGitSelectorCookie({
          repo: localRepo,
          branch: defaultBranch,
        });
        console.log("Saved to cookie successfully");
      } catch (error) {
        console.error("Failed to save git selector state:", error);
      }

      toast.success(`Selected local repo: ${repoName}`);
    } catch (error) {
      console.error("Failed to validate local repo:", error);
      toast.error("Failed to validate local repository");
    } finally {
      setIsValidating(false);
    }
  }, [localPath, setSelectedRepo, setSelectedBranch, setIsOpen]);

  const handleClearSelection = useCallback(async () => {
    setSelectedRepo(null);
    setSelectedBranch(null);
    setLocalPath("");
    try {
      await deleteGitSelectorCookie();
    } catch (error) {
      console.error("Failed to delete git selector cookie:", error);
    }
  }, [setSelectedRepo, setSelectedBranch]);

  // Check if the selected repo is a local repo by checking if full_name is an absolute path
  // or if owner type is "local"
  const isLocalRepo = selectedRepo?.full_name?.startsWith("/") || 
                      selectedRepo?.full_name?.startsWith("~") ||
                      selectedRepo?.owner?.type === "local";

  const getButtonText = () => {
    if (selectedRepo && selectedBranch && isLocalRepo) {
      return (
        <>
          <HardDrive className="size-4" />
          <span className="max-w-[150px] truncate">{selectedRepo.name}</span>
          <GitBranch className="size-4" />
          <span>{selectedBranch.name}</span>
        </>
      );
    }

    return (
      <>
        <HardDrive className="size-4" />
        <span>Local Repo</span>
      </>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "text-muted-foreground hover:bg-accent shrink overflow-hidden font-normal",
                isLocalRepo && selectedRepo && "text-foreground"
              )}
            >
              {getButtonText()}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        {!isOpen && (
          <TooltipContent side="top" align="end">
            Select Local Repository
          </TooltipContent>
        )}
      </Tooltip>

      <PopoverContent
        className="w-80 p-0"
        align="end"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="size-4" />
            <div className="font-medium">Select Local Repository</div>
          </div>
          
          <div className="text-muted-foreground text-sm">
            Enter the absolute path to your local git repository.
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="/path/to/your/repo"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSelectLocalRepo();
                }
              }}
              className="bg-background border-input focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2"
              autoFocus
            />
            
            <Button
              onClick={handleSelectLocalRepo}
              disabled={isValidating || !localPath.trim()}
              className="w-full"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Select Repository"
              )}
            </Button>

            {isLocalRepo && selectedRepo && (
              <Button
                variant="outline"
                onClick={handleClearSelection}
                className="w-full"
              >
                Clear Selection
              </Button>
            )}
          </div>

          <div className="text-muted-foreground text-xs">
            <p>Examples:</p>
            <ul className="ml-4 list-disc">
              <li>/Users/username/projects/my-app</li>
              <li>~/projects/my-app</li>
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
