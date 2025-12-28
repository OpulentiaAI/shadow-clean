"use node";

/**
 * Daytona Integration for Convex - Node.js Runtime
 * Uses @daytonaio/sdk for toolbox operations (process, files, git, computer use)
 * These actions run in Node.js runtime to support SDK dependencies
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Daytona } from "@daytonaio/sdk";

// Get Daytona client instance
const getDaytona = () => {
  const apiKey = process.env.DAYTONA_API_KEY;
  
  if (!apiKey) {
    throw new Error("DAYTONA_API_KEY environment variable is not set");
  }
  
  return new Daytona({
    apiKey,
    target: "us",
  });
};

// Execute command in sandbox using SDK
export const executeCommandNode = action({
  args: {
    sandboxId: v.string(),
    command: v.string(),
    cwd: v.optional(v.string()),
    timeout: v.optional(v.number()),
  },
  handler: async (_, args) => {
    try {
      const daytona = getDaytona();
      const sandbox = await daytona.get(args.sandboxId);
      
      const result = await sandbox.process.executeCommand(
        args.command,
        args.cwd || "/home/daytona",
        undefined,
        args.timeout || 60
      );
      
      return { 
        success: true, 
        result: {
          stdout: result.result || "",
          exitCode: result.exitCode,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Clone git repository using SDK
export const gitCloneNode = action({
  args: {
    sandboxId: v.string(),
    url: v.string(),
    path: v.optional(v.string()),
    branch: v.optional(v.string()),
    username: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (_, args) => {
    try {
      const daytona = getDaytona();
      const sandbox = await daytona.get(args.sandboxId);
      
      await sandbox.git.clone(
        args.url,
        args.path || "/home/daytona/workspace",
        args.branch,
        args.username,
        args.token
      );
      
      return { success: true, message: `Cloned ${args.url} to ${args.path || "/home/daytona/workspace"}` };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Read file using SDK
export const readFileNode = action({
  args: {
    sandboxId: v.string(),
    path: v.string(),
  },
  handler: async (_, args) => {
    try {
      const daytona = getDaytona();
      const sandbox = await daytona.get(args.sandboxId);
      
      const content = await sandbox.fs.downloadFile(args.path);
      
      return { success: true, content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Write file using SDK
export const writeFileNode = action({
  args: {
    sandboxId: v.string(),
    path: v.string(),
    content: v.string(),
  },
  handler: async (_, args) => {
    try {
      const daytona = getDaytona();
      const sandbox = await daytona.get(args.sandboxId);
      
      await sandbox.fs.uploadFile(args.path, args.content);
      
      return { success: true, message: `File written to ${args.path}` };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// List files using SDK
export const listFilesNode = action({
  args: {
    sandboxId: v.string(),
    path: v.optional(v.string()),
  },
  handler: async (_, args) => {
    try {
      const daytona = getDaytona();
      const sandbox = await daytona.get(args.sandboxId);
      
      const files = await sandbox.fs.listFiles(args.path || "/home/daytona");
      
      return { success: true, files };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Take screenshot using SDK (Computer Use)
export const takeScreenshotNode = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (_, args) => {
    try {
      const daytona = getDaytona();
      const sandbox = await daytona.get(args.sandboxId);
      
      // Computer use screenshot - access as property or method based on SDK version
      const screenshot = await (sandbox.computerUse.screenshot as unknown as () => Promise<string>)();
      
      return { success: true, screenshot };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Mouse click using SDK (Computer Use)
export const mouseClickNode = action({
  args: {
    sandboxId: v.string(),
    x: v.number(),
    y: v.number(),
    button: v.optional(v.union(v.literal("left"), v.literal("right"), v.literal("middle"))),
  },
  handler: async (_, args) => {
    try {
      const daytona = getDaytona();
      const sandbox = await daytona.get(args.sandboxId);
      
      await sandbox.computerUse.mouse.click(args.x, args.y);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Keyboard type using SDK (Computer Use)
export const keyboardTypeNode = action({
  args: {
    sandboxId: v.string(),
    text: v.string(),
  },
  handler: async (_, args) => {
    try {
      const daytona = getDaytona();
      const sandbox = await daytona.get(args.sandboxId);
      
      await sandbox.computerUse.keyboard.type(args.text);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
