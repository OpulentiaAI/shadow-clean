import { readFileSync } from "fs";
import { join, dirname } from "path";
import { z } from "zod";
import { tool } from "ai";
import {
  TodoWriteParamsSchema,
  ReadFileParamsSchema,
  EditFileParamsSchema,
  SearchReplaceParamsSchema,
  RunTerminalCmdParamsSchema,
  ListDirParamsSchema,
  GrepSearchParamsSchema,
  FileSearchParamsSchema,
  DeleteFileParamsSchema,
  SemanticSearchParamsSchema,
  WarpGrepParamsSchema,
  WebReadUrlParamsSchema,
  WebGetMarkdownParamsSchema,
  WebExtractLinksParamsSchema,
} from "@repo/types";
import {
  webReadUrl,
  webGetMarkdown,
  webExtractLinks,
} from "../../services/deepcrawl-service";
import { createToolExecutor, isLocalMode } from "../../execution";
import { LocalFileSystemWatcher } from "../../services/local-filesystem-watcher";
import { emitTerminalOutput, emitStreamChunk, emitToolCallUpdate } from "../../socket";
import { isIndexingComplete } from "../../initialization/background-indexing";
import type { TerminalEntry } from "@repo/types";
import { MCPManager } from "../mcp/mcp-manager";
import {
  transformMCPToolName,
  type MCPToolMeta,
  type MCPToolWrapper,
} from "@repo/types";
import {
  getTask,
  listTodosByTask,
  createTodo,
  updateTodo,
  deleteTodosByTask,
  createMemory,
  listMemoriesByUserRepo,
  deleteMemory,
  getMemory,
  toConvexId,
  logToolCallRequest,
  markToolCallRunning,
  logToolCallResult,
} from "../../lib/convex-operations";
import type { Id } from "../../../../../convex/_generated/dataModel";

const MAX_CONTEXT7_TOKENS = 4000;

// Map to track active filesystem watchers by task ID
const activeFileSystemWatchers = new Map<string, LocalFileSystemWatcher>();

// Map to track MCP managers by task ID
const activeMCPManagers = new Map<string, MCPManager>();

// MCP tool name processing is now handled by shared utilities in @repo/types

/**
 * Create a type-safe MCP tool wrapper for AI SDK compatibility
 * Now includes tool call logging to Convex toolCalls table
 */
function createMCPToolWrapper(
  originalName: string,
  mcpTool: {
    execute: (params: Record<string, unknown>) => Promise<unknown>;
    description: string;
    parameters: unknown;
  },
  taskId: string
): MCPToolWrapper {
  const transformedName = transformMCPToolName(originalName);
  const [serverName, toolName] = originalName.includes(":")
    ? originalName.split(":")
    : [
        originalName.split("_")[0] || "unknown",
        originalName.split("_").slice(1).join("_") || "tool",
      ];

  const meta: MCPToolMeta = {
    originalName,
    transformedName,
    serverName: serverName || "unknown",
    toolName: toolName || "tool",
  };

  return {
    ...mcpTool,
    execute: async (params: Record<string, unknown>, metadata?: unknown) => {
      console.log(
        `[MCP_TOOL] Executing ${originalName} (transformed from ${transformedName})`
      );

      const modifiedParams = { ...params };
      if (originalName.startsWith("context7:") && "tokens" in params) {
        const originalTokens = params.tokens;
        const maxTokens = MAX_CONTEXT7_TOKENS;

        if (typeof originalTokens === "number" && originalTokens > maxTokens) {
          modifiedParams.tokens = maxTokens;
          console.log(
            `[MCP_TOOL] Limited Context7 tokens: ${originalTokens} → ${maxTokens}`
          );
        }
      }

      // Wrap MCP tool execution with Convex tool logging
      return withToolLogging(
        taskId,
        `mcp:${originalName}`, // Prefix with mcp: to distinguish from native tools
        modifiedParams,
        metadata,
        async () => {
          try {
            return await mcpTool.execute(modifiedParams);
          } catch (error) {
            console.error(`[MCP_TOOL] Error executing ${originalName}:`, error);
            throw error;
          }
        }
      );
    },
    meta,
  };
}

/**
 * Get the active filesystem watcher for a task (local mode only)
 */
export function getFileSystemWatcher(
  taskId: string
): LocalFileSystemWatcher | null {
  return activeFileSystemWatchers.get(taskId) || null;
}

/**
 * Get the active MCP manager for a task
 */
