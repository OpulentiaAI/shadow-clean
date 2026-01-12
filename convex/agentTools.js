"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentToolSchemas = exports.WEB_SEARCH_SYSTEM_PROMPT = exports.WEB_SEARCH_TOOL_GUIDANCE = void 0;
exports.createMcpProxyTools = createMcpProxyTools;
exports.createAgentTools = createAgentTools;
exports.createExaWebSearchTool = createExaWebSearchTool;
// @ts-nocheck
/**
 * Agent Tools for @convex-dev/agent
 *
 * These tools are used by the Shadow Agent for autonomous coding tasks.
 * They use a hybrid approach:
 * - Data tools (todos, memories): Direct Convex DB operations
 * - File/terminal tools: HTTP calls to server tool API
 * - Web search: Exa AI SDK for real-time web search
 */
const ai_1 = require("ai");
const zod_1 = require("zod");
const api_1 = require("./_generated/api");
const ai_sdk_1 = require("@exalabs/ai-sdk");
// Server URL for tool API calls
const getServerUrl = () => process.env.SHADOW_SERVER_URL || "http://localhost:4000";
const getToolApiKey = () => process.env.CONVEX_TOOL_API_KEY || "shadow-internal-tool-key";
/**
 * Parse config JSON and extract environment variables for MCP calls
 */
function parseConfigJson(configJson) {
    if (!configJson)
        return {};
    try {
        const parsed = JSON.parse(configJson);
        return parsed.variables || {};
    }
    catch {
        return {};
    }
}
/**
 * Call an MCP server tool via JSON-RPC
 * Includes user-configured environment variables in headers
 */
async function callMcpTool(connectorUrl, toolName, args, configJson) {
    const headers = {
        "Content-Type": "application/json",
    };
    // Parse stored config and add as custom header
    // MCP servers can read this to authenticate with their backing services
    const configVars = parseConfigJson(configJson);
    if (Object.keys(configVars).length > 0) {
        headers["X-MCP-Config"] = Buffer.from(JSON.stringify(configVars)).toString("base64");
    }
    const response = await fetch(connectorUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method: "tools/call",
            params: { name: toolName, arguments: args },
        }),
    });
    if (!response.ok) {
        throw new Error(`MCP tool call failed: ${response.status}`);
    }
    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message || "MCP tool error");
    }
    return data.result;
}
/**
 * Create proxy tools for MCP connectors
 * Each tool is namespaced with the connector's nameId to avoid conflicts
 */
