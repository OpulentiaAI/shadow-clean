import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Daytona Runner Ingest Endpoint
 * 
 * Accepts terminal output from the Daytona Runner service and writes
 * to the existing terminalOutput table. This keeps the UI subscription
 * model identical - the frontend doesn't know if output came from
 * workspace sidecar or Daytona Runner.
 * 
 * Security: Requires CONVEX_INGEST_SECRET header for authentication
 */

interface IngestPayload {
  taskId: string;
  sessionId: string;
  sandboxId: string;
  stream: "stdout" | "stderr" | "meta";
  data: string;
  ts: number;
  done?: boolean;
  exitCode?: number;
  error?: string;
}

/**
 * HTTP endpoint for Daytona Runner to push terminal output
 * POST /daytona-ingest
 */
export const ingest = httpAction(async (ctx, request) => {
  // Verify feature flag is enabled
  const enableDaytona = process.env.ENABLE_DAYTONA_TERMINAL === "true";
  if (!enableDaytona) {
    return new Response(
      JSON.stringify({ error: "Daytona terminal is disabled" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify ingest secret
  const ingestSecret = process.env.CONVEX_INGEST_SECRET;
  const providedSecret = request.headers.get("x-ingest-secret");

  if (!ingestSecret || providedSecret !== ingestSecret) {
    console.error("[DAYTONA_INGEST] Unauthorized request - invalid or missing secret");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse request body
  let payload: IngestPayload;
  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate required fields
  if (!payload.taskId || !payload.sessionId || !payload.stream || payload.data === undefined) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: taskId, sessionId, stream, data" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const taskId = payload.taskId as Id<"tasks">;
    const commandId = payload.sessionId; // Use sessionId as commandId for grouping
    const timestamp = payload.ts || Date.now();

    // Map stream type to terminalOutput streamType
    const streamType = payload.stream === "stderr" ? "stderr" : "stdout";

    // Handle meta stream (system messages, completion, errors)
    if (payload.stream === "meta") {
      if (payload.done) {
        // Command completed - write completion message
        const completionMsg = payload.error 
          ? `\n[ERROR] ${payload.error}`
          : `\n[DONE] Exit code: ${payload.exitCode ?? 0}`;
        
        await ctx.runMutation(api.terminalOutput.append, {
          taskId,
          commandId,
          content: completionMsg,
          streamType: "stdout",
          timestamp,
        });

        // Update sandbox activity
        await ctx.runMutation(api.daytona.updateActivity, { taskId });
      }
    } else {
      // Regular stdout/stderr output - write to terminalOutput
      if (payload.data) {
        await ctx.runMutation(api.terminalOutput.append, {
          taskId,
          commandId,
          content: payload.data,
          streamType,
          timestamp,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, timestamp }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[DAYTONA_INGEST] Error processing payload:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Health check endpoint for Daytona Runner
 * GET /daytona-ingest/health
 */
export const health = httpAction(async () => {
  const enableDaytona = process.env.ENABLE_DAYTONA_TERMINAL === "true";
  
  return new Response(
    JSON.stringify({ 
      status: "ok", 
      daytonaEnabled: enableDaytona,
      timestamp: Date.now() 
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