export function getMCPManager(taskId: string): MCPManager | null {
  return activeMCPManagers.get(taskId) || null;
}

// Terminal entry counters for unique IDs per task
const taskTerminalCounters = new Map<string, number>();

// Helper function to get next terminal entry ID for a task
function getNextTerminalEntryId(taskId: string): number {
  const currentId = taskTerminalCounters.get(taskId) || 0;
  const nextId = currentId + 1;
  taskTerminalCounters.set(taskId, nextId);
  return nextId;
}

// Helper function to create and emit terminal entries
function createAndEmitTerminalEntry(
  taskId: string,
  type: TerminalEntry["type"],
  data: string,
  processId?: number
): void {
  const entry: TerminalEntry = {
    id: getNextTerminalEntryId(taskId),
    timestamp: Date.now(),
    data,
    type,
    processId,
  };

  console.log(
    `[TERMINAL_OUTPUT] Emitting ${type} for task ${taskId}:`,
    data.slice(0, 100)
  );
  emitTerminalOutput(taskId, entry);
}

// Helper function to read tool descriptions from markdown files
function readDescription(toolName: string): string {
  const descriptionPath = join(
    dirname(__filename),
    "prompts",
    toolName,
    "description.md"
  );
  return readFileSync(descriptionPath, "utf-8").trim();
}

const TODO_STATUS_MAP = {
  pending: "PENDING",
  in_progress: "IN_PROGRESS",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
} as const;

type TodoStatusKey = keyof typeof TODO_STATUS_MAP;
type ConvexTodoStatus = (typeof TODO_STATUS_MAP)[TodoStatusKey];

type MemoryCategoryValue =
  | "INFRA"
  | "SETUP"
  | "STYLES"
  | "ARCHITECTURE"
  | "TESTING"
  | "PATTERNS"
  | "BUGS"
  | "PERFORMANCE"
  | "CONFIG"
  | "GENERAL";

function toConvexTodoStatus(status: string): ConvexTodoStatus {
  const key = status as TodoStatusKey;
  return TODO_STATUS_MAP[key] ?? "PENDING";
}

function getMessageId(metadata: unknown): string | undefined {
  if (
    metadata &&
    typeof metadata === "object" &&
    "messageId" in metadata &&
    typeof (metadata as { messageId?: unknown }).messageId === "string"
  ) {
    const id = (metadata as { messageId: string }).messageId;
    // Return undefined for invalid IDs to skip messageId association
    if (id && id !== "unknown-message" && id.length > 0) {
      return id;
    }
  }
  return undefined;
}

async function startToolLogging({
  taskId,
  toolName,
  args,
  metadata,
}: {
  taskId: string;
  toolName: string;
  args: unknown;
  metadata: unknown;
}) {
  const messageId = getMessageId(metadata);
  const toolCallExternalId = `${taskId}-${toolName}-${Date.now()}`;
  const argsJson = JSON.stringify(args);
  const startedAt = Date.now();

  const request = await logToolCallRequest({
    taskId: toConvexId<"tasks">(taskId),
    // Only pass messageId if it's a valid Convex ID
    ...(messageId ? { messageId: toConvexId<"chatMessages">(messageId) } : {}),
    toolCallId: toolCallExternalId,
    toolName,
    argsJson,
  });
  await markToolCallRunning(request.toolCallId);

  // Emit tool-call-update event for RUNNING status
  emitToolCallUpdate(taskId, {
    taskId,
    toolCallId: request.toolCallId as string,
    toolName,
    status: "RUNNING",
    argsJson,
    startedAt,
  });

  return {
    messageId,
    toolCallId: request.toolCallId,
    externalId: toolCallExternalId,
  };
}

async function finishToolLogging(params: {
  taskId: string;
  toolCallId: ReturnType<typeof toConvexId<"toolCalls">>;
  toolName: string;
  status: "SUCCEEDED" | "FAILED";
  result?: unknown;
  error?: string;
}) {
  const { taskId, toolCallId, toolName, status, result, error } = params;
  const resultJson = result !== undefined ? JSON.stringify(result) : undefined;
  const completedAt = Date.now();

  await logToolCallResult({
    toolCallId,
    status,
    resultJson,
    error,
  });

  // Emit dedicated tool-call-update event
  emitToolCallUpdate(taskId, {
    taskId,
    toolCallId: toolCallId as string,
    toolName,
    status,
    resultJson,
    error,
    completedAt,
  });

  // Also emit via stream-chunk for backwards compatibility
  emitStreamChunk(
    {
      type: "tool-call-update",
      toolCallUpdate: {
        toolCallId: toolCallId as string,
        status,
        result,
        error,
      },
    },
    taskId
  );
}

