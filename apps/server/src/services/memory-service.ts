import { getTask, listMemoriesByUserRepo, toConvexId } from "../lib/convex-operations";

export interface MemoryContext {
  memories: Array<{
    id: string;
    content: string;
    category: string;
    createdAt: Date;
  }>;
}

export class MemoryService {
  /**
   * Get repository-specific memories for a task context
   */
  async getMemoriesForTask(taskId: string): Promise<MemoryContext | null> {
    try {
      // Get task info
      const task = await getTask(toConvexId<"tasks">(taskId));

      if (!task) {
        console.warn(`[MEMORY_SERVICE] Task ${taskId} not found`);
        return null;
      }

      // Get repository-specific memories from Convex
      const memories = await listMemoriesByUserRepo(
        task.userId,
        task.repoFullName
      );

      return {
        memories: memories.map((m) => ({
          id: m._id as string,
          content: m.content,
          category: m.category,
          createdAt: new Date(m.createdAt),
        })),
      };
    } catch (error) {
      console.error(
        `[MEMORY_SERVICE] Error fetching memories for task ${taskId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Format memories into a string for system prompt inclusion
   */
  formatMemoriesForPrompt(memoryContext: MemoryContext): string {
    if (!memoryContext || memoryContext.memories.length === 0) {
      return "";
    }

    let formatted = `\n\n## REPOSITORY MEMORIES\nRelevant context from previous work:\n`;
    for (const m of memoryContext.memories) {
      formatted += `- [${m.category}] ${m.content}\n`;
    }
    formatted += `\nUse these memories to maintain consistency.`;
    return formatted;
  }

  /**
   * Create a system prompt with memory context included
   */
  async createSystemPromptWithMemories(
    basePrompt: string,
    taskId: string
  ): Promise<string> {
    const memoryContext = await this.getMemoriesForTask(taskId);
    if (!memoryContext) {
      return basePrompt;
    }
    return basePrompt + this.formatMemoriesForPrompt(memoryContext);
  }
}

export const memoryService = new MemoryService();
