/**
 * Mock MCP Server for E2E Testing
 *
 * Provides controllable behavior for testing MCP connector flows:
 * - Success scenarios (tools/list, resources/list, prompts/list)
 * - Failure scenarios (timeout, malformed JSON, HTTP errors, redirects)
 * - Tool execution with controlled responses
 */

import http from "http";

export interface MockMcpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface MockMcpResource {
  name: string;
  uri: string;
  description?: string;
  mimeType?: string;
}

export interface MockMcpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

export type FailureMode =
  | "none"
  | "timeout"
  | "malformed_json"
  | "json_rpc_error"
  | "http_500"
  | "http_401"
  | "redirect"
  | "connection_refused"
  | "empty_response";

export interface MockMcpServerConfig {
  port: number;
  tools?: MockMcpTool[];
  resources?: MockMcpResource[];
  prompts?: MockMcpPrompt[];
  failureMode?: FailureMode;
  failureOnMethod?: string; // e.g., "tools/list" to fail only that method
  redirectUrl?: string;
  delayMs?: number;
  toolExecutionResults?: Record<string, unknown>;
}

export class MockMcpServer {
  private server: http.Server | null = null;
  private config: MockMcpServerConfig;
  private requestLog: Array<{ method: string; params: unknown; timestamp: Date }> = [];

  constructor(config: MockMcpServerConfig) {
    this.config = {
      tools: [],
      resources: [],
      prompts: [],
      failureMode: "none",
      delayMs: 0,
      toolExecutionResults: {},
      ...config,
    };
  }

  getRequestLog() {
    return [...this.requestLog];
  }

  clearRequestLog() {
    this.requestLog = [];
  }

  setFailureMode(mode: FailureMode, onMethod?: string) {
    this.config.failureMode = mode;
    this.config.failureOnMethod = onMethod;
  }

  setTools(tools: MockMcpTool[]) {
    this.config.tools = tools;
  }

  setToolExecutionResult(toolName: string, result: unknown) {
    if (!this.config.toolExecutionResults) {
      this.config.toolExecutionResults = {};
    }
    this.config.toolExecutionResults[toolName] = result;
  }

  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        if (req.method !== "POST") {
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            await this.handleRequest(body, res);
          } catch (error) {
            console.error("[MockMcpServer] Request handling error:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        });
      });

      this.server.on("error", reject);

      this.server.listen(this.config.port, () => {
        const url = `http://localhost:${this.config.port}`;
        console.log(`[MockMcpServer] Started on ${url}`);
        resolve(url);
      });
    });
  }

  private async handleRequest(body: string, res: http.ServerResponse) {
    // Apply delay if configured
    if (this.config.delayMs && this.config.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.delayMs));
    }

    // Parse JSON-RPC request
    let request: { jsonrpc: string; id: number; method: string; params?: unknown };
    try {
      request = JSON.parse(body);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    // Log the request
    this.requestLog.push({
      method: request.method,
      params: request.params,
      timestamp: new Date(),
    });

    // Check for method-specific failure
    const shouldFail =
      this.config.failureMode !== "none" &&
      (!this.config.failureOnMethod || this.config.failureOnMethod === request.method);

    if (shouldFail) {
      await this.applyFailure(res);
      return;
    }

    // Handle methods
    switch (request.method) {
      case "tools/list":
        this.sendSuccess(res, request.id, {
          tools: this.config.tools?.map((t) => ({
            name: t.name,
            description: t.description || "",
            inputSchema: t.inputSchema || { type: "object", properties: {} },
          })),
        });
        break;

      case "resources/list":
        this.sendSuccess(res, request.id, {
          resources: this.config.resources,
        });
        break;

      case "prompts/list":
        this.sendSuccess(res, request.id, {
          prompts: this.config.prompts,
        });
        break;

      case "tools/call":
        const toolName = (request.params as { name?: string })?.name;
        if (toolName && this.config.toolExecutionResults?.[toolName]) {
          this.sendSuccess(res, request.id, {
            content: [{ type: "text", text: JSON.stringify(this.config.toolExecutionResults[toolName]) }],
          });
        } else {
          this.sendSuccess(res, request.id, {
            content: [{ type: "text", text: "Tool executed successfully" }],
          });
        }
        break;

      default:
        this.sendError(res, request.id, -32601, "Method not found");
    }
  }

  private async applyFailure(res: http.ServerResponse) {
    switch (this.config.failureMode) {
      case "timeout":
        // Don't respond - let the client timeout
        await new Promise((resolve) => setTimeout(resolve, 15000));
        break;

      case "malformed_json":
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"jsonrpc": "2.0", "result": {not valid json');
        break;

      case "json_rpc_error":
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            error: { code: -32000, message: "Server error: Simulated failure" },
          })
        );
        break;

      case "http_500":
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
        break;

      case "http_401":
        res.writeHead(401, { "Content-Type": "text/plain" });
        res.end("Unauthorized");
        break;

      case "redirect":
        res.writeHead(302, { Location: this.config.redirectUrl || "http://evil.example.com" });
        res.end();
        break;

      case "empty_response":
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end("");
        break;

      case "connection_refused":
        res.destroy();
        break;

      default:
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Unknown failure mode");
    }
  }

  private sendSuccess(res: http.ServerResponse, id: number, result: unknown) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        result,
      })
    );
  }

  private sendError(res: http.ServerResponse, id: number, code: number, message: string) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: { code, message },
      })
    );
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log("[MockMcpServer] Stopped");
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

/**
 * Create a pre-configured mock server for testing
 */
export function createTestMcpServer(port: number = 9999): MockMcpServer {
  return new MockMcpServer({
    port,
    tools: [
      {
        name: "echo",
        description: "Echo the input back",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
      },
      {
        name: "calculator",
        description: "Perform basic math",
        inputSchema: {
          type: "object",
          properties: {
            a: { type: "number" },
            b: { type: "number" },
            operation: { type: "string", enum: ["add", "subtract", "multiply", "divide"] },
          },
          required: ["a", "b", "operation"],
        },
      },
      {
        name: "fixture_return",
        description: "Return a fixture value for testing",
        inputSchema: {
          type: "object",
          properties: {
            fixture_id: { type: "string" },
          },
        },
      },
    ],
    resources: [
      {
        name: "test-resource",
        uri: "test://resource",
        description: "A test resource",
        mimeType: "text/plain",
      },
    ],
    prompts: [
      {
        name: "test-prompt",
        description: "A test prompt",
        arguments: [
          { name: "input", description: "The input", required: true },
        ],
      },
    ],
    toolExecutionResults: {
      echo: { echoed: "test message" },
      calculator: { result: 42 },
      fixture_return: { fixture: "test_value" },
    },
  });
}
