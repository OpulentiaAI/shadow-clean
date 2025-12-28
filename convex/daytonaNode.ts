"use node";

/**
 * Daytona Integration for Convex - Node.js Runtime (INTERNAL)
 * Uses @daytonaio/sdk for toolbox operations (process, files, git, computer use)
 * These actions run in Node.js runtime to support SDK dependencies
 * 
 * RELIABILITY FEATURES:
 * - waitUntilReady: Polls sandbox until network is ready (fixes "no IP address found")
 * - Retry with exponential backoff on transient errors
 * - Shallow git clone with exec fallback for large repos
 * - Exec-based file ops for reliability (SDK file ops can be flaky)
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Daytona } from "@daytonaio/sdk";

// Configuration
const READINESS_POLL_INTERVAL_MS = 1000;
const READINESS_MAX_WAIT_MS = 60000;
const READINESS_DELAY_AFTER_STARTED_MS = 2000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

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

/**
 * Sleep helper
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if error is a transient "not ready" error that should be retried
 */
const isTransientError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("no ip address found") ||
    msg.includes("sandbox not ready") ||
    msg.includes("econnrefused") ||
    msg.includes("502") ||
    msg.includes("504") ||
    msg.includes("gateway")
  );
};

/**
 * Wait until sandbox is fully network-ready
 * Polls the SDK until sandbox can be accessed, with conservative delay after "started"
 */
const waitUntilReady = async (sandboxId: string, maxWaitMs = READINESS_MAX_WAIT_MS): Promise<void> => {
  const daytona = getDaytona();
  const startTime = Date.now();
  
  console.log(`[DAYTONA] Waiting for sandbox ${sandboxId} to be ready...`);
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const sandbox = await daytona.get(sandboxId);
      
      // Check if sandbox exists and has started state
      if (sandbox) {
        // Try a simple command to verify network connectivity
        try {
          await sandbox.process.executeCommand("echo ready", "/home/daytona", undefined, 5);
          console.log(`[DAYTONA] Sandbox ${sandboxId} is ready (verified via echo)`);
          // Add conservative delay after first successful command
          await sleep(READINESS_DELAY_AFTER_STARTED_MS);
          return;
        } catch (execError) {
          // Command failed, sandbox not ready yet
          console.log(`[DAYTONA] Sandbox ${sandboxId} not ready yet, retrying...`);
        }
      }
    } catch (error) {
      console.log(`[DAYTONA] Sandbox ${sandboxId} poll error: ${error instanceof Error ? error.message : 'unknown'}`);
    }
    
    await sleep(READINESS_POLL_INTERVAL_MS);
  }
  
  throw new Error(`Sandbox ${sandboxId} did not become ready within ${maxWaitMs}ms`);
};

/**
 * Execute with retry and exponential backoff
 */
const withRetry = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = MAX_RETRIES
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (!isTransientError(error) || attempt === maxRetries - 1) {
        throw lastError;
      }
      
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      console.log(`[DAYTONA] ${operationName} failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms: ${lastError.message}`);
      await sleep(delay);
    }
  }
  
  throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
};

// ============================================
// INTERNAL NODE ACTIONS (called by public daytona:* actions)
// ============================================

/**
 * Execute command in sandbox using SDK (with readiness gate + retry)
 * This is the core primitive - all other ops can fall back to this
 */