function createMcpProxyTools(connectors) {
    const mcpTools = {};
    for (const connector of connectors) {
        for (const mcpTool of connector.tools) {
            // Namespace the tool: e.g., "atlassian_search_issues"
            const toolName = `${connector.nameId}_${mcpTool.name}`;
            // Capture connector config for use in closure
            const connectorConfigJson = connector.configJson;
            mcpTools[toolName] = (0, ai_1.tool)({
                description: `[${connector.name}] ${mcpTool.description || mcpTool.name}`,
                parameters: zod_1.z.object({}).passthrough(), // Accept any parameters
                execute: async (args) => {
                    console.log(`[MCP_TOOL] Calling ${connector.name}:${mcpTool.name}`);
                    try {
                        // Pass configJson to authenticate with the MCP server's backing service
                        const result = await callMcpTool(connector.url, mcpTool.name, args, connectorConfigJson);
                        return { success: true, result };
                    }
                    catch (error) {
                        console.error(`[MCP_TOOL] Error:`, error);
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : "Unknown error",
                        };
                    }
                },
            });
        }
    }
    return mcpTools;
}
// Helper to make tool API calls to the server
async function callServerTool(taskId, toolName, params, workspacePathOverride) {
    const serverUrl = getServerUrl();
    const apiKey = getToolApiKey();
    console.log(`[TOOL_API_CALL] tool=${toolName} serverUrl=${serverUrl} workspaceOverride=${workspacePathOverride ? "YES" : "NO"}`);
    const response = await fetch(`${serverUrl}/api/tools/${taskId}/${toolName}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-convex-tool-key": apiKey,
            ...(workspacePathOverride
                ? { "x-shadow-workspace-path": workspacePathOverride }
                : {}),
        },
        body: JSON.stringify(params),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tool API error: ${response.status} - ${errorText}`);
    }
    return response.json();
}
// Status conversion helper
const TODO_STATUS_MAP = {
    pending: "PENDING",
    in_progress: "IN_PROGRESS",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
};
function toConvexTodoStatus(status) {
    const key = status;
    return TODO_STATUS_MAP[key] ?? "PENDING";
}
// Tool schemas
const TodoWriteSchema = zod_1.z.object({
    merge: zod_1.z
        .boolean()
        .describe("If true, merge with existing todos. If false, replace all."),
    todos: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().describe("Unique identifier for this todo"),
        content: zod_1.z.string().describe("Description of the task"),
        status: zod_1.z
            .enum(["pending", "in_progress", "completed", "cancelled"])
            .describe("Current status of the todo"),
    })),
    explanation: zod_1.z
        .string()
        .describe("Brief explanation of why this update is needed"),
});
const AddMemorySchema = zod_1.z.object({
    content: zod_1.z.string().describe("Concise memory content to store"),
    category: zod_1.z
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
    explanation: zod_1.z.string().describe("Why this memory is being added"),
});
const ListMemoriesSchema = zod_1.z.object({
    category: zod_1.z
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
    explanation: zod_1.z.string().describe("Why memories are being listed"),
});
const RemoveMemorySchema = zod_1.z.object({
    memoryId: zod_1.z.string().describe("ID of the memory to remove"),
    explanation: zod_1.z.string().describe("Why this memory is being removed"),
});
const ReadFileSchema = zod_1.z.object({
    target_file: zod_1.z.string().describe("Path to the file to read"),
    should_read_entire_file: zod_1.z
        .boolean()
        .optional()
        .describe("If true, read the entire file"),
    start_line_one_indexed: zod_1.z
        .number()
        .optional()
        .describe("Starting line number (1-indexed)"),
    end_line_one_indexed_inclusive: zod_1.z
        .number()
        .optional()
        .describe("Ending line number (inclusive)"),
    explanation: zod_1.z.string().describe("Why this file is being read"),
});
const EditFileSchema = zod_1.z.object({
    target_file: zod_1.z.string().describe("Path to the file to edit"),
    instructions: zod_1.z.string().describe("Description of the changes being made"),
    code_edit: zod_1.z.string().describe("The new file content or code changes"),
    is_new_file: zod_1.z
        .boolean()
        .optional()
        .describe("Set true when creating a new file"),
});
const SearchReplaceSchema = zod_1.z.object({
    file_path: zod_1.z.string().describe("Path to the file"),
    old_string: zod_1.z.string().describe("Exact string to find and replace"),
    new_string: zod_1.z.string().describe("Replacement string"),
    is_new_file: zod_1.z
        .boolean()
        .optional()
        .describe("Set true when creating a new file"),
});
const RunTerminalCmdSchema = zod_1.z.object({
    command: zod_1.z.string().describe("The command to execute"),
    is_background: zod_1.z
        .boolean()
        .optional()
        .describe("Run in background without waiting"),
    explanation: zod_1.z.string().describe("Why this command is being run"),
});
const ListDirSchema = zod_1.z.object({
    relative_workspace_path: zod_1.z
        .string()
        .describe("Path relative to workspace root"),
    explanation: zod_1.z.string().describe("Why this directory is being listed"),
});
const GrepSearchSchema = zod_1.z.object({
    query: zod_1.z.string().describe("Regex pattern to search for"),
    include_pattern: zod_1.z
        .string()
        .optional()
        .describe("File glob pattern to include"),
    exclude_pattern: zod_1.z
        .string()
        .optional()
        .describe("File glob pattern to exclude"),
    case_sensitive: zod_1.z.boolean().optional().describe("Case-sensitive search"),
    explanation: zod_1.z.string().describe("What you're searching for"),
});
const FileSearchSchema = zod_1.z.object({
    pattern: zod_1.z.string().describe("Filename or partial filename to search for"),
    explanation: zod_1.z.string().describe("Why this file search is needed"),
});
const DeleteFileSchema = zod_1.z.object({
    target_file: zod_1.z.string().describe("Path to the file to delete"),
    explanation: zod_1.z.string().describe("Why this file should be deleted"),
});
const SemanticSearchSchema = zod_1.z.object({
    query: zod_1.z.string().describe("Natural language search query"),
    explanation: zod_1.z.string().describe("What concept you're searching for"),
});
const WarpGrepSchema = zod_1.z.object({
    query: zod_1.z.string().describe("Natural language query for code search"),
    explanation: zod_1.z.string().describe("What code you're looking for"),
});
// Web Search Schema
const WebSearchSchema = zod_1.z.object({
    query: zod_1.z.string().describe("Search query for finding information on the web"),
    numResults: zod_1.z.number().optional().describe("Number of results to return (default: 5)"),
    category: zod_1.z.enum(["company", "research paper", "news", "pdf", "github", "personal site", "linkedin profile", "financial report"]).optional().describe("Category to focus the search on"),
    explanation: zod_1.z.string().describe("Why this web search is needed"),
});
/**
 * Create agent tools with task context
 * @returns Object containing all agent tools
 */