async function withToolLogging<T>(
  taskId: string,
  toolName: string,
  args: unknown,
  metadata: unknown,
  fn: () => Promise<T>
): Promise<T> {
  const logging = await startToolLogging({
    taskId,
    toolName,
    args,
    metadata,
  });
  try {
    const result = await fn();
    await finishToolLogging({
      taskId,
      toolCallId: logging.toolCallId,
      toolName,
      status: "SUCCEEDED",
      result,
    });
    return result;
  } catch (error) {
    await finishToolLogging({
      taskId,
      toolCallId: logging.toolCallId,
      toolName,
      status: "FAILED",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

// Factory function to create tools with task context using abstraction layer
export async function createTools(taskId: string, workspacePath?: string) {
  console.log(
    `[TOOLS] Creating tools for task ${taskId} with workspace: ${workspacePath || "default"}${workspacePath ? " (task-specific)" : " (fallback)"}`
  );

  // Create tool executor through abstraction layer
  // The factory function is now smart enough to handle mode detection internally:
  // - Local mode: uses workspacePath for filesystem operations
  // - Remote mode: uses dynamic pod discovery to find actual running VMs
  const executor = await createToolExecutor(taskId, workspacePath);

  // Initialize MCP manager if enabled
  let mcpManager: MCPManager | undefined;
  try {
    // Check if we already have an MCP manager for this task
    if (!activeMCPManagers.has(taskId)) {
      console.log(`[TOOLS] Initializing MCP manager for task ${taskId}`);
      mcpManager = new MCPManager();
      await mcpManager.initializeConnections();
      activeMCPManagers.set(taskId, mcpManager);
      console.log(`[TOOLS] MCP manager initialized for task ${taskId}`);
    } else {
      mcpManager = activeMCPManagers.get(taskId);
      console.log(`[TOOLS] Reusing existing MCP manager for task ${taskId}`);
    }
  } catch (error) {
    console.error(
      `[TOOLS] Failed to initialize MCP manager for task ${taskId}:`,
      error
    );
  }

  // Initialize filesystem watcher for local mode
  if (isLocalMode() && workspacePath) {
    // Check if we already have a watcher for this task
    if (!activeFileSystemWatchers.has(taskId)) {
      try {
        const watcher = new LocalFileSystemWatcher(taskId);
        watcher.startWatching(workspacePath);
        activeFileSystemWatchers.set(taskId, watcher);
        console.log(
          `[TOOLS] Started local filesystem watcher for task ${taskId}`
        );
      } catch (error) {
        console.error(
          `[TOOLS] Failed to start filesystem watcher for task ${taskId}:`,
          error
        );
      }
    }
  }

  // Check if semantic search should be available
  let includeSemanticSearch = false;
  try {
    const task = await getTask(toConvexId<"tasks">(taskId));

    if (task) {
      const repoMatch = task.repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
      const repo = repoMatch ? repoMatch[1] : null;
      if (repo) {
        includeSemanticSearch = await isIndexingComplete(repo);
        console.log(
          `[TOOLS] Semantic search ${includeSemanticSearch ? "enabled" : "disabled"} for repo ${repo} (indexing ${includeSemanticSearch ? "complete" : "incomplete"})`
        );
      }
    }
  } catch (error) {
    console.error(
      `[TOOLS] Failed to check indexing status for task ${taskId}:`,
      error
    );
  }

  const baseTools = {
    todo_write: tool({
      description: readDescription("todo_write"),
      inputSchema: TodoWriteParamsSchema,
      execute: async ({ merge, todos, explanation }, metadata) => {
        console.log(`[TODO_WRITE] ${explanation}`);
        return withToolLogging(
          taskId,
          "todo_write",
          { merge, todos },
          metadata,
          async () => {
            const convexTaskId = toConvexId<"tasks">(taskId);

            // Load existing todos when merging; otherwise start from scratch
            let existingTodos = merge
              ? await listTodosByTask(convexTaskId)
              : [];

            if (!merge) {
              await deleteTodosByTask(convexTaskId);
              existingTodos = [];
            }

            // Process todos in order
            const results: Array<{
              action: string;
              id: string;
              content: string;
              status: string;
            }> = [];

            for (let i = 0; i < todos.length; i++) {
              const todo = todos[i];
              if (!todo) continue; // Skip undefined items

              const status = toConvexTodoStatus(todo.status);
              const existing = merge ? existingTodos[i] : undefined;

              if (merge && existing) {
                await updateTodo({
                  todoId: existing._id as Id<"todos">,
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
                await createTodo({
                  taskId: convexTaskId,
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

            const updatedTodos = await listTodosByTask(convexTaskId);
            const totalTodos = updatedTodos.length;
            const completedTodos = updatedTodos.filter(
              (t) => t.status === "COMPLETED"
            ).length;

            const summary = `${merge ? "Merged" : "Replaced"} todos: ${results
              .map((r) => `${r.action} "${r.content}" (${r.status})`)
              .join(", ")}`;

            // Emit WebSocket event for real-time todo updates
            emitStreamChunk(
              {
                type: "todo-update",
                todoUpdate: {
                  todos: todos.map((todo, index: number) => ({
                    id: todo.id,
                    content: todo.content,
                    status: todo.status as
                      | "pending"
                      | "in_progress"
                      | "completed"
                      | "cancelled",
                    sequence: index,
                  })),
                  action: merge ? "updated" : "replaced",
                  totalTodos,
                  completedTodos,
                },
              },
              taskId
            );

            return {
              success: true,
              message: summary,
              todos: results,
              count: results.length,
              totalTodos,
              completedTodos,
            };
          }
        );
      },
    }),

    read_file: tool({
      description: readDescription("read_file"),
      inputSchema: ReadFileParamsSchema,
      execute: async (
        {
          target_file,
          should_read_entire_file,
          start_line_one_indexed,
          end_line_one_indexed_inclusive,
          explanation,
        },
        metadata
      ) => {
        console.log(`[READ_FILE] ${explanation}`);
        return withToolLogging(
          taskId,
          "read_file",
          {
            target_file,
            should_read_entire_file,
            start_line_one_indexed,
            end_line_one_indexed_inclusive,
          },
          metadata,
          async () =>
            executor.readFile(target_file, {
              shouldReadEntireFile: should_read_entire_file,
              startLineOneIndexed: start_line_one_indexed,
              endLineOneIndexedInclusive: end_line_one_indexed_inclusive,
            })
        ).catch((error) => {
          console.error(`[READ_FILE_ERROR]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Failed to read file",
          };
        });
      },
    }),

    run_terminal_cmd: tool({
      description: readDescription("run_terminal_cmd"),
      inputSchema: RunTerminalCmdParamsSchema,
      execute: async ({ command, is_background, explanation }, metadata) => {
        console.log(`[TERMINAL_CMD] ${explanation}`);

        return withToolLogging(
          taskId,
          "run_terminal_cmd",
          { command, is_background },
          metadata,
          async () => {
            // Emit the command being executed to the terminal
            createAndEmitTerminalEntry(taskId, "command", command);

            const result = await executor.executeCommand(command, {
              isBackground: is_background,
            });

            // Emit stdout output if present
            if (result.success && result.stdout) {
              createAndEmitTerminalEntry(taskId, "stdout", result.stdout);
            }

            // Emit stderr output if present
            if (result.stderr) {
              createAndEmitTerminalEntry(taskId, "stderr", result.stderr);
            }

            return result;
          }
        ).catch((error) => {
          console.error(`[TERMINAL_CMD_ERROR]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Failed to execute terminal command",
          };
        });
      },
    }),

    list_dir: tool({
      description: readDescription("list_dir"),
      inputSchema: ListDirParamsSchema,
      execute: async ({ relative_workspace_path, explanation }, metadata) => {
        console.log(`[LIST_DIR] ${explanation}`);
        try {
          return await withToolLogging(
            taskId,
            "list_dir",
            { relative_workspace_path },
            metadata,
            async () => executor.listDirectory(relative_workspace_path)
          );
        } catch (error) {
          console.error(`[LIST_DIR_ERROR]`, error);
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          const isENOENT = errorMsg.includes("ENOENT") || errorMsg.includes("no such file");
          const guidance = isENOENT
            ? "The directory does not exist. Try listing the root directory with '.' first, or use a different path. If the workspace is not initialized, wait for initialization to complete."
            : "Try an alternative approach: use grep_search or semantic_search to find files, or try listing a parent directory.";
          return {
            success: false,
            error: errorMsg,
            message: `Failed to list directory: ${relative_workspace_path}. ${guidance}`,
          };
        }
      },
    }),

    grep_search: tool({
      description: readDescription("grep_search"),
      inputSchema: GrepSearchParamsSchema,
      execute: async ({
        query,
        include_pattern,
        exclude_pattern,
        case_sensitive = false,
        explanation,
      },
      metadata
    ) => {
        console.log(`[GREP_SEARCH] ${explanation}`);
        try {
          return await withToolLogging(
            taskId,
            "grep_search",
            { query, include_pattern, exclude_pattern, case_sensitive },
            metadata,
            async () =>
              executor.grepSearch(query, {
                includePattern: include_pattern,
                excludePattern: exclude_pattern,
                caseSensitive: case_sensitive,
              })
          );
        } catch (error) {
          console.error(`[GREP_SEARCH_ERROR]`, error);
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          return {
            success: false,
            error: errorMsg,
            message: `Failed to search for "${query}". Try semantic_search or warp_grep as alternatives, or verify the workspace is initialized.`,
          };
        }
      },
    }),

    edit_file: tool({
      description: readDescription("edit_file"),
      inputSchema: EditFileParamsSchema,
      execute: async (
        { target_file, instructions, code_edit, is_new_file },
        metadata
      ) => {
        console.log(`[EDIT_FILE] ${instructions}`);
        return withToolLogging(
          taskId,
          "edit_file",
          { target_file, instructions, code_edit, is_new_file },
          metadata,
          async () =>
            executor.writeFile(
              target_file,
              code_edit,
              instructions,
              is_new_file
            )
        ).catch((error) => {
          console.error(`[EDIT_FILE_ERROR]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Failed to edit file",
          };
        });
      },
    }),

    search_replace: tool({
      description: readDescription("search_replace"),
      inputSchema: SearchReplaceParamsSchema,
      execute: async (
        { file_path, old_string, new_string, is_new_file },
        metadata
      ) => {
        console.log(`[SEARCH_REPLACE] Replacing text in ${file_path}`);
        return withToolLogging(
          taskId,
          "search_replace",
          { file_path, old_string, new_string, is_new_file },
          metadata,
          async () =>
            executor.searchReplace(file_path, old_string, new_string, is_new_file)
        ).catch((error) => {
          console.error(`[SEARCH_REPLACE_ERROR]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Failed to search/replace",
          };
        });
      },
    }),

    file_search: tool({
      description: readDescription("file_search"),
      inputSchema: FileSearchParamsSchema,
      execute: async ({ query, explanation }, metadata) => {
        console.log(`[FILE_SEARCH] ${explanation}`);
        return withToolLogging(
          taskId,
          "file_search",
          { query },
          metadata,
          async () => executor.searchFiles(query)
        ).catch((error) => {
          console.error(`[FILE_SEARCH_ERROR]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Failed to search files",
          };
        });
      },
    }),

    delete_file: tool({
      description: readDescription("delete_file"),
      inputSchema: DeleteFileParamsSchema,
      execute: async ({ target_file, explanation }, metadata) => {
        console.log(`[DELETE_FILE] ${explanation}`);
        return withToolLogging(
          taskId,
          "delete_file",
          { target_file },
          metadata,
          async () => executor.deleteFile(target_file)
        ).catch((error) => {
          console.error(`[DELETE_FILE_ERROR]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Failed to delete file",
          };
        });
      },
    }),

    add_memory: tool({
      description: readDescription("add_memory"),
      inputSchema: z.object({
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
        explanation: z
          .string()
          .describe(
            "One sentence explanation for why this memory is being added"
          ),
      }),
      execute: async ({ content, category, explanation }, metadata) => {
        console.log(`[ADD_MEMORY] ${explanation}`);
        return withToolLogging(
          taskId,
          "add_memory",
          { content, category },
          metadata,
          async () => {
            // Get task info for repository context
            const task = await getTask(toConvexId<"tasks">(taskId));

            if (!task) {
              throw new Error(`Task ${taskId} not found`);
            }

            // Create repository-specific memory
            const result = await createMemory({
              content,
              category: category as MemoryCategoryValue,
              repoFullName: task.repoFullName,
              repoUrl: task.repoUrl,
              userId: task.userId,
              taskId: toConvexId<"tasks">(taskId),
            });
            const memoryDoc = await getMemory(result.memoryId as Id<"memories">);

            return {
              success: true,
              memory: {
                id: (memoryDoc?._id || result.memoryId) as string,
                content: memoryDoc?.content ?? content,
                category: (memoryDoc?.category ??
                  (category as MemoryCategoryValue)) as MemoryCategoryValue,
                repoFullName: memoryDoc?.repoFullName ?? task.repoFullName,
                createdAt: memoryDoc?.createdAt ?? Date.now(),
              },
              message: `Added repository memory: ${content}`,
            };
          }
        ).catch((error) => {
          console.error(`[ADD_MEMORY_ERROR]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Failed to add memory",
          };
        });
      },
    }),

    list_memories: tool({
      description: readDescription("list_memories"),
      inputSchema: z.object({
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
          .describe("Optional category filter"),
        explanation: z
          .string()
          .describe(
            "One sentence explanation for why memories are being listed"
          ),
      }),
      execute: async ({ category, explanation }, metadata) => {
        console.log(`[LIST_MEMORIES] ${explanation}`);
        return withToolLogging(
          taskId,
          "list_memories",
          { category },
          metadata,
          async () => {
            // Get task info
            const task = await getTask(toConvexId<"tasks">(taskId));

            if (!task) {
              throw new Error(`Task ${taskId} not found`);
            }

            const memories = await listMemoriesByUserRepo(
              task.userId,
              task.repoFullName
            );

            const filteredMemories = category
              ? memories.filter(
                  (memory) =>
                    memory.category === (category as MemoryCategoryValue)
                )
              : memories;

            // Group by category for better organization
            const memoriesByCategory = filteredMemories.reduce(
              (acc, memory) => {
                if (!acc[memory.category]) {
                  acc[memory.category] = [];
                }
                acc[memory.category]!.push(memory);
                return acc;
              },
              {} as Record<string, typeof memories>
            );

            return {
              success: true,
              memories: filteredMemories,
              memoriesByCategory,
              totalCount: filteredMemories.length,
              message: `Found ${filteredMemories.length} memories`,
            };
          }
        ).catch((error) => {
          console.error(`[LIST_MEMORIES_ERROR]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Failed to list memories",
          };
        });
      },
    }),

    remove_memory: tool({
      description: readDescription("remove_memory"),
      inputSchema: z.object({
        memoryId: z.string().describe("ID of the memory to remove"),
        explanation: z
          .string()
          .describe(
            "One sentence explanation for why this memory is being removed"
          ),
      }),
      execute: async ({ memoryId, explanation }, metadata) => {
        console.log(`[REMOVE_MEMORY] ${explanation}`);
        return withToolLogging(
          taskId,
          "remove_memory",
          { memoryId },
          metadata,
          async () => {
            // Get task info
            const task = await getTask(toConvexId<"tasks">(taskId));

            if (!task) {
              throw new Error(`Task ${taskId} not found`);
            }

            // Get memory to verify ownership
            const memory = await getMemory(toConvexId<"memories">(memoryId));

            if (!memory || memory.userId !== task.userId) {
              return {
                success: false,
                error: "Memory not found or access denied",
                message:
                  "Cannot remove memory that doesn't exist or belong to you",
              };
            }

            // Delete the memory
            await deleteMemory(memory._id as Id<"memories">);

            return {
              success: true,
              removedMemory: {
                id: memory._id as string,
                content: memory.content,
                category: memory.category,
              },
              message: `Removed memory: ${memory.content}`,
            };
          }
        ).catch((error) => {
          console.error(`[REMOVE_MEMORY_ERROR]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Failed to remove memory",
          };
        });
      },
    }),

    warp_grep: tool({
      description: readDescription("warp_grep"),
      inputSchema: WarpGrepParamsSchema,
      execute: async ({ query, explanation }, metadata) => {
        console.log(`[WARP_GREP] ${explanation}`);
        return withToolLogging(
          taskId,
          "warp_grep",
          { query },
          metadata,
          async () => executor.warpGrep(query)
        ).catch((error) => {
          console.error(`[WARP_GREP_ERROR]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Failed to execute warp_grep",
          };
        });
      },
    }),

    web_read_url: tool({
      description: readDescription("web_read_url"),
      inputSchema: WebReadUrlParamsSchema,
      execute: async (
        { url, include_markdown, include_metadata, include_cleaned_html, explanation },
        metadata
      ) => {
        console.log(`[WEB_READ_URL] ${explanation}`);
        return withToolLogging(
          taskId,
          "web_read_url",
          { url, include_markdown, include_metadata, include_cleaned_html },
          metadata,
          async () =>
            webReadUrl({
              url,
              includeMarkdown: include_markdown,
              includeMetadata: include_metadata,
              includeCleanedHtml: include_cleaned_html,
            })
        ).catch((error) => {
          console.error(`[WEB_READ_URL_ERROR]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Failed to read URL",
            url,
          };
        });
      },
    }),

    web_get_markdown: tool({
      description: readDescription("web_get_markdown"),
      inputSchema: WebGetMarkdownParamsSchema,
      execute: async ({ url, explanation }, metadata) => {
        console.log(`[WEB_GET_MARKDOWN] ${explanation}`);
        return withToolLogging(
          taskId,
          "web_get_markdown",
          { url },
          metadata,
          async () => webGetMarkdown({ url })
        ).catch((error) => {
          console.error(`[WEB_GET_MARKDOWN_ERROR]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Failed to get markdown",
            url,
            markdown: "",
          };
        });
      },
    }),

    web_extract_links: tool({
      description: readDescription("web_extract_links"),
      inputSchema: WebExtractLinksParamsSchema,
      execute: async ({ url, include_tree, include_external, explanation }, metadata) => {
        console.log(`[WEB_EXTRACT_LINKS] ${explanation}`);
        return withToolLogging(
          taskId,
          "web_extract_links",
          { url, include_tree, include_external },
          metadata,
          async () =>
            webExtractLinks({
              url,
              includeTree: include_tree,
              includeExternal: include_external,
            })
        ).catch((error) => {
          console.error(`[WEB_EXTRACT_LINKS_ERROR]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "Failed to extract links",
            url,
          };
        });
      },
    }),
  };

  // Get MCP tools if manager is available
  const mcpTools: Record<string, MCPToolWrapper> = {};
  if (mcpManager) {
    try {
      const rawMCPTools = await mcpManager.getAvailableTools();
      console.log(
        `[TOOLS] Retrieved ${Object.keys(rawMCPTools).length} raw MCP tools for task ${taskId}`
      );

      for (const [originalName, mcpTool] of Object.entries(rawMCPTools)) {
        const transformedName = transformMCPToolName(originalName);

        console.log(`[MCP_TRANSFORM] ${originalName} → ${transformedName}`);

        const wrappedTool = createMCPToolWrapper(
          originalName,
          mcpTool as unknown as {
            execute: (params: Record<string, unknown>) => Promise<unknown>;
            description: string;
            parameters: unknown;
          },
          taskId
        );

        mcpTools[transformedName] = wrappedTool;
      }

      console.log(
        `✅ [MCP_SUCCESS] Registered ${Object.keys(mcpTools).length} MCP tools:`,
        Object.keys(mcpTools)
      );
    } catch (error) {
      console.error(
        `[TOOLS] Failed to get MCP tools for task ${taskId}:`,
        error
      );
    }
  }

  // Conditionally add semantic search tool if indexing is complete
  if (includeSemanticSearch) {
    return {
      ...baseTools,
      semantic_search: tool({
        description: readDescription("semantic_search"),
        inputSchema: SemanticSearchParamsSchema,
        execute: async ({ query, explanation }, metadata) => {
          console.log(`[SEMANTIC_SEARCH] ${explanation}`);

          try {
            return await withToolLogging(
              taskId,
              "semantic_search",
              { query },
              metadata,
              async () => {
                const task = await getTask(toConvexId<"tasks">(taskId));

                if (!task) {
                  throw new Error(`Task ${taskId} not found`);
                }

                // eslint-disable-next-line no-useless-escape
                const repoMatch = task.repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
                const repo = repoMatch ? repoMatch[1] : task.repoUrl;
                if (!repo) {
                  console.warn(
                    `[SEMANTIC_SEARCH] No repo found for task ${taskId}, falling back to grep_search`
                  );
                  const grepResult = await executor.grepSearch(query);

                  // Convert GrepResult to SemanticSearchToolResult format
                  const results =
                    grepResult.detailedMatches?.map((match, i) => ({
                      id: i + 1,
                      content: match.content,
                      relevance: 0.8,
                      filePath: match.file,
                      lineStart: match.lineNumber,
                      lineEnd: match.lineNumber,
                      language: "",
                      kind: "",
                    })) ||
                    (grepResult.matches || []).map((match, i) => ({
                      id: i + 1,
                      content: match,
                      relevance: 0.8,
                      filePath: "",
                      lineStart: 0,
                      lineEnd: 0,
                      language: "",
                      kind: "",
                    }));

                  return {
                    success: grepResult.success,
                    results,
                    query: query,
                    searchTerms: query
                      .split(/\s+/)
                      .filter((term) => term.length > 0),
                    message:
                      (grepResult.message || "Failed to search") +
                      " (fallback to grep)",
                    error: grepResult.error,
                  };
                } else {
                  console.log(`[SEMANTIC_SEARCH] Using repo: ${repo}`);
                  const result = await executor.semanticSearch(query, repo);
                  return result;
                }
              }
            );
          } catch (error) {
            console.error(`[SEMANTIC_SEARCH_ERROR]`, error);
            return {
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
              results: [],
              message: "Failed to perform semantic search",
            };
          }
        },
      }),
      ...mcpTools, // Add MCP tools to the toolset
    };
  }

  return {
    ...baseTools,
    ...mcpTools, // Add MCP tools to the toolset
  };
}

/**
 * Stop filesystem watcher for a specific task
 */
export function stopFileSystemWatcher(taskId: string): void {
  const watcher = activeFileSystemWatchers.get(taskId);
  if (watcher) {
    watcher.stop();
    activeFileSystemWatchers.delete(taskId);
    console.log(`[TOOLS] Stopped filesystem watcher for task ${taskId}`);
  }
}

/**
 * Stop MCP manager for a specific task
 */
export async function stopMCPManager(taskId: string): Promise<void> {
  const manager = activeMCPManagers.get(taskId);
  if (manager) {
    try {
      await manager.closeAllConnections();
      activeMCPManagers.delete(taskId);
      console.log(`[TOOLS] Stopped MCP manager for task ${taskId}`);
    } catch (error) {
      console.error(
        `[TOOLS] Error stopping MCP manager for task ${taskId}:`,
        error
      );
      // Still remove from map even if cleanup failed
      activeMCPManagers.delete(taskId);
    }
  }
}

/**
 * Stop all active filesystem watchers (for graceful shutdown)
 */
export function stopAllFileSystemWatchers(): void {
  console.log(
    `[TOOLS] Stopping ${activeFileSystemWatchers.size} active filesystem watchers`
  );

  for (const [taskId, watcher] of Array.from(
    activeFileSystemWatchers.entries()
  )) {
    watcher.stop();
    console.log(`[TOOLS] Stopped filesystem watcher for task ${taskId}`);
  }

  activeFileSystemWatchers.clear();
}

/**
 * Stop all active MCP managers (for graceful shutdown)
 */
export async function stopAllMCPManagers(): Promise<void> {
  console.log(`[TOOLS] Stopping ${activeMCPManagers.size} active MCP managers`);

  const stopPromises = Array.from(activeMCPManagers.entries()).map(
    async ([taskId, manager]) => {
      try {
        await manager.closeAllConnections();
        console.log(`[TOOLS] Stopped MCP manager for task ${taskId}`);
      } catch (error) {
        console.error(
          `[TOOLS] Error stopping MCP manager for task ${taskId}:`,
          error
        );
      }
    }
  );

  await Promise.allSettled(stopPromises);
  activeMCPManagers.clear();
}

/**
 * Get statistics about active filesystem watchers
 */
export function getFileSystemWatcherStats() {
  const stats: Array<{ taskId: string; watchedPath: string; isWatching: boolean; isPaused: boolean; pendingChanges: number }> = [];
  for (const [_taskId, watcher] of Array.from(
    activeFileSystemWatchers.entries()
  )) {
    stats.push(watcher.getStats());
  }
  return {
    activeWatchers: activeFileSystemWatchers.size,
    watcherDetails: stats,
  };
}

/**
 * Clean up terminal counter for a specific task
 */
export function cleanupTaskTerminalCounters(taskId: string): void {
  taskTerminalCounters.delete(taskId);
  console.log(`[TOOLS] Cleaned up terminal counters for task ${taskId}`);
}

// Default tools export
// Made lazy to avoid circular dependencies
let _defaultTools: Awaited<ReturnType<typeof createTools>> | undefined;
let _defaultToolsPromise:
  | Promise<Awaited<ReturnType<typeof createTools>>>
  | undefined;

export const tools = new Proxy({} as Awaited<ReturnType<typeof createTools>>, {
  get(_target, prop) {
    if (!_defaultTools && !_defaultToolsPromise) {
      _defaultToolsPromise = createTools("placeholder-task-id").then(
        (tools) => {
          _defaultTools = tools;
          return tools;
        }
      );
    }
    if (_defaultTools) {
      return _defaultTools[
        prop as keyof Awaited<ReturnType<typeof createTools>>
      ];
    }
    // If tools aren't ready yet, throw an error indicating they need to be awaited
    throw new Error(
      "Tools are not ready yet. Use createTools() directly for async initialization."
    );
  },
});
