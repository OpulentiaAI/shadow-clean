/**
 * Daytona Integration for Convex
 * Provides sandbox management, computer use, and preview functionality
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

// Daytona API configuration from environment
const getDaytonaConfig = () => {
  const apiKey = process.env.DAYTONA_API_KEY;
  const apiUrl = process.env.DAYTONA_API_URL || "https://app.daytona.io/api";
  
  if (!apiKey) {
    throw new Error("DAYTONA_API_KEY environment variable is not set");
  }
  
  return { apiKey, apiUrl };
};

// Helper to make Daytona API requests
async function daytonaFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const { apiKey, apiUrl } = getDaytonaConfig();
  
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

// Execute command in sandbox
export const executeCommand = action({
  args: {
    sandboxId: v.string(),
    command: v.string(),
    cwd: v.optional(v.string()),
  },
  handler: async (_, args) => {
    try {
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/process/exec`, {
        method: "POST",
        body: JSON.stringify({
          command: args.command,
          cwd: args.cwd || "/workspace",
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

// Take screenshot (Computer Use)
export const takeScreenshot = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (_, args) => {
    try {
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/computer/screenshot`, {
        method: "POST",
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
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/computer/mouse/click`, {
        method: "POST",
        body: JSON.stringify({
          x: args.x,
          y: args.y,
          button: args.button || "left",
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to click: ${response.status}`);
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
      const response = await daytonaFetch(`/sandbox/${args.sandboxId}/computer/keyboard/type`, {
        method: "POST",
        body: JSON.stringify({
          text: args.text,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to type: ${response.status}`);
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