export const executeCommandNode = action({
  args: {
    sandboxId: v.string(),
    command: v.string(),
    cwd: v.optional(v.string()),
    timeout: v.optional(v.number()),
    skipReadinessCheck: v.optional(v.boolean()),
  },
  handler: async (_, args) => {
    try {
      // Wait for sandbox to be ready (unless explicitly skipped for internal calls)
      if (!args.skipReadinessCheck) {
        await waitUntilReady(args.sandboxId);
      }
      
      return await withRetry(async () => {
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
      }, "executeCommand");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Clone git repository with shallow clone defaults and exec fallback
 * Strategy: 
 * 1. Try SDK git.clone with shallow options
 * 2. On 502/504/timeout, fallback to exec-based git clone
 */
export const gitCloneNode = action({
  args: {
    sandboxId: v.string(),
    url: v.string(),
    path: v.optional(v.string()),
    branch: v.optional(v.string()),
    depth: v.optional(v.number()),
    username: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (_, args) => {
    const targetPath = args.path || "/home/daytona/workspace";
    const depth = args.depth ?? 1; // Default to shallow clone
    
    try {
      // Wait for sandbox to be ready
      await waitUntilReady(args.sandboxId);
      
      // Build git clone command with optimal flags
      let cloneCmd = "git clone";
      if (depth > 0) {
        cloneCmd += ` --depth ${depth}`;
      }
      cloneCmd += " --single-branch";
      if (args.branch) {
        cloneCmd += ` --branch ${args.branch}`;
      }
      
      // Add auth to URL if provided
      let cloneUrl = args.url;
      if (args.token && args.username) {
        const urlObj = new URL(args.url);
        urlObj.username = args.username;
        urlObj.password = args.token;
        cloneUrl = urlObj.toString();
      } else if (args.token) {
        // GitHub PAT format
        const urlObj = new URL(args.url);
        urlObj.username = args.token;
        cloneUrl = urlObj.toString();
      }
      
      cloneCmd += ` "${cloneUrl}" "${targetPath}"`;
      
      console.log(`[DAYTONA] Git clone: ${args.url} -> ${targetPath} (depth=${depth}, branch=${args.branch || 'default'})`);
      
      // Execute via command for reliability
      return await withRetry(async () => {
        const daytona = getDaytona();
        const sandbox = await daytona.get(args.sandboxId);
        
        const result = await sandbox.process.executeCommand(
          cloneCmd,
          "/home/daytona",
          undefined,
          300 // 5 minute timeout for large repos
        );
        
        if (result.exitCode !== 0) {
          throw new Error(`Git clone failed: ${result.result || 'Unknown error'}`);
        }
        
        return { 
          success: true, 
          message: `Cloned ${args.url} to ${targetPath}`,
          depth,
          branch: args.branch || 'default'
        };
      }, "gitClone");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Read file using exec-based approach (more reliable than SDK file ops)
 * Uses `cat` command for text files
 */
export const readFileNode = action({
  args: {
    sandboxId: v.string(),
    path: v.string(),
  },
  handler: async (_, args) => {
    try {
      await waitUntilReady(args.sandboxId);
      
      return await withRetry(async () => {
        const daytona = getDaytona();
        const sandbox = await daytona.get(args.sandboxId);
        
        // Use cat for reliable file reading
        const result = await sandbox.process.executeCommand(
          `cat "${args.path}"`,
          "/home/daytona",
          undefined,
          30
        );
        
        if (result.exitCode !== 0) {
          throw new Error(`Failed to read file: ${result.result || 'File not found'}`);
        }
        
        return { success: true, content: result.result || "" };
      }, "readFile");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Write file using exec-based approach (more reliable than SDK file ops)
 * Uses heredoc for content, creates parent dirs if needed
 */
export const writeFileNode = action({
  args: {
    sandboxId: v.string(),
    path: v.string(),
    content: v.string(),
  },
  handler: async (_, args) => {
    try {
      await waitUntilReady(args.sandboxId);
      
      return await withRetry(async () => {
        const daytona = getDaytona();
        const sandbox = await daytona.get(args.sandboxId);
        
        // Ensure parent directory exists and write file
        // Use base64 encoding to handle special characters safely
        const base64Content = Buffer.from(args.content).toString('base64');
        const cmd = `mkdir -p "$(dirname "${args.path}")" && echo "${base64Content}" | base64 -d > "${args.path}"`;
        
        const result = await sandbox.process.executeCommand(
          cmd,
          "/home/daytona",
          undefined,
          30
        );
        
        if (result.exitCode !== 0) {
          throw new Error(`Failed to write file: ${result.result || 'Unknown error'}`);
        }
        
        return { success: true, message: `File written to ${args.path}` };
      }, "writeFile");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * List files using exec-based approach (more reliable than SDK file ops)
 * Uses `ls -la` for detailed listing
 */
export const listFilesNode = action({
  args: {
    sandboxId: v.string(),
    path: v.optional(v.string()),
  },
  handler: async (_, args) => {
    try {
      await waitUntilReady(args.sandboxId);
      
      return await withRetry(async () => {
        const daytona = getDaytona();
        const sandbox = await daytona.get(args.sandboxId);
        
        const targetPath = args.path || "/home/daytona";
        
        // Use ls -la for detailed file listing, parse into structured output
        const result = await sandbox.process.executeCommand(
          `ls -la "${targetPath}" 2>/dev/null || echo "Directory not found"`,
          "/home/daytona",
          undefined,
          30
        );
        
        if (result.exitCode !== 0 || result.result?.includes("Directory not found")) {
          throw new Error(`Failed to list files: Directory not found or inaccessible`);
        }
        
        // Parse ls output into structured format
        const lines = (result.result || "").split('\n').filter(l => l.trim());
        const files = lines.slice(1).map(line => {
          const parts = line.split(/\s+/);
          if (parts.length >= 9) {
            const permissions = parts[0] || "";
            const sizeStr = parts[4] || "0";
            const month = parts[5] || "";
            const day = parts[6] || "";
            const time = parts[7] || "";
            const name = parts.slice(8).join(' ');
            return {
              permissions,
              size: parseInt(sizeStr, 10) || 0,
              modified: `${month} ${day} ${time}`,
              name,
              isDirectory: permissions.startsWith('d'),
            };
          }
          return { name: line, isDirectory: false, size: 0, permissions: "", modified: "" };
        }).filter(f => f.name && f.name !== '.' && f.name !== '..');
        
        return { success: true, files, path: targetPath };
      }, "listFiles");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// ============================================
// COMPUTER USE ACTIONS (with readiness gate + retry)
// ============================================

/**
 * Take screenshot using SDK (Computer Use)
 */
export const takeScreenshotNode = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (_, args) => {
    try {
      await waitUntilReady(args.sandboxId);
      
      return await withRetry(async () => {
        const daytona = getDaytona();
        const sandbox = await daytona.get(args.sandboxId);
        
        // Computer use screenshot - access as property or method based on SDK version
        const screenshot = await (sandbox.computerUse.screenshot as unknown as () => Promise<string>)();
        
        return { success: true, screenshot };
      }, "takeScreenshot");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Mouse click using SDK (Computer Use)
 */
export const mouseClickNode = action({
  args: {
    sandboxId: v.string(),
    x: v.number(),
    y: v.number(),
    button: v.optional(v.union(v.literal("left"), v.literal("right"), v.literal("middle"))),
  },
  handler: async (_, args) => {
    try {
      await waitUntilReady(args.sandboxId);
      
      return await withRetry(async () => {
        const daytona = getDaytona();
        const sandbox = await daytona.get(args.sandboxId);
        
        await sandbox.computerUse.mouse.click(args.x, args.y);
        
        return { success: true, x: args.x, y: args.y };
      }, "mouseClick");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Keyboard type using SDK (Computer Use)
 */
export const keyboardTypeNode = action({
  args: {
    sandboxId: v.string(),
    text: v.string(),
  },
  handler: async (_, args) => {
    try {
      await waitUntilReady(args.sandboxId);
      
      return await withRetry(async () => {
        const daytona = getDaytona();
        const sandbox = await daytona.get(args.sandboxId);
        
        await sandbox.computerUse.keyboard.type(args.text);
        
        return { success: true, text: args.text };
      }, "keyboardType");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Delete file using exec-based approach
 */
export const deleteFileNode = action({
  args: {
    sandboxId: v.string(),
    path: v.string(),
  },
  handler: async (_, args) => {
    try {
      await waitUntilReady(args.sandboxId);
      
      return await withRetry(async () => {
        const daytona = getDaytona();
        const sandbox = await daytona.get(args.sandboxId);
        
        const result = await sandbox.process.executeCommand(
          `rm -f "${args.path}"`,
          "/home/daytona",
          undefined,
          30
        );
        
        return { 
          success: true, 
          message: `Deleted ${args.path}`,
          exitCode: result.exitCode 
        };
      }, "deleteFile");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