function createAgentTools(ctx, taskId, workspacePathOverride) {
    const taskIdStr = taskId;
    let workspacePathPromise = null;
    const getWorkspacePath = async () => {
        if (workspacePathOverride)
            return workspacePathOverride;
        if (!workspacePathPromise) {
            workspacePathPromise = ctx
                .runQuery(api_1.api.tasks.get, { taskId })
                .then((t) => t?.workspacePath ? String(t.workspacePath) : undefined)
                .catch(() => undefined);
        }
        return workspacePathPromise;
    };
    return {
        // ==================== DATA TOOLS (Direct Convex) ====================
        todo_write: (0, ai_1.tool)({
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
                let existingTodos = [];
                if (merge) {
                    existingTodos = await ctx.runQuery(api_1.api.todos.byTask, { taskId });
                }
                else {
                    await ctx.runMutation(api_1.api.todos.removeAllByTask, { taskId });
                }
                const results = [];
                for (let i = 0; i < todos.length; i++) {
                    const todo = todos[i];
                    if (!todo)
                        continue;
                    const status = toConvexTodoStatus(todo.status);
                    const existing = merge ? existingTodos[i] : undefined;
                    if (merge && existing) {
                        await ctx.runMutation(api_1.api.todos.update, {
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
                    }
                    else {
                        await ctx.runMutation(api_1.api.todos.create, {
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
                const updatedTodos = (await ctx.runQuery(api_1.api.todos.byTask, { taskId }));
                const totalTodos = updatedTodos.length;
                const completedTodos = updatedTodos.filter((t) => t.status === "COMPLETED").length;
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
        add_memory: (0, ai_1.tool)({
            description: `Store important information about the repository for future reference. Use this to remember patterns, configurations, architectural decisions, or debugging insights.`,
            inputSchema: AddMemorySchema,
            execute: async ({ content, category, explanation }) => {
                console.log(`[ADD_MEMORY] ${explanation}`);
                const task = await ctx.runQuery(api_1.api.tasks.get, { taskId });
                if (!task) {
                    throw new Error(`Task ${taskId} not found`);
                }
                const result = await ctx.runMutation(api_1.api.memories.create, {
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
        list_memories: (0, ai_1.tool)({
            description: `Retrieve stored memories for the current repository. Use this to recall previous learnings, patterns, or configurations.`,
            inputSchema: ListMemoriesSchema,
            execute: async ({ category, explanation }) => {
                console.log(`[LIST_MEMORIES] ${explanation}`);
                const task = await ctx.runQuery(api_1.api.tasks.get, { taskId });
                if (!task) {
                    throw new Error(`Task ${taskId} not found`);
                }
                const memories = (await ctx.runQuery(api_1.api.memories.byUserAndRepo, {
                    userId: task.userId,
                    repoFullName: task.repoFullName,
                }));
                const filteredMemories = category
                    ? memories.filter((m) => m.category === category)
                    : memories;
                return {
                    success: true,
                    memories: filteredMemories,
                    count: filteredMemories.length,
                };
            },
        }),
        remove_memory: (0, ai_1.tool)({
            description: `Remove a previously stored memory that is no longer relevant or accurate.`,
            inputSchema: RemoveMemorySchema,
            execute: async ({ memoryId, explanation }) => {
                console.log(`[REMOVE_MEMORY] ${explanation}`);
                const task = await ctx.runQuery(api_1.api.tasks.get, { taskId });
                if (!task) {
                    throw new Error(`Task ${taskId} not found`);
                }
                const memory = await ctx.runQuery(api_1.api.memories.get, {
                    memoryId: memoryId,
                });
                if (!memory || memory.userId !== task.userId) {
                    return {
                        success: false,
                        error: "Memory not found or access denied",
                    };
                }
                await ctx.runMutation(api_1.api.memories.remove, {
                    memoryId: memoryId,
                });
                return {
                    success: true,
                    message: `Removed memory: ${memory.content}`,
                };
            },
        }),
        // ==================== FILE TOOLS (Server API) ====================
        read_file: (0, ai_1.tool)({
            description: `Read the contents of a file. Always read files before editing them. Supports reading specific line ranges for large files.`,
            inputSchema: ReadFileSchema,
            execute: async (params) => {
                console.log(`[READ_FILE] ${params.explanation}`);
                // Use Convex virtualFiles for all tasks (Convex-native)
                console.log(`[READ_FILE] Using Convex virtualFiles for ${params.target_file}`);
                const result = await ctx.runQuery(api_1.api.files.getContent, {
                    taskId,
                    path: params.target_file,
                });
                if (result?.success) {
                    return {
                        success: true,
                        content: result.content,
                        path: params.target_file,
                        size: result.size || result.content?.length || 0,
                    };
                }
                return {
                    success: false,
                    error: result?.error || "File not found",
                    path: params.target_file,
                };
            },
        }),
        edit_file: (0, ai_1.tool)({
            description: `Create or modify a file. For new files, provide the complete content. For existing files, provide instructions and code edits.`,
            inputSchema: EditFileSchema,
            execute: async (params) => {
                console.log(`[EDIT_FILE] ${params.instructions}`);
                // Store file content in Convex virtualFiles for all tasks (Convex-native)
                console.log(`[EDIT_FILE] Using Convex virtualFiles for ${params.target_file}`);
                await ctx.runMutation(api_1.api.files.storeVirtualFile, {
                    taskId,
                    path: params.target_file,
                    content: params.code_edit || "",
                    isDirectory: false,
                });
                return {
                    success: true,
                    message: `File ${params.target_file} saved`,
                    path: params.target_file,
                };
            },
        }),
        search_replace: (0, ai_1.tool)({
            description: `Perform precise string replacement in a file. Use for targeted edits when you know the exact text to replace.`,
            inputSchema: SearchReplaceSchema,
            execute: async (params) => {
                console.log(`[SEARCH_REPLACE] Replacing in ${params.file_path}`);
                // Use Convex virtualFiles for all tasks (Convex-native)
                console.log(`[SEARCH_REPLACE] Using Convex virtualFiles`);
                // Get current file content
                const fileResult = await ctx.runQuery(api_1.api.files.getContent, {
                    taskId,
                    path: params.file_path,
                });
                if (!fileResult?.success || !fileResult.content) {
                    return {
                        success: false,
                        error: `File not found: ${params.file_path}`,
                        path: params.file_path,
                    };
                }
                // Perform search and replace
                const oldContent = fileResult.content;
                if (!oldContent.includes(params.old_string)) {
                    return {
                        success: false,
                        error: `Search string not found in file: "${params.old_string.substring(0, 50)}..."`,
                        path: params.file_path,
                    };
                }
                const newContent = oldContent.replace(params.old_string, params.new_string);
                // Save updated content
                await ctx.runMutation(api_1.api.files.storeVirtualFile, {
                    taskId,
                    path: params.file_path,
                    content: newContent,
                    isDirectory: false,
                });
                return {
                    success: true,
                    message: `Replaced content in ${params.file_path}`,
                    path: params.file_path,
                    replacements: 1,
                };
            },
        }),
        run_terminal_cmd: (0, ai_1.tool)({
            description: `Execute a terminal command in the workspace. Use for building, testing, installing dependencies, or running scripts.`,
            inputSchema: RunTerminalCmdSchema,
            execute: async (params) => {
                console.log(`[TERMINAL_CMD] ${params.explanation}`);
                // Check if task is a scratchpad - terminal commands not supported
                const task = await ctx.runQuery(api_1.api.tasks.get, { taskId });
                if (task?.isScratchpad) {
                    console.log(`[TERMINAL_CMD] Scratchpad task - terminal not available`);
                    return {
                        success: false,
                        error: "Terminal commands are not available in scratchpad mode. Scratchpad tasks run in a browser-based sandbox without a terminal. Consider using file operations (read_file, edit_file, list_dir) instead.",
                        command: params.command,
                        note: "To run code, create the files and the user can copy/paste to run locally.",
                    };
                }
                return callServerTool(taskIdStr, "run_terminal_cmd", params, await getWorkspacePath());
            },
        }),
        list_dir: (0, ai_1.tool)({
            description: `List the contents of a directory. Use to explore the file structure and understand project organization.`,
            inputSchema: ListDirSchema,
            execute: async (params) => {
                console.log(`[LIST_DIR] ${params.explanation}`);
                // Use Convex virtualFiles for all tasks (Convex-native)
                console.log(`[LIST_DIR] Using Convex virtualFiles`);
                const virtualFiles = await ctx.runQuery(api_1.api.files.getTree, { taskId });
                if (virtualFiles?.success && virtualFiles.tree) {
                    // Filter to requested path
                    const requestedPath = params.relative_workspace_path || ".";
                    const normalizedPath = requestedPath === "." ? "" : requestedPath.replace(/^\.\//, "");
                    // Build directory listing from tree - use "contents" to match frontend expectations
                    const contents = [];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const processTree = (items, parentPath = "") => {
                        for (const item of items) {
                            const itemPath = parentPath ? `${parentPath}/${item.name}` : item.name;
                            if (normalizedPath === "" || itemPath.startsWith(normalizedPath)) {
                                // Only include direct children of the requested path
                                const relativePath = normalizedPath ? itemPath.slice(normalizedPath.length + 1) : itemPath;
                                if (!relativePath.includes("/")) {
                                    contents.push({
                                        name: item.name,
                                        isDirectory: item.type === "folder" || !!item.children,
                                        path: itemPath,
                                    });
                                }
                            }
                            if (item.children) {
                                processTree(item.children, itemPath);
                            }
                        }
                    };
                    processTree(virtualFiles.tree);
                    return {
                        success: true,
                        contents,
                        path: requestedPath,
                        note: "Listed from Convex virtualFiles",
                    };
                }
                // Return empty if no files yet
                return {
                    success: true,
                    contents: [],
                    path: params.relative_workspace_path || ".",
                    note: "No files yet. Use edit_file to create files.",
                };
            },
        }),
        grep_search: (0, ai_1.tool)({
            description: `Search for patterns in files using regex. Use to find code references, function definitions, or specific text patterns.`,
            inputSchema: GrepSearchSchema,
            execute: async (params) => {
                console.log(`[GREP_SEARCH] ${params.explanation}`);
                // Use Convex virtualFiles for all tasks (Convex-native)
                console.log(`[GREP_SEARCH] Using Convex virtualFiles`);
                // Get all virtual files for this task
                const allFiles = await ctx.runQuery(api_1.api.files.getAllVirtualFiles, { taskId });
                if (!allFiles || allFiles.length === 0) {
                    return {
                        success: true,
                        matches: [],
                        message: "No files to search",
                    };
                }
                const matches = [];
                const searchPattern = params.pattern;
                for (const file of allFiles) {
                    if (!file.content)
                        continue;
                    const lines = file.content.split("\n");
                    for (let i = 0; i < lines.length; i++) {
                        try {
                            const regex = new RegExp(searchPattern, "gi");
                            if (regex.test(lines[i] || "")) {
                                matches.push({
                                    file: file.path,
                                    line: i + 1,
                                    content: (lines[i] || "").trim().substring(0, 200),
                                });
                            }
                        }
                        catch {
                            // If regex is invalid, do literal search
                            if ((lines[i] || "").includes(searchPattern)) {
                                matches.push({
                                    file: file.path,
                                    line: i + 1,
                                    content: (lines[i] || "").trim().substring(0, 200),
                                });
                            }
                        }
                    }
                }
                return {
                    success: true,
                    matches: matches.slice(0, 50), // Limit results
                    totalMatches: matches.length,
                    note: "Searched Convex virtualFiles",
                };
            },
        }),
        file_search: (0, ai_1.tool)({
            description: `Search for files by name using fuzzy matching. Use to find specific files when you know part of the filename.`,
            inputSchema: FileSearchSchema,
            execute: async (params) => {
                console.log(`[FILE_SEARCH] ${params.explanation}`);
                // Use Convex virtualFiles for all tasks (Convex-native)
                console.log(`[FILE_SEARCH] Using Convex virtualFiles`);
                // Get all virtual files for this task
                const allFiles = await ctx.runQuery(api_1.api.files.getAllVirtualFiles, { taskId });
                if (!allFiles || allFiles.length === 0) {
                    return {
                        success: true,
                        files: [],
                        message: "No files to search",
                    };
                }
                const searchPattern = params.pattern.toLowerCase();
                const matchingFiles = allFiles
                    .filter((f) => f.path.toLowerCase().includes(searchPattern))
                    .map((f) => ({
                    path: f.path,
                    name: f.path.split("/").pop() || f.path,
                    size: f.size || 0,
                }));
                return {
                    success: true,
                    files: matchingFiles,
                    count: matchingFiles.length,
                    note: "Searched Convex virtualFiles",
                };
            },
        }),
        delete_file: (0, ai_1.tool)({
            description: `Delete a file from the workspace. Use with caution - verify the file should be removed before deleting.`,
            inputSchema: DeleteFileSchema,
            execute: async (params) => {
                console.log(`[DELETE_FILE] ${params.explanation}`);
                // Use Convex virtualFiles for all tasks (Convex-native)
                console.log(`[DELETE_FILE] Using Convex virtualFiles`);
                const result = await ctx.runMutation(api_1.api.files.deleteVirtualFile, {
                    taskId,
                    path: params.target_file,
                });
                return result;
            },
        }),
        semantic_search: (0, ai_1.tool)({
            description: `Search the codebase using AI-powered semantic understanding. Use for conceptual searches like "authentication logic" or "error handling".`,
            inputSchema: SemanticSearchSchema,
            execute: async (params) => {
                console.log(`[SEMANTIC_SEARCH] ${params.explanation}`);
                // Check if task is a scratchpad - semantic search not available
                const task = await ctx.runQuery(api_1.api.tasks.get, { taskId });
                if (task?.isScratchpad) {
                    console.log(`[SEMANTIC_SEARCH] Scratchpad task - not available`);
                    return {
                        success: false,
                        error: "Semantic search is not available in scratchpad mode. Use grep_search for pattern matching or file_search to find files by name.",
                        suggestion: "Try grep_search instead for text pattern matching.",
                    };
                }
                return callServerTool(taskIdStr, "semantic_search", params);
            },
        }),
        warp_grep: (0, ai_1.tool)({
            description: `Semantic code search using natural language. Faster alternative to semantic_search for quick code lookups.`,
            inputSchema: WarpGrepSchema,
            execute: async (params) => {
                console.log(`[WARP_GREP] ${params.explanation}`);
                // Check if task is a scratchpad - warp grep not available
                const task = await ctx.runQuery(api_1.api.tasks.get, { taskId });
                if (task?.isScratchpad) {
                    console.log(`[WARP_GREP] Scratchpad task - not available`);
                    return {
                        success: false,
                        error: "Warp grep is not available in scratchpad mode. Use grep_search for pattern matching.",
                        suggestion: "Try grep_search instead for text pattern matching.",
                    };
                }
                return callServerTool(taskIdStr, "warp_grep", params);
            },
        }),
    };
}
/**
 * Create Exa web search tool when API key is available
 * This is a separate function to conditionally include web search capabilities
 */
function createExaWebSearchTool(exaApiKey) {
    if (!exaApiKey) {
        return null;
    }
    // Set the EXA_API_KEY environment variable for the SDK
    process.env.EXA_API_KEY = exaApiKey;
    return {
        web_search: (0, ai_sdk_1.webSearch)({
            numResults: 5,
            contents: {
                text: { maxCharacters: 2000 },
            },
        }),
    };
}
/**
 * Tool guidance for web search - describes when and how to use web search
 */
exports.WEB_SEARCH_TOOL_GUIDANCE = `
## Web Search Tool (web_search)

You have access to a powerful web search tool that can find current information from the internet.

### When to use web_search:
- Finding documentation for libraries, frameworks, or APIs
- Looking up current best practices or patterns
- Researching error messages or debugging issues
- Finding examples of how to implement specific features
- Getting latest information about technologies (releases, deprecations)
- Answering questions that require up-to-date information

### When NOT to use web_search:
- For information already in the codebase (use grep_search, file_search, or semantic_search instead)
- For general programming knowledge you already have
- When the user's question is specifically about their code

### Best practices:
- Be specific in your search queries
- Use relevant technical terms
- Search for documentation rather than tutorials when possible
- Combine web search results with codebase analysis for best results
`;
/**
 * System prompt addition for web search capabilities
 */
exports.WEB_SEARCH_SYSTEM_PROMPT = `
You have access to web search capabilities through the web_search tool. Use it to:
- Find current documentation and API references
- Research solutions to errors and issues
- Look up best practices and patterns
- Get up-to-date information about libraries and frameworks

Always cite your sources when using information from web search results.
`;
// Export schemas for external use
exports.AgentToolSchemas = {
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
    WebSearchSchema,
};
