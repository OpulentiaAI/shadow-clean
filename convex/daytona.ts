/**
 * Daytona Integration for Convex
 * Provides sandbox management, computer use, and preview functionality
 * Uses HTTP API calls (SDK requires Node.js runtime not available in Convex)
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

// Get Daytona config
const getDaytonaConfig = () => {
  const apiKey = process.env.DAYTONA_API_KEY;
  const apiUrl = process.env.DAYTONA_API_URL || "https://app.daytona.io/api";
  
  if (!apiKey) {
    throw new Error("DAYTONA_API_KEY environment variable is not set");
  }
  
  return { apiKey, apiUrl };
};

// Legacy HTTP helper for endpoints not in SDK
async function daytonaFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = process.env.DAYTONA_API_KEY;
  const apiUrl = process.env.DAYTONA_API_URL || "https://app.daytona.io/api";
  
  if (!apiKey) {
    throw new Error("DAYTONA_API_KEY environment variable is not set");
  }
  
  const url = `${apiUrl}${endpoint}`;
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  return fetch(url, { ...options, headers });
}

// Test Daytona connection
export const testConnection = action({
  args: {},
  handler: async () => {
    try {
      const { apiKey, apiUrl } = getDaytonaConfig();
      
      // Test API connectivity by listing sandboxes
      const response = await daytonaFetch("/sandbox");
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API returned ${response.status}: ${errorText}`,
          config: { apiUrl, hasApiKey: !!apiKey },
        };
      }
      
      const sandboxes = await response.json();
      
      return {
        success: true,
        message: "Daytona connection successful",
        sandboxCount: Array.isArray(sandboxes) ? sandboxes.length : 0,
        config: { apiUrl, hasApiKey: !!apiKey },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        config: { apiUrl: process.env.DAYTONA_API_URL, hasApiKey: !!process.env.DAYTONA_API_KEY },
      };
    }
  },
});

// List all sandboxes
export const listSandboxes = action({
  args: {},
  handler: async () => {
    try {
      const response = await daytonaFetch("/sandbox");
      
      if (!response.ok) {
        throw new Error(`Failed to list sandboxes: ${response.status}`);
      }
      
      const sandboxes = await response.json();
      return { success: true, sandboxes };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Create a new sandbox
export const createSandbox = action({
  args: {
    language: v.optional(v.string()),
    image: v.optional(v.string()),
    envVars: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (_, args) => {
    try {
      const response = await daytonaFetch("/sandbox", {
        method: "POST",
        body: JSON.stringify({
          language: args.language || "typescript",
          image: args.image,
          envVars: args.envVars || {},
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create sandbox: ${response.status} - ${errorText}`);
      }
      
      const sandbox = await response.json();
      return { success: true, sandbox };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Get sandbox details
export const getSandbox = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (_, args) => {
    try {
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get sandbox: ${response.status}`);
      }
      
      const sandbox = await response.json();
      return { success: true, sandbox };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Delete a sandbox
export const deleteSandbox = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (_, args) => {
    try {
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete sandbox: ${response.status}`);
      }
      
      return { success: true, message: `Sandbox ${args.sandboxId} deleted` };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Execute command in sandbox via HTTP API
export const executeCommand = action({
  args: {
    sandboxId: v.string(),
    command: v.string(),
    cwd: v.optional(v.string()),
    timeout: v.optional(v.number()),
  },
  handler: async (_, args) => {
    try {
      // Daytona toolbox API endpoint for process execution
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/toolbox/process/execute`, {
        method: "POST",
        body: JSON.stringify({
          command: args.command,
          cwd: args.cwd || "/home/daytona",
          timeout: args.timeout || 60,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to execute command: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Clone git repository in sandbox
export const gitClone = action({
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
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/toolbox/git/clone`, {
        method: "POST",
        body: JSON.stringify({
          url: args.url,
          path: args.path || "/home/daytona/workspace",
          branch: args.branch,
          username: args.username,
          password: args.token,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to clone repository: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Read file from sandbox
export const readFile = action({
  args: {
    sandboxId: v.string(),
    path: v.string(),
  },
  handler: async (_, args) => {
    try {
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/toolbox/files?path=${encodeURIComponent(args.path)}`, {
        method: "GET",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to read file: ${response.status} - ${errorText}`);
      }
      
      const content = await response.text();
      return { success: true, content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Write file to sandbox
export const writeFile = action({
  args: {
    sandboxId: v.string(),
    path: v.string(),
    content: v.string(),
  },
  handler: async (_, args) => {
    try {
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/toolbox/files?path=${encodeURIComponent(args.path)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "text/plain",
        },
        body: args.content,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to write file: ${response.status} - ${errorText}`);
      }
      
      return { success: true, message: `File written to ${args.path}` };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// List files in sandbox directory
export const listFiles = action({
  args: {
    sandboxId: v.string(),
    path: v.optional(v.string()),
  },
  handler: async (_, args) => {
    try {
      const path = args.path || "/home/daytona";
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/toolbox/files/list?path=${encodeURIComponent(path)}`, {
        method: "GET",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list files: ${response.status} - ${errorText}`);
      }
      
      const files = await response.json();
      return { success: true, files };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Take screenshot (Computer Use)
export const takeScreenshot = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (_, args) => {
    try {
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/toolbox/computer-use/screenshot`, {
        method: "GET",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to take screenshot: ${response.status}`);
      }
      
      const result = await response.json();
      return { success: true, screenshot: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Mouse click (Computer Use)
export const mouseClick = action({
  args: {
    sandboxId: v.string(),
    x: v.number(),
    y: v.number(),
    button: v.optional(v.union(v.literal("left"), v.literal("right"), v.literal("middle"))),
  },
  handler: async (_, args) => {
    try {
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/toolbox/computer-use/click`, {
        method: "POST",
        body: JSON.stringify({
          x: args.x,
          y: args.y,
          button: args.button || "left",
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to click: ${response.status} - ${errorText}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Mouse move (Computer Use)
export const mouseMove = action({
  args: {
    sandboxId: v.string(),
    x: v.number(),
    y: v.number(),
  },
  handler: async (_, args) => {
    try {
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/toolbox/computer-use/move`, {
        method: "POST",
        body: JSON.stringify({
          x: args.x,
          y: args.y,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to move mouse: ${response.status} - ${errorText}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Keyboard type (Computer Use)
export const keyboardType = action({
  args: {
    sandboxId: v.string(),
    text: v.string(),
  },
  handler: async (_, args) => {
    try {
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/toolbox/computer-use/type`, {
        method: "POST",
        body: JSON.stringify({
          text: args.text,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to type: ${response.status} - ${errorText}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Keyboard key press (Computer Use)
export const keyboardPress = action({
  args: {
    sandboxId: v.string(),
    key: v.string(),
  },
  handler: async (_, args) => {
    try {
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/toolbox/computer-use/key`, {
        method: "POST",
        body: JSON.stringify({
          key: args.key,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to press key: ${response.status} - ${errorText}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Get preview URL for sandbox
export const getPreviewUrl = action({
  args: {
    sandboxId: v.string(),
    port: v.optional(v.number()),
  },
  handler: async (_, args) => {
    const port = args.port || 3000;
    const previewUrl = `https://${port}-${args.sandboxId}.proxy.daytona.works`;
    
    return {
      success: true,
      previewUrl,
      port,
      sandboxId: args.sandboxId,
    };
  },
});

// Get terminal URL for sandbox
export const getTerminalUrl = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (_, args) => {
    const terminalUrl = `https://22222-${args.sandboxId}.proxy.daytona.works`;
    
    return {
      success: true,
      terminalUrl,
      sandboxId: args.sandboxId,
    };
  },
});
