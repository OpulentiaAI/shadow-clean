/**
 * Agent Tools for @convex-dev/agent
 *
 * These tools are used by the Shadow Agent for autonomous coding tasks.
 * They use a hybrid approach:
 * - Data tools (todos, memories): Direct Convex DB operations
 * - File/terminal tools: HTTP calls to server tool API
 */
import { tool } from "ai";
import { z } from "zod";
import { ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Server URL for tool API calls
const getServerUrl = () => process.env.SHADOW_SERVER_URL || "http://localhost:4000";
const getToolApiKey = () => process.env.CONVEX_TOOL_API_KEY || "shadow-internal-tool-key";

// Helper to make tool API calls to the server
async function callServerTool<T>(
  taskId: string,
  toolName: string,
  params: Record<string, unknown>
): Promise<T> {
  const serverUrl = getServerUrl();
  const apiKey = getToolApiKey();

  const response = await fetch(`${serverUrl}/api/tools/${taskId}/${toolName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-convex-tool-key": apiKey,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tool API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// Status conversion helper
const TODO_STATUS_MAP = {
  pending: "PENDING",
  in_progress: "IN_PROGRESS",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
} as const;

type TodoStatusKey = keyof typeof TODO_STATUS_MAP;
type ConvexTodoStatus = (typeof TODO_STATUS_MAP)[TodoStatusKey];

function toConvexTodoStatus(status: string): ConvexTodoStatus {
  const key = status as TodoStatusKey;
  return TODO_STATUS_MAP[key] ?? "PENDING";
}

// Tool schemas
const TodoWriteSchema = z.object({
  merge: z
    .boolean()
    .describe("If true, merge with existing todos. If false, replace all."),
  todos: z.array(
    z.object({
      id: z.string().describe("Unique identifier for this todo"),
      content: z.string().describe("Description of the task"),
      status: z
        .enum(["pending", "in_progress", "completed", "cancelled"])
        .describe("Current status of the todo"),
    })
  ),
  explanation: z.string().describe("Brief explanation of why this update is needed"),
});

const AddMemorySchema = z.object({
  content: z.string().describe("Concise memory content to store"),
  category: z
    .enum([
      "INFRA",
      "SETUP",
      "STYLES",
      "ARCHITECTURE",
      "TESTING",
      "PATTERNS",
      "BUGS",
      "PERFORMANCE",
      "CONFIG",
      "GENERAL",
    ])
    .describe("Category for organizing the memory"),
  explanation: z.string().describe("Why this memory is being added"),
});

const ListMemoriesSchema = z.object({
  category: z
    .enum([
      "INFRA",
      "SETUP",
      "STYLES",
      "ARCHITECTURE",
      "TESTING",
      "PATTERNS",
      "BUGS",
      "PERFORMANCE",
      "CONFIG",
      "GENERAL",
    ])
    .optional()
    .describe("Filter by category"),
  explanation: z.string().describe("Why memories are being listed"),
});

const RemoveMemorySchema = z.object({
  memoryId: z.string().describe("ID of the memory to remove"),
  explanation: z.string().describe("Why this memory is being removed"),
});

const ReadFileSchema = z.object({
  target_file: z.string().describe("Path to the file to read"),
  should_read_entire_file: z
    .boolean()
    .optional()
    .describe("If true, read the entire file"),
  start_line_one_indexed: z
    .number()
    .optional()
    .describe("Starting line number (1-indexed)"),
  end_line_one_indexed_inclusive: z
    .number()
    .optional()
    .describe("Ending line number (inclusive)"),
  explanation: z.string().describe("Why this file is being read"),
});

const EditFileSchema = z.object({
  target_file: z.string().describe("Path to the file to edit"),
  instructions: z.string().describe("Description of the changes being made"),
  code_edit: z.string().describe("The new file content or code changes"),
  is_new_file: z.boolean().optional().describe("Set true when creating a new file"),
});

const SearchReplaceSchema = z.object({
  file_path: z.string().describe("Path to the file"),
  old_string: z.string().describe("Exact string to find and replace"),
  new_string: z.string().describe("Replacement string"),
  is_new_file: z.boolean().optional().describe("Set true when creating a new file"),
});

const RunTerminalCmdSchema = z.object({
  command: z.string().describe("The command to execute"),
  is_background: z
    .boolean()
    .optional()
    .describe("Run in background without waiting"),
  explanation: z.string().describe("Why this command is being run"),
});

const ListDirSchema = z.object({
  relative_workspace_path: z
    .string()
    .describe("Path relative to workspace root"),
  explanation: z.string().describe("Why this directory is being listed"),
});

const GrepSearchSchema = z.object({
  query: z.string().describe("Regex pattern to search for"),
  include_pattern: z.string().optional().describe("File glob pattern to include"),
  exclude_pattern: z.string().optional().describe("File glob pattern to exclude"),
  case_sensitive: z.boolean().optional().describe("Case-sensitive search"),
  explanation: z.string().describe("What you're searching for"),
});

const FileSearchSchema = z.object({
  query: z.string().describe("Filename or partial filename to search for"),
  explanation: z.string().describe("Why this file search is needed"),
});

const DeleteFileSchema = z.object({
  target_file: z.string().describe("Path to the file to delete"),
  explanation: z.string().describe("Why this file should be deleted"),
});

const SemanticSearchSchema = z.object({
  query: z.string().describe("Natural language search query"),
  explanation: z.string().describe("What concept you're searching for"),
});

const WarpGrepSchema = z.object({
  query: z.string().describe("Natural language query for code search"),
  explanation: z.string().describe("What code you're looking for"),
});

/**
 * Create agent tools with task context
 * @returns Object containing all agent tools
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createAgentTools(ctx: ActionCtx, taskId: Id<"tasks">) {
  const taskIdStr = taskId as string;

  return {
    // ==================== DATA TOOLS (Direct Convex) ====================

    todo_write: tool({
      description: `Manage your task list by creating, updating, or replacing todos. Use this tool to track your progress on multi-step tasks.

WHEN TO USE:
- Complex multi-step tasks (3+ steps)
- User provides multiple tasks
- Before starting work (set todo to in_progress)
- After completing work (mark todo as completed)

CRITICAL RULES:
- Only ONE todo should be in_progress at a time
- Mark tasks completed IMMEDIATELY after finishing
- Never mark as completed if tests fail or work is incomplete`,
      inputSchema: TodoWriteSchema,
      execute: async ({ merge, todos, explanation }) => {
        console.log(`[TODO_WRITE] ${explanation}`);

        // Load existing todos when merging
        let existingTodos: Awaited<ReturnType<typeof ctx.runQuery<typeof api.todos.byTask>>> = [];
        if (merge) {
          existingTodos = await ctx.runQuery(api.todos.byTask, { taskId });
        } else {
          await ctx.runMutation(api.todos.removeAllByTask, { taskId });
        }

        const results: Array<{
          action: string;
          id: string;
          content: string;
          status: string;
        }> = [];

        for (let i = 0; i < todos.length; i++) {
          const todo = todos[i];
          if (!todo) continue;

          const status = toConvexTodoStatus(todo.status);
          const existing = merge ? existingTodos[i] : undefined;

          if (merge && existing) {
            await ctx.runMutation(api.todos.update, {
              todoId: existing._id,
              content: todo.content,
              status,
              sequence: i,
            });
            results.push({
              action: "updated",
              id: todo.id,
              content: todo.content,
              status: todo.status,
            });
          } else {
            await ctx.runMutation(api.todos.create, {
              taskId,
              content: todo.content,
              status,
              sequence: i,
            });
            results.push({
              action: "created",
              id: todo.id,
              content: todo.content,
              status: todo.status,
            });
          }
        }

        const updatedTodos: Array<{ status: string }> = await ctx.runQuery(api.todos.byTask, { taskId }) as any;
        const totalTodos: number = updatedTodos.length;
        const completedTodos = updatedTodos.filter(
          (t: { status: string }) => t.status === "COMPLETED"
        ).length;

        return {
          success: true,
          message: `${merge ? "Merged" : "Replaced"} todos`,
          todos: results,
          count: results.length,
          totalTodos,
          completedTodos,
        };
      },
    }),

    add_memory: tool({
      description: `Store important information about the repository for future reference. Use this to remember patterns, configurations, architectural decisions, or debugging insights.`,
      inputSchema: AddMemorySchema,
      execute: async ({ content, category, explanation }) => {
        console.log(`[ADD_MEMORY] ${explanation}`);

        const task = await ctx.runQuery(api.tasks.get, { taskId });
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }

        const result = await ctx.runMutation(api.memories.create, {
          content,
          category,
          repoFullName: task.repoFullName,
          repoUrl: task.repoUrl,
          userId: task.userId,
          taskId,
        });

        return {
          success: true,
          memoryId: result.memoryId,
          message: `Added memory: ${content}`,
        };
      },
    }),

    list_memories: tool({
      description: `Retrieve stored memories for the current repository. Use this to recall previous learnings, patterns, or configurations.`,
      inputSchema: ListMemoriesSchema,
      execute: async ({ category, explanation }) => {
        console.log(`[LIST_MEMORIES] ${explanation}`);

        const task = await ctx.runQuery(api.tasks.get, { taskId });
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }

        const memories: Array<{ category: string }> = await ctx.runQuery(api.memories.byUserAndRepo, {
          userId: task.userId,
          repoFullName: task.repoFullName,
        }) as any;

        const filteredMemories = category
          ? memories.filter((m: { category: string }) => m.category === category)
          : memories;

        return {
          success: true,
          memories: filteredMemories,
          count: filteredMemories.length,
        };
      },
    }),

    remove_memory: tool({
      description: `Remove a previously stored memory that is no longer relevant or accurate.`,
      inputSchema: RemoveMemorySchema,
      execute: async ({ memoryId, explanation }) => {
        console.log(`[REMOVE_MEMORY] ${explanation}`);

        const task = await ctx.runQuery(api.tasks.get, { taskId });
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }

        const memory = await ctx.runQuery(api.memories.get, {
          memoryId: memoryId as Id<"memories">,
        });

        if (!memory || memory.userId !== task.userId) {
          return {
            success: false,
            error: "Memory not found or access denied",
          };
        }

        await ctx.runMutation(api.memories.remove, {
          memoryId: memoryId as Id<"memories">,
        });

        return {
          success: true,
          message: `Removed memory: ${memory.content}`,
        };
      },
    }),

    // ==================== FILE TOOLS (Server API) ====================

    read_file: tool({
      description: `Read the contents of a file. Always read files before editing them. Supports reading specific line ranges for large files.`,
      inputSchema: ReadFileSchema,
      execute: async (params: z.infer<typeof ReadFileSchema>) => {
        console.log(`[READ_FILE] ${params.explanation}`);
        return callServerTool(taskIdStr, "read_file", params);
      },
    }),

    edit_file: tool({
      description: `Create or modify a file. For new files, provide the complete content. For existing files, provide instructions and code edits.`,
      inputSchema: EditFileSchema,
      execute: async (params: z.infer<typeof EditFileSchema>) => {
        console.log(`[EDIT_FILE] ${params.instructions}`);
        return callServerTool(taskIdStr, "edit_file", params);
      },
    }),

    search_replace: tool({
      description: `Perform precise string replacement in a file. Use for targeted edits when you know the exact text to replace.`,
      inputSchema: SearchReplaceSchema,
      execute: async (params: z.infer<typeof SearchReplaceSchema>) => {
        console.log(`[SEARCH_REPLACE] Replacing in ${params.file_path}`);
        return callServerTool(taskIdStr, "search_replace", params);
      },
    }),

    run_terminal_cmd: tool({
      description: `Execute a terminal command in the workspace. Use for building, testing, installing dependencies, or running scripts.`,
      inputSchema: RunTerminalCmdSchema,
      execute: async (params: z.infer<typeof RunTerminalCmdSchema>) => {
        console.log(`[TERMINAL_CMD] ${params.explanation}`);
        return callServerTool(taskIdStr, "run_terminal_cmd", params);
      },
    }),

    list_dir: tool({
      description: `List the contents of a directory. Use to explore the file structure and understand project organization.`,
      inputSchema: ListDirSchema,
      execute: async (params: z.infer<typeof ListDirSchema>) => {
        console.log(`[LIST_DIR] ${params.explanation}`);
        return callServerTool(taskIdStr, "list_dir", params);
      },
    }),

    grep_search: tool({
      description: `Search for patterns in files using regex. Use to find code references, function definitions, or specific text patterns.`,
      inputSchema: GrepSearchSchema,
      execute: async (params: z.infer<typeof GrepSearchSchema>) => {
        console.log(`[GREP_SEARCH] ${params.explanation}`);
        return callServerTool(taskIdStr, "grep_search", params);
      },
    }),

    file_search: tool({
      description: `Search for files by name using fuzzy matching. Use to find specific files when you know part of the filename.`,
      inputSchema: FileSearchSchema,
      execute: async (params: z.infer<typeof FileSearchSchema>) => {
        console.log(`[FILE_SEARCH] ${params.explanation}`);
        return callServerTool(taskIdStr, "file_search", params);
      },
    }),

    delete_file: tool({
      description: `Delete a file from the workspace. Use with caution - verify the file should be removed before deleting.`,
      inputSchema: DeleteFileSchema,
      execute: async (params: z.infer<typeof DeleteFileSchema>) => {
        console.log(`[DELETE_FILE] ${params.explanation}`);
        return callServerTool(taskIdStr, "delete_file", params);
      },
    }),

    semantic_search: tool({
      description: `Search the codebase using AI-powered semantic understanding. Use for conceptual searches like "authentication logic" or "error handling".`,
      inputSchema: SemanticSearchSchema,
      execute: async (params: z.infer<typeof SemanticSearchSchema>) => {
        console.log(`[SEMANTIC_SEARCH] ${params.explanation}`);
        return callServerTool(taskIdStr, "semantic_search", params);
      },
    }),

    warp_grep: tool({
      description: `Semantic code search using natural language. Faster alternative to semantic_search for quick code lookups.`,
      inputSchema: WarpGrepSchema,
      execute: async (params: z.infer<typeof WarpGrepSchema>) => {
        console.log(`[WARP_GREP] ${params.explanation}`);
        return callServerTool(taskIdStr, "warp_grep", params);
      },
    }),
  };
}

// Export schemas for external use
export const AgentToolSchemas = {
  TodoWriteSchema,
  AddMemorySchema,
  ListMemoriesSchema,
  RemoveMemorySchema,
  ReadFileSchema,
  EditFileSchema,
  SearchReplaceSchema,
  RunTerminalCmdSchema,
  ListDirSchema,
  GrepSearchSchema,
  FileSearchSchema,
  DeleteFileSchema,
  SemanticSearchSchema,
  WarpGrepSchema,
};
