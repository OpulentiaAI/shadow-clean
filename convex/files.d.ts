/**
 * File metadata stored in Convex for file tree functionality
 * Replaces backend filesystem access for serverless deployment
 */
export interface FileTreeNode {
    name: string;
    path: string;
    type: "file" | "folder";
    children?: FileTreeNode[];
    size?: number;
    lastModified?: number;
}
/**
 * Get file tree for a task from stored file metadata
 * Returns empty tree if no files are stored (scratchpad mode)
 */
export declare const getTree: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    error: string;
    tree: any[];
    note?: undefined;
} | {
    success: boolean;
    tree: FileTreeNode[];
    note: string;
    error?: undefined;
}>>;
/**
 * Get file content for a task from Convex virtual files
 */
export declare const getContent: import("convex/server").RegisteredQuery<"public", {
    path: string;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    error: string;
    errorType: string;
    content?: undefined;
    path?: undefined;
    size?: undefined;
    truncated?: undefined;
} | {
    success: boolean;
    content: string;
    path: string;
    size: number;
    truncated: boolean;
    error?: undefined;
    errorType?: undefined;
}>>;
/**
 * Store file metadata for a task
 */
export declare const storeFileMetadata: import("convex/server").RegisteredMutation<"public", {
    size?: number;
    lastModified?: number;
    taskId: import("convex/values").GenericId<"tasks">;
    filePath: string;
}, Promise<{
    success: boolean;
}>>;
/**
 * Get diff stats for a task (file changes summary)
 */
export declare const getDiffStats: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    filesChanged: number;
    additions: number;
    deletions: number;
    changes: {
        path: string;
        operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
        additions: number;
        deletions: number;
    }[];
}>>;
/**
 * Store or update a virtual file for scratchpad tasks
 */
export declare const storeVirtualFile: import("convex/server").RegisteredMutation<"public", {
    path: string;
    content: string;
    taskId: import("convex/values").GenericId<"tasks">;
    isDirectory: boolean;
}, Promise<{
    success: boolean;
    action: string;
    path: string;
}>>;
/**
 * Get all virtual files for a task (for grep/file search)
 */
export declare const getAllVirtualFiles: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    path: string;
    content: string;
    size: number;
}[]>>;
/**
 * Delete a virtual file from scratchpad
 */
export declare const deleteVirtualFile: import("convex/server").RegisteredMutation<"public", {
    path: string;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    error: string;
    path: string;
    message?: undefined;
} | {
    success: boolean;
    message: string;
    path: string;
    error?: undefined;
}>>;
/**
 * Bulk store file tree from GitHub into virtualFiles
 * Called during task initialization to populate the file tree
 */
export declare const storeGitHubFileTree: import("convex/server").RegisteredMutation<"public", {
    files: {
        size?: number;
        path: string;
        type: string;
    }[];
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    filesStored: number;
    dirsStored: number;
    total: number;
}>>;
//# sourceMappingURL=files.d.ts.map