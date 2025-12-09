import {
  getTask,
  getCodebaseByRepo,
  getCodebaseByTaskId,
  createCodebaseUnderstanding,
  updateTask,
  toConvexId,
} from "@/lib/convex-operations";

export class CodebaseUnderstandingStorage {
  private taskId: string;

  constructor(taskId: string) {
    this.taskId = taskId;
  }

  async storeSummary(
    repoFullName: string,
    repoUrl: string,
    summaryContent: any,
    userId: string
  ): Promise<string> {
    try {
      // Check if task already has a codebase understanding
      const task = await getTask(toConvexId<"tasks">(this.taskId));

      if (!task) {
        throw new Error(`Task ${this.taskId} not found`);
      }

      let codebaseUnderstanding;

      if (task.codebaseUnderstandingId) {
        // Update existing
        await createCodebaseUnderstanding({
          repoFullName,
          repoUrl,
          content: summaryContent,
          userId: toConvexId<"users">(userId),
        });
        codebaseUnderstanding = await getCodebaseByTaskId(
          toConvexId<"tasks">(this.taskId)
        );
      } else {
        // Check if a CodebaseUnderstanding already exists for this repo
        const existing = await getCodebaseByRepo(repoFullName);

        if (existing) {
          // Just use the existing record - no need to update content
          codebaseUnderstanding = existing;
        } else {
          // Create new
          await createCodebaseUnderstanding({
            repoFullName,
            repoUrl,
            content: summaryContent,
            userId: toConvexId<"users">(userId),
          });
          codebaseUnderstanding = await getCodebaseByRepo(repoFullName);
          if (!codebaseUnderstanding) {
            codebaseUnderstanding = await getCodebaseByTaskId(
              toConvexId<"tasks">(this.taskId)
            );
          }
        }

        // Link to task
        if (codebaseUnderstanding?._id) {
          await updateTask({
            taskId: toConvexId<"tasks">(this.taskId),
            codebaseUnderstandingId: codebaseUnderstanding._id,
          });
        }
      }

      console.log(`💾 Stored summary for task: ${this.taskId}`);
      return (codebaseUnderstanding?._id || codebaseUnderstanding || "") as string;
    } catch (error) {
      console.error(`Failed to store summary for task ${this.taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get summary for a task
   */
  async getSummary(): Promise<any | null> {
    try {
      const codebase = await getCodebaseByTaskId(
        toConvexId<"tasks">(this.taskId)
      );

      if (!codebase) {
        return null;
      }

      return {
        id: codebase._id as string,
        repoFullName: codebase.repoFullName,
        repoUrl: codebase.repoUrl,
        content: codebase.content,
        createdAt: codebase.createdAt,
        updatedAt: codebase.updatedAt,
      };
    } catch (error) {
      console.error(`Failed to get summary for task ${this.taskId}:`, error);
      return null;
    }
  }

  /**
   * Check if summary exists for this task
   */
  async hasExistingSummary(): Promise<boolean> {
    try {
      const task = await getTask(toConvexId<"tasks">(this.taskId));
      return !!task?.codebaseUnderstandingId;
    } catch (error) {
      console.error(
        `Failed to check existing summary for task ${this.taskId}:`,
        error
      );
      return false;
    }
  }
}
