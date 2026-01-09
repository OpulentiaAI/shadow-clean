import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
export const getTree = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    // Get task to check if it's a scratchpad
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return { success: false, error: "Task not found", tree: [] };
    }

    const virtualFiles = await ctx.db
      .query("virtualFiles")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    if (virtualFiles.length > 0) {
      const filePaths = virtualFiles
        .filter((file) => !file.isDirectory)
        .map((file) => file.path);

      return {
        success: true,
        tree: buildTreeFromPaths(filePaths),
        note: "File tree built from Convex virtual files",
      };
    }

    // For scratchpads, return empty tree (client may inject default README)
    if (task.isScratchpad) {
      return {
        success: true,
        tree: [],
        note: "Scratchpad tasks use Convex storage for files",
      };
    }

    // Collect file paths from multiple sources for non-scratchpad tasks
    const allFilePaths = new Set<string>();

    // Source 1: File changes (files that were created/updated/deleted)
    const fileChanges = await ctx.db
      .query("fileChanges")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const deletedFiles = new Set<string>();
    for (const change of fileChanges) {
      if (change.operation === "DELETE") {
        deletedFiles.add(change.filePath);
      } else {
        allFilePaths.add(change.filePath);
      }
    }

    // Source 2: Tool execution results (list_dir, read_file results)
    const toolLogs = await ctx.db
      .query("toolLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .filter((q) => q.eq(q.field("status"), "COMPLETED"))
      .collect();

    for (const log of toolLogs) {
      if (!log.resultJson) continue;
      
      try {
        const result = JSON.parse(log.resultJson);
        
        // Extract paths from list_dir results
        if (log.toolName === "list_dir" && result.contents) {
          for (const item of result.contents) {
            if (item.path && !item.isDirectory) {
              allFilePaths.add(item.path);
            }
          }
        }
        
        // Extract paths from read_file results
        if (log.toolName === "read_file" && result.path) {
          allFilePaths.add(result.path);
        }
      } catch {
        // Skip malformed JSON
      }
    }

    // Source 3: Agent tool calls from streaming (agentTools table)
    const agentTools = await ctx.db
      .query("agentTools")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .filter((q) => q.eq(q.field("status"), "SUCCEEDED"))
      .collect();

    for (const tool of agentTools) {
      if (!tool.result) continue;
      
      try {
        // agentTools stores result as v.any(), not as JSON string
        const result = typeof tool.result === "string" ? JSON.parse(tool.result) : tool.result;
        
        // Extract paths from list_dir results
        if (tool.toolName === "list_dir" && result.contents) {
          for (const item of result.contents) {
            if (item.path && !item.isDirectory) {
              allFilePaths.add(item.path);
            }
          }
        }
        
        // Extract paths from read_file results
        if (tool.toolName === "read_file" && result.path) {
          allFilePaths.add(result.path);
        }
      } catch {
        // Skip malformed JSON
      }
    }

    // Remove deleted files
    for (const deleted of deletedFiles) {
      allFilePaths.delete(deleted);
    }

    // Convert to tree structure
    const tree = buildTreeFromPaths(Array.from(allFilePaths));

    return { 
      success: true, 
      tree,
      note: `File tree built from ${allFilePaths.size} files (file changes + tool results)`
    };
  },
});

/**
 * Get file content for a task from Convex virtual files
 */
