import { z } from "zod";
import { ActionCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
interface McpToolDefinition {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
}
interface McpConnectorInfo {
    id: string;
    name: string;
    nameId: string;
    url: string;
    type: "HTTP" | "SSE";
    configJson?: string;
    tools: McpToolDefinition[];
}
/**
 * Create proxy tools for MCP connectors
 * Each tool is namespaced with the connector's nameId to avoid conflicts
 */
export declare function createMcpProxyTools(connectors: McpConnectorInfo[]): Record<string, unknown>;
/**
 * Create agent tools with task context
 * @returns Object containing all agent tools
 */
export declare function createAgentTools(ctx: ActionCtx, taskId: Id<"tasks">, workspacePathOverride?: string): Record<string, unknown>;
/**
 * Create Exa web search tool when API key is available
 * This is a separate function to conditionally include web search capabilities
 */
export declare function createExaWebSearchTool(exaApiKey?: string): {
    web_search: any;
};
/**
 * Tool guidance for web search - describes when and how to use web search
 */
export declare const WEB_SEARCH_TOOL_GUIDANCE = "\n## Web Search Tool (web_search)\n\nYou have access to a powerful web search tool that can find current information from the internet.\n\n### When to use web_search:\n- Finding documentation for libraries, frameworks, or APIs\n- Looking up current best practices or patterns\n- Researching error messages or debugging issues\n- Finding examples of how to implement specific features\n- Getting latest information about technologies (releases, deprecations)\n- Answering questions that require up-to-date information\n\n### When NOT to use web_search:\n- For information already in the codebase (use grep_search, file_search, or semantic_search instead)\n- For general programming knowledge you already have\n- When the user's question is specifically about their code\n\n### Best practices:\n- Be specific in your search queries\n- Use relevant technical terms\n- Search for documentation rather than tutorials when possible\n- Combine web search results with codebase analysis for best results\n";
/**
 * System prompt addition for web search capabilities
 */
export declare const WEB_SEARCH_SYSTEM_PROMPT = "\nYou have access to web search capabilities through the web_search tool. Use it to:\n- Find current documentation and API references\n- Research solutions to errors and issues\n- Look up best practices and patterns\n- Get up-to-date information about libraries and frameworks\n\nAlways cite your sources when using information from web search results.\n";
export declare const AgentToolSchemas: {
    TodoWriteSchema: z.ZodObject<{
        merge: z.ZodBoolean;
        todos: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            content: z.ZodString;
            status: z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>;
        }, "strip", z.ZodTypeAny, {
            status?: "pending" | "completed" | "in_progress" | "cancelled";
            content?: string;
            id?: string;
        }, {
            status?: "pending" | "completed" | "in_progress" | "cancelled";
            content?: string;
            id?: string;
        }>, "many">;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        todos?: {
            status?: "pending" | "completed" | "in_progress" | "cancelled";
            content?: string;
            id?: string;
        }[];
        explanation?: string;
        merge?: boolean;
    }, {
        todos?: {
            status?: "pending" | "completed" | "in_progress" | "cancelled";
            content?: string;
            id?: string;
        }[];
        explanation?: string;
        merge?: boolean;
    }>;
    AddMemorySchema: z.ZodObject<{
        content: z.ZodString;
        category: z.ZodEnum<["INFRA", "SETUP", "STYLES", "ARCHITECTURE", "TESTING", "PATTERNS", "BUGS", "PERFORMANCE", "CONFIG", "GENERAL"]>;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        content?: string;
        category?: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
        explanation?: string;
    }, {
        content?: string;
        category?: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
        explanation?: string;
    }>;
    ListMemoriesSchema: z.ZodObject<{
        category: z.ZodOptional<z.ZodEnum<["INFRA", "SETUP", "STYLES", "ARCHITECTURE", "TESTING", "PATTERNS", "BUGS", "PERFORMANCE", "CONFIG", "GENERAL"]>>;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        category?: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
        explanation?: string;
    }, {
        category?: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
        explanation?: string;
    }>;
    RemoveMemorySchema: z.ZodObject<{
        memoryId: z.ZodString;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        explanation?: string;
        memoryId?: string;
    }, {
        explanation?: string;
        memoryId?: string;
    }>;
    ReadFileSchema: z.ZodObject<{
        target_file: z.ZodString;
        should_read_entire_file: z.ZodOptional<z.ZodBoolean>;
        start_line_one_indexed: z.ZodOptional<z.ZodNumber>;
        end_line_one_indexed_inclusive: z.ZodOptional<z.ZodNumber>;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        explanation?: string;
        target_file?: string;
        should_read_entire_file?: boolean;
        start_line_one_indexed?: number;
        end_line_one_indexed_inclusive?: number;
    }, {
        explanation?: string;
        target_file?: string;
        should_read_entire_file?: boolean;
        start_line_one_indexed?: number;
        end_line_one_indexed_inclusive?: number;
    }>;
    EditFileSchema: z.ZodObject<{
        target_file: z.ZodString;
        instructions: z.ZodString;
        code_edit: z.ZodString;
        is_new_file: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        target_file?: string;
        instructions?: string;
        code_edit?: string;
        is_new_file?: boolean;
    }, {
        target_file?: string;
        instructions?: string;
        code_edit?: string;
        is_new_file?: boolean;
    }>;
    SearchReplaceSchema: z.ZodObject<{
        file_path: z.ZodString;
        old_string: z.ZodString;
        new_string: z.ZodString;
        is_new_file: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        is_new_file?: boolean;
        file_path?: string;
        old_string?: string;
        new_string?: string;
    }, {
        is_new_file?: boolean;
        file_path?: string;
        old_string?: string;
        new_string?: string;
    }>;
    RunTerminalCmdSchema: z.ZodObject<{
        command: z.ZodString;
        is_background: z.ZodOptional<z.ZodBoolean>;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        command?: string;
        explanation?: string;
        is_background?: boolean;
    }, {
        command?: string;
        explanation?: string;
        is_background?: boolean;
    }>;
    ListDirSchema: z.ZodObject<{
        relative_workspace_path: z.ZodString;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        explanation?: string;
        relative_workspace_path?: string;
    }, {
        explanation?: string;
        relative_workspace_path?: string;
    }>;
    GrepSearchSchema: z.ZodObject<{
        query: z.ZodString;
        include_pattern: z.ZodOptional<z.ZodString>;
        exclude_pattern: z.ZodOptional<z.ZodString>;
        case_sensitive: z.ZodOptional<z.ZodBoolean>;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        query?: string;
        explanation?: string;
        include_pattern?: string;
        exclude_pattern?: string;
        case_sensitive?: boolean;
    }, {
        query?: string;
        explanation?: string;
        include_pattern?: string;
        exclude_pattern?: string;
        case_sensitive?: boolean;
    }>;
    FileSearchSchema: z.ZodObject<{
        pattern: z.ZodString;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        explanation?: string;
        pattern?: string;
    }, {
        explanation?: string;
        pattern?: string;
    }>;
    DeleteFileSchema: z.ZodObject<{
        target_file: z.ZodString;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        explanation?: string;
        target_file?: string;
    }, {
        explanation?: string;
        target_file?: string;
    }>;
    SemanticSearchSchema: z.ZodObject<{
        query: z.ZodString;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        query?: string;
        explanation?: string;
    }, {
        query?: string;
        explanation?: string;
    }>;
    WarpGrepSchema: z.ZodObject<{
        query: z.ZodString;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        query?: string;
        explanation?: string;
    }, {
        query?: string;
        explanation?: string;
    }>;
    WebSearchSchema: z.ZodObject<{
        query: z.ZodString;
        numResults: z.ZodOptional<z.ZodNumber>;
        category: z.ZodOptional<z.ZodEnum<["company", "research paper", "news", "pdf", "github", "personal site", "linkedin profile", "financial report"]>>;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        query?: string;
        category?: "github" | "company" | "research paper" | "news" | "pdf" | "personal site" | "linkedin profile" | "financial report";
        explanation?: string;
        numResults?: number;
    }, {
        query?: string;
        category?: "github" | "company" | "research paper" | "news" | "pdf" | "personal site" | "linkedin profile" | "financial report";
        explanation?: string;
        numResults?: number;
    }>;
};
export {};
//# sourceMappingURL=agentTools.d.ts.map