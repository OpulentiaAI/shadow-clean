import { GitService } from "../execution/interfaces/git-service";
import { LLMService } from "../agent/llm";
import { PRService } from "../github/pull-requests";
import type { PRMetadata, CreatePROptions } from "../github/types";
import { TaskModelContext } from "./task-model-context";
import { emitToTask } from "../socket";
import { getTask, toConvexId } from "../lib/convex-operations";

export class PRManager {
  private prService: PRService;

  public static readonly NOOP_ERROR_NO_CHANGES =
    "No commits between base and head branches";

  constructor(
    private gitService: GitService,
    private llmService: LLMService
  ) {
    this.prService = new PRService();
  }

  /**
   * Create or update PR and save snapshot
   */
  async createPRIfNeeded(
    options: CreatePROptions,
    context: TaskModelContext
  ): Promise<{
    success: boolean;
    prNumber?: number;
    error?: string;
    skipped?: boolean;
  }> {
    try {
      console.log(`[PR_MANAGER] Processing PR for task ${options.taskId}`);

      // Check if there are any uncommitted changes
      const hasChanges = await this.gitService.hasChanges();
      if (hasChanges) {
        console.log(
          `[PR_MANAGER] Uncommitted changes found, skipping PR creation`
        );
        return {
          success: false,
          skipped: true,
          error: "Uncommitted changes present; commit before creating a PR.",
        };
      }

      // Get git metadata
      let commitSha = "unknown";
      try {
        commitSha = await this.gitService.getCurrentCommitSha();
      } catch (err) {
        // In some production deployments we may not have a functional git binary inside the
        // server container. Creating the PR via GitHub API can still succeed, so fall back
        // to an opaque commitSha for snapshot bookkeeping.
        console.warn(
          `[PR_MANAGER] Failed to read current commit SHA (continuing):`,
          err
        );
      }

      // Check if PR already exists
      const existingPRNumber = await this.prService.getExistingPRNumber(
        options.taskId
      );

      if (!existingPRNumber) {
        // Create new PR path
        const result = await this.createNewPR(options, commitSha, context);
        if (!result.success) {
          return result;
        }
        return { success: true, prNumber: result.prNumber };
      } else {
        // Update existing PR path
        const result = await this.updateExistingPR(
          options,
          existingPRNumber,
          commitSha,
          context
        );
        if (!result.success) {
          return result;
        }
        return { success: true, prNumber: existingPRNumber };
      }
    } catch (error) {
      console.error(
        `[PR_MANAGER] Failed to create/update PR for task ${options.taskId}:`,
        error
      );

      // Emit failure event
      emitToTask(options.taskId, "auto-pr-status", {
        taskId: options.taskId,
        messageId: options.messageId,
        status: "failed" as const,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create pull request",
      });

      // Don't throw - PR creation is non-blocking
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create pull request",
      };
    }
  }

  /**
   * Create a new PR and save snapshot
   */
  private async createNewPR(
    options: CreatePROptions,
    commitSha: string,
    context: TaskModelContext
  ): Promise<{ success: boolean; prNumber?: number; error?: string }> {
    // Generate PR metadata with AI using mini model for cost optimization
    const metadata = await this.generatePRMetadata(options, context);

    // Use PR service to create the PR
    const result = await this.prService.createPR(options, metadata, commitSha);

    if (!result.success) {
      return { success: false, error: `Failed to create PR: ${result.error}` };
    }
    console.log(
      `[PR_MANAGER] Successfully created PR #${result.prNumber} for task ${options.taskId}`
    );
    await this.emitCompletionEvent(options, result.prNumber);
    return { success: true, prNumber: result.prNumber };
  }

  /**
   * Update existing PR and save snapshot
   */
  private async updateExistingPR(
    options: CreatePROptions,
    prNumber: number,
    commitSha: string,
    context: TaskModelContext
  ): Promise<{ success: boolean; prNumber?: number; error?: string }> {
    // Get current PR description from most recent snapshot
    const latestSnapshot = await this.prService.getLatestSnapshot(
      options.taskId
    );

    if (!latestSnapshot) {
      console.warn(
        `[PR_MANAGER] No previous snapshot found for task ${options.taskId}, creating new description`
      );
    }

    // Generate updated description using AI with mini model
    const newDescription = await this.generateUpdatedDescription(
      latestSnapshot?.description || "",
      await this.gitService.getDiffAgainstBase(options.baseBranch),
      options.taskTitle,
      context
    );

    // Use PR service to update the PR
    const result = await this.prService.updatePR(
      options,
      prNumber,
      newDescription,
      commitSha
    );

    if (!result.success) {
      return { success: false, error: `Failed to update PR: ${result.error}` };
    }
    console.log(
      `[PR_MANAGER] Successfully updated PR #${prNumber} for task ${options.taskId}`
    );
    await this.emitCompletionEvent(options, prNumber);
    return { success: true, prNumber };
  }

  /**
   * Generate PR metadata using LLM based on git changes and task context
   */
  private async generatePRMetadata(
    options: CreatePROptions,
    context: TaskModelContext
  ): Promise<PRMetadata> {
    try {
      const diff = await this.gitService.getDiffAgainstBase(options.baseBranch);
      const commitMessages = await this.gitService.getRecentCommitMessages(
        options.baseBranch
      );

      // Use mini model for PR generation (cost optimization)
      // TODO: Update LLMService to support model selection parameter
      const metadata = await this.llmService.generatePRMetadata(
        {
          taskTitle: options.taskTitle,
          gitDiff: diff,
          commitMessages,
          wasTaskCompleted: options.wasTaskCompleted,
        },
        context.getApiKeys() // Pass full API keys for compatibility
      );

      // Append shadow URL to the description
      const shadowUrl = `https://shadowrealm.ai/tasks/${options.taskId}`;
      metadata.description = `${metadata.description}\n\n---\n\n[Open in Shadow](${shadowUrl})`;

      return metadata;
    } catch (error) {
      console.warn(
        `[PR_MANAGER] Failed to generate PR metadata for task ${options.taskId}:`,
        error
      );

      return {
        title: options.taskTitle,
        description: "Pull request description generation failed.",
        isDraft: true,
      };
    }
  }

  /**
   * Generate updated PR description by merging old description with new changes
   */
  private async generateUpdatedDescription(
    oldDescription: string,
    newDiff: string,
    taskTitle: string,
    context: TaskModelContext
  ): Promise<string> {
    if (!oldDescription) {
      // If no old description, generate fresh one
      return newDiff
        ? `## Changes\n\nUpdated implementation for: **${taskTitle}**\n\n## Recent Updates\n\nSee commit for details.`
        : "Pull request description generation failed.";
    }

    try {
      // Use mini model for PR description updates
      // TODO: Update LLMService to support model selection parameter
      const result = await this.llmService.generatePRMetadata(
        {
          taskTitle,
          gitDiff: newDiff,
          commitMessages: [],
          wasTaskCompleted: true,
        },
        context.getApiKeys()
      );

      return result.description;
    } catch (error) {
      console.warn(
        `[PR_MANAGER] Failed to generate updated description:`,
        error
      );

      // Fallback: append to existing description
      return `${oldDescription}\n\n## Recent Updates\n\n- Additional changes made\n- See latest commit for details`;
    }
  }

  /**
   * Emit completion event with PR snapshot data
   */
  private async emitCompletionEvent(
    options: CreatePROptions,
    prNumber?: number
  ): Promise<void> {
    try {
      // Get the latest snapshot to send to frontend
      const latestSnapshot = await this.prService.getLatestSnapshot(
        options.taskId
      );

      if (!latestSnapshot) {
        console.warn(
          `[PR_MANAGER] No snapshot found for completed PR on task ${options.taskId}`
        );
        return;
      }

      // Get the PR number from task in database (updated during PR creation)
      const task = await getTask(toConvexId<"tasks">(options.taskId));

      const finalPRNumber = prNumber || task?.pullRequestNumber;
      if (!finalPRNumber) {
        console.warn(
          `[PR_MANAGER] No PR number available for task ${options.taskId}`
        );
        return;
      }

      // Construct PR URL
      const repoUrl =
        task?.repoUrl || `https://github.com/${options.repoFullName}`;
      const prUrl = `${repoUrl}/pull/${finalPRNumber}`;

      emitToTask(options.taskId, "auto-pr-status", {
        taskId: options.taskId,
        messageId: options.messageId,
        status: "completed" as const,
        snapshot: {
          title: latestSnapshot.title,
          description: latestSnapshot.description,
          filesChanged: latestSnapshot.filesChanged,
          linesAdded: latestSnapshot.linesAdded,
          linesRemoved: latestSnapshot.linesRemoved,
          commitSha: latestSnapshot.commitSha,
          status: latestSnapshot.status,
        },
        prNumber: finalPRNumber,
        prUrl,
      });
    } catch (error) {
      console.error(
        `[PR_MANAGER] Failed to emit completion event for task ${options.taskId}:`,
        error
      );
    }
  }
}