export const getContent = query({
  args: {
    taskId: v.id("tasks"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("virtualFiles")
      .withIndex("by_task_path", (q) =>
        q.eq("taskId", args.taskId).eq("path", args.path)
      )
      .first();

    if (!entry) {
      return {
        success: false,
        error: "File not found",
        errorType: "FILE_NOT_FOUND",
      };
    }

    if (entry.isDirectory) {
      return {
        success: false,
        error: "Path is a directory",
        errorType: "UNKNOWN",
      };
    }

    if (typeof entry.content === "string") {
      return {
        success: true,
        content: entry.content,
        path: entry.path,
        size: entry.size,
        truncated: false,
      };
    }

    return {
      success: false,
      error: "Binary file content not available",
      errorType: "UNKNOWN",
    };
  },
});

/**
 * Store file metadata for a task
 */
export const storeFileMetadata = mutation({
  args: {
    taskId: v.id("tasks"),
    filePath: v.string(),
    size: v.optional(v.number()),
    lastModified: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Create a file change record for tracking
    await ctx.db.insert("fileChanges", {
      taskId: args.taskId,
      filePath: args.filePath,
      operation: "CREATE",
      additions: 0,
      deletions: 0,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get diff stats for a task (file changes summary)
 */
export const getDiffStats = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const changes = await ctx.db
      .query("fileChanges")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    // Aggregate stats
    let filesChanged = 0;
    let additions = 0;
    let deletions = 0;
    const uniqueFiles = new Set<string>();

    for (const change of changes) {
      uniqueFiles.add(change.filePath);
      additions += change.additions;
      deletions += change.deletions;
    }

    filesChanged = uniqueFiles.size;

    return {
      success: true,
      filesChanged,
      additions,
      deletions,
      changes: changes.map((c) => ({
        path: c.filePath,
        operation: c.operation,
        additions: c.additions,
        deletions: c.deletions,
      })),
    };
  },
});

/**
 * Store or update a virtual file for scratchpad tasks
 */
export const storeVirtualFile = mutation({
  args: {
    taskId: v.id("tasks"),
    path: v.string(),
    content: v.string(),
    isDirectory: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if file already exists
    const existing = await ctx.db
      .query("virtualFiles")
      .withIndex("by_task_path", (q) =>
        q.eq("taskId", args.taskId).eq("path", args.path)
      )
      .first();

    if (existing) {
      // Update existing file
      await ctx.db.patch(existing._id, {
        content: args.content,
        size: args.content.length,
        updatedAt: Date.now(),
      });
      return { success: true, action: "updated", path: args.path };
    }

    // Create new file
    await ctx.db.insert("virtualFiles", {
      taskId: args.taskId,
      path: args.path,
      content: args.content,
      size: args.content.length,
      isDirectory: args.isDirectory,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, action: "created", path: args.path };
  },
});

/**
 * Get all virtual files for a task (for grep/file search)
 */
export const getAllVirtualFiles = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("virtualFiles")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .filter((q) => q.eq(q.field("isDirectory"), false))
      .collect();

    return files.map((f) => ({
      path: f.path,
      content: f.content,
      size: f.size,
    }));
  },
});

/**
 * Delete a virtual file from scratchpad
 */
export const deleteVirtualFile = mutation({
  args: {
    taskId: v.id("tasks"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("virtualFiles")
      .withIndex("by_task_path", (q) =>
        q.eq("taskId", args.taskId).eq("path", args.path)
      )
      .first();

    if (!existing) {
      return {
        success: false,
        error: `File not found: ${args.path}`,
        path: args.path,
      };
    }

    await ctx.db.delete(existing._id);

    return {
      success: true,
      message: `Deleted ${args.path}`,
      path: args.path,
    };
  },
});

/**
 * Helper function to build tree structure from flat file paths
 */
function buildTreeFromPaths(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  
  for (const filePath of paths) {
    const parts = filePath.split("/").filter(Boolean);
    let currentLevel = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] as string;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;

      let existing = currentLevel.find((n) => n.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "folder",
          children: isFile ? undefined : [],
        };
        currentLevel.push(existing);
      }

      if (!isFile && existing.children) {
        currentLevel = existing.children;
      }
    }
  }

  // Sort: folders first, then alphabetically
  const sortTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    }).map((node) => ({
      ...node,
      children: node.children ? sortTree(node.children) : undefined,
    }));
  };

  return sortTree(root);
}

/**
 * Bulk store file tree from GitHub into virtualFiles
 * Called during task initialization to populate the file tree
 */
export const storeGitHubFileTree = mutation({
  args: {
    taskId: v.id("tasks"),
    files: v.array(
      v.object({
        path: v.string(),
        type: v.string(), // "blob" (file) or "tree" (directory)
        size: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let filesStored = 0;
    let dirsStored = 0;

    // Clear existing virtualFiles for this task (fresh init)
    const existingFiles = await ctx.db
      .query("virtualFiles")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const file of existingFiles) {
      await ctx.db.delete(file._id);
    }

    // Store each file/directory entry
    for (const item of args.files) {
      const isDirectory = item.type === "tree";

      await ctx.db.insert("virtualFiles", {
        taskId: args.taskId,
        path: item.path,
        content: "", // Content fetched on-demand
        size: item.size || 0,
        isDirectory,
        createdAt: now,
        updatedAt: now,
      });

      if (isDirectory) {
        dirsStored++;
      } else {
        filesStored++;
      }
    }

    console.log(
      `[STORE_GITHUB_TREE] Stored ${filesStored} files and ${dirsStored} directories for task ${args.taskId}`
    );

    return {
      success: true,
      filesStored,
      dirsStored,
      total: args.files.length,
    };
  },
});
