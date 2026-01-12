/**
 * Convex-native Git operations
 * Uses virtual file system stored in Convex for git-like operations
 * Note: Full git operations with isomorphic-git require Node.js runtime
 * This module provides git state tracking and basic operations
 */
/**
 * Initialize git state for a task
 */
export declare const initRepository: import("convex/server").RegisteredMutation<"public", {
    branch?: string;
    repoUrl?: string;
    taskId: import("convex/values").GenericId<"tasks">;
    workDir: string;
}, Promise<{
    gitStateId: import("convex/values").GenericId<"gitState">;
    action: string;
}>>;
/**
 * Get git state for a task
 */
export declare const getState: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    status: any;
    _id: import("convex/values").GenericId<"gitState">;
    _creationTime: number;
    repoUrl?: string;
    currentBranch: string;
    createdAt: number;
    updatedAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    workDir: string;
    lastOperation: string;
    lastOperationTime: number;
}>>;
/**
 * Update git status (tracked files, changes, etc.)
 */
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    status: {
        files: {
            path: string;
            status: string;
        }[];
        clean: boolean;
    };
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
}>>;
/**
 * Internal mutation for updating git progress
 */
export declare const updateProgress: import("convex/server").RegisteredMutation<"internal", {
    taskId: import("convex/values").GenericId<"tasks">;
    total: number;
    phase: string;
    loaded: number;
}, Promise<void>>;
/**
 * Record a commit (virtual - stores commit info in Convex)
 */
export declare const recordCommit: import("convex/server").RegisteredMutation<"public", {
    sha?: string;
    message: string;
    files: string[];
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    sha: string;
    filesCommitted: number;
}>>;
/**
 * Switch branch
 */
export declare const switchBranch: import("convex/server").RegisteredMutation<"public", {
    create?: boolean;
    branch: string;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    branch: string;
    created: boolean;
}>>;
/**
 * Clone repository action
 * Note: In Convex cloud, actual git clone requires external service
 * This creates the git state and prepares for file operations
 */
export declare const cloneRepository: import("convex/server").RegisteredAction<"public", {
    branch?: string;
    repoUrl: string;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    workDir: string;
    repoUrl: string;
    branch: string;
    message: string;
}>>;
/**
 * Internal mutation for clone action
 */
export declare const initRepositoryInternal: import("convex/server").RegisteredMutation<"internal", {
    branch: string;
    repoUrl: string;
    taskId: import("convex/values").GenericId<"tasks">;
    workDir: string;
}, Promise<void>>;
/**
 * Delete git state for a task
 */
export declare const deleteState: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    deleted: boolean;
}>>;
//# sourceMappingURL=git.d.ts.map