# Agent and Convex Internals

This doc captures the current agent execution flow, Convex integration, and workspace dependencies that power the real‑time terminal, shell, and file editor.

## High-level flow

- **Frontend (Next.js, app router)**: Uses Convex reactive queries for messages. Chat can stream via Convex actions (`streamChat`, `streamChatWithTools`) through `useConvexChatStreaming`; legacy Socket.IO path is still present while UI migration finishes. Task IDs are validated via `asConvexId`. Task creation includes automatic Convex streaming integration with background initialization and comprehensive error handling.
- **Backend (apps/server)**: `/api/tasks/:taskId/initiate` still runs `TaskInitializationEngine`. ChatService retains Socket.IO bridge for compatibility but Convex-native streaming is available. Enhanced task creation flow with multi-provider API key management (Anthropic, OpenAI, OpenRouter) resolved server-side.
- **Convex**: Agent actions live in `convex/agent.ts`; streaming lives in `convex/streaming.ts`; tools are defined in `convex/agentTools.ts`; tool-call tracking for streaming in `agentTools` table; presence/activity in `presence` and `activities`; sidecar-native telemetry in `fileChanges`, `toolLogs`, `terminalOutput`, `workspaceStatus`.

## Chat & streaming

- **Convex-native (Phase 2)**: `convex/streaming.ts` actions write streaming text and tool-call metadata directly to `chatMessages` + `agentTools`. Frontend uses `useConvexChatStreaming` (now calling `startStreamWithTools` in the task UI) with `useStreamingMessage`/`useStreamingToolCalls` for live updates.
- **Legacy Socket.IO bridge**: `convex-agent-bridge` still emits stream chunks and `tool-call-update`/`tool-call-history` events for existing UI until full migration. Socket path remains the default unless the Convex streaming flag is enabled.
- Message parts (text/tool-call/tool-result/reasoning/error) are stored in Convex; tool calls also logged to `toolCalls` (server tools) and `agentTools` (streaming tool calls).
- Streaming provider routing prefers OpenRouter first (with Anthropic/OpenAI fallbacks) and supports abortable cancellation via `cancelStream`.
- Enhanced task creation automatically triggers Convex streaming for initial messages when `NEXT_PUBLIC_USE_CONVEX_REALTIME=true` is set, with comprehensive error handling and status tracking.
- Streaming tools execute through the tool API (server route) and are tracked in `agentTools`:
  - Some OpenRouter models (notably Kimi) may emit `tool-input-*` parts without streaming args deltas; `streamChatWithTools` includes fallbacks to recover args for CLI verification and still execute tools reliably.
  - Tool call IDs can be provider-local (e.g. `read_file:0`) and are namespaced by `messageId` for safe tracking.
- **Available OpenRouter Models**: Grok Code Fast 1, Claude Opus 4.5, Kimi K2/K2-Thinking, Codestral 2508, **Devstral 2 (FREE 123B agentic coding)**, DeepSeek R1/Chat V3, Qwen3 Coder/235B.

## Workspace initialization (backend)

- Driven by `TaskInitializationEngine` (`/api/tasks/:taskId/initiate`).
- File data/diff stats remain via backend routes; Convex holds task metadata, sessions, wiki/indexing state.

## Real-time terminal, shell, file editor

- Backend port 4000, workspace path still required.
- Sidecar supports Convex-native mode when `USE_CONVEX_NATIVE=true` and `CONVEX_URL` is set: writes file changes (`fileChanges`), tool logs (`toolLogs`), terminal output (`terminalOutput`), and workspace health (`workspaceStatus`) directly to Convex. Socket.IO remains as fallback.
- Socket events: task status, chat history, tool-call updates; frontend listens per task room.

## Dev commands

- **Start frontend + backend together**: `npm run dev:app` (frontend on 3000, backend on 4000).
- **Standalone**: `npm run dev --filter=frontend` (apps/frontend), `npm run dev --filter=server` (apps/server).
- **Convex codegen**: `npx convex dev --once` or `npx convex codegen` after schema/agent changes.

### One-liner: local all-services (background)

From repo root, start frontend+server and sidecar in the background (logs to /tmp):

```bash
sh -c 'npm run dev:app > /tmp/dev-app.log 2>&1 & npm run dev --filter=sidecar > /tmp/dev-sidecar.log 2>&1 &'
```

Services:

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:4000>
- Sidecar: <http://localhost:5003> (default)

## Notes / gotchas

- Convex IDs required; `asConvexId` guards client calls.
- Enable Convex streaming on the frontend with `NEXT_PUBLIC_USE_CONVEX_REALTIME=true`; Socket.IO remains fallback. Sidecar Convex-native mode gated by `USE_CONVEX_NATIVE=true`, `CONVEX_URL`, `TASK_ID`.
- Tool calls: logged to Convex `toolCalls` (server tools) and `toolLogs` (sidecar Convex-native); streaming tool-call metadata lives in `agentTools`.
- CLI tool verification: if your task workspace isn’t present on the tool server, CLI tool runs may fail with `ENOENT`. For deterministic CLI testing, create a scratch task and set `workspacePath` to `/app` (present in the Railway tool container), then run tools against that task id.
- Known gaps to close full nativity: complete remaining chat UI migration to `useConvexChatStreaming`, and remove remaining implicit `any` types in legacy realtime hooks.
- Monaco editor required; frontend uses webpack (no Turbopack) for Monaco stability.

## Background jobs

- `convex/crons.ts` runs `cleanupStalePresence` every 2 minutes (30s heartbeats) to purge stale rows when tabs disconnect unexpectedly.
