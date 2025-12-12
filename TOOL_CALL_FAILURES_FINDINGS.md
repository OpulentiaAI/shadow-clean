# Tool Call Failures (gpt-5.2) — Findings, Fix, and Codebase Summary

## Executive summary

- **Symptom**: Some models (notably `gpt-5.2` / GPT‑5 family) intermittently emit tool calls missing required fields (e.g. `target_file`) or using alternate parameter names (e.g. `file_path`, `path`).
- **Impact**:
  - `InvalidToolArgumentsError` is raised by the AI SDK when tool-call args do not validate against the Zod schemas.
  - The tool repair loop can repeat indefinitely if the model keeps producing invalid args.
  - The UI may show missing tool-call context during streaming because it only extracts `"target_file"` from streamed argument deltas.
- **Root cause**: Strict tool parameter schemas (e.g. `ReadFileParamsSchema` requires `target_file` and `should_read_entire_file`) + inconsistent model tool-call arg naming/omissions + a repair loop with no attempt cap.
- **Fix implemented**: Server-side tool-call repair is now **robust**:
  - normalizes common arg aliases (e.g. `file_path`/`path` → `target_file`)
  - backfills required booleans (`should_read_entire_file`, `is_background`) with safe defaults
  - ensures `explanation` exists
  - caps repair retries per `toolCallId` to avoid infinite loops

---

## Codebase summary (high-level)

### Monorepo structure

- **`apps/frontend`**
  - Next.js UI.
  - Renders chat, tool calls/results, file tree, terminal, etc.
  - Consumes streaming updates via Socket.IO and assembles message “parts”.

- **`apps/server`**
  - Express API + Socket.IO server.
  - Owns task lifecycle (init → running), persistence (via Prisma), chat orchestration, tool execution, and LLM streaming.
  - Supports **local** and **remote** agent modes.

- **`apps/sidecar`**
  - Express service intended to run “next to” a remote workspace (VM/pod).
  - Provides HTTP APIs for file operations, search, command execution, and git operations.
  - In remote mode, the server’s tool executor calls this sidecar.

- **`packages/types`**
  - Shared types.
  - **Authoritative tool schemas** (Zod) for tool parameters/results.
  - Streaming chunk types shared between server and frontend.

- **`packages/db`**
  - Prisma schema and DB client.

- **`packages/command-security`**
  - Command execution validation/sanitization helpers.

### Key runtime flow: chat + tools

1. **Frontend** sends a user message to server.
2. **Server** persists the message and invokes the agent chat flow.
3. **Server LLM streaming**:
   - `apps/server/src/agent/llm/streaming/stream-processor.ts` calls `ai.streamText(...)` with tools enabled (`toolCallStreaming: true`).
   - AI SDK yields chunk types such as `text-delta`, `tool-call`, `tool-call-delta`, `tool-result`, etc.
   - `ChunkHandlers` converts these into your internal `StreamChunk` format.
4. **Tool execution**:
   - Tools are defined in `apps/server/src/agent/tools/index.ts` and wired to an executor.
   - Executor is **mode-dependent**:
     - local: `LocalToolExecutor`
     - remote: `RemoteToolExecutor` → sidecar HTTP API
5. **Frontend** receives streaming chunks (Socket.IO) and renders live parts (text, tool calls, tool results, reasoning).

---

## Findings: why tool calls fail (and why recovery looped)

### Where schemas are enforced

- Tool parameter schemas live in:
  - `packages/types/src/tools/tool-schemas.ts`
- Example:
  - `ReadFileParamsSchema` requires **`target_file`** (string) and **`should_read_entire_file`** (boolean).

### Why `InvalidToolArgumentsError` happens

Models sometimes produce tool-call args that **don’t match your canonical schema**, e.g.

- emitting `file_path` or `path` instead of `target_file`
- omitting required booleans like `should_read_entire_file` or `is_background`

Because AI SDK validates tool-call args against the Zod schema, those calls raise `InvalidToolArgumentsError`.

### Why it could loop

Your streaming setup uses `experimental_repairToolCall` to “ask the model again” when args are invalid.

- If the model **keeps repeating the same malformed tool call**, repair is retried repeatedly.
- There was no hard cap on retries per tool call.

---

## Fix implemented

### 1) Normalize common argument aliases server-side

File updated:
- `apps/server/src/agent/llm/streaming/stream-processor.ts`

Behavior added:
- Map `file_path` / `path` / `filePath` / `targetFile` → `target_file` for tools that require `target_file`.
- Map `target_file` / `path` / `filePath` → `file_path` for `search_replace`.
- Default missing required booleans:
  - `read_file.should_read_entire_file = false`
  - `run_terminal_cmd.is_background = false`
- Ensure `explanation` exists (auto-filled if missing).

Importantly:
- The repair callback now only short-circuits (returns an auto-fixed tool call without a new model request) when the normalized args are **likely valid** for that tool.

### 2) Add a per-toolCallId repair cap

- A `MAX_REPAIR_ATTEMPTS_PER_TOOL_CALL` limit prevents infinite loops.
- After the limit is exceeded, the repair function returns `null` so the error can surface instead of looping.

### 3) Tests added

File updated:
- `apps/server/src/agent/llm/streaming/stream-processor.test.ts`

New tests verify:
- **Alias normalization**: `read_file` with `file_path` is repaired locally (no extra model call).
- **Retry cap**: repeated invalid calls for the same `toolCallId` trigger at most N repair attempts.

Validation run:
- `npm -w apps/server run test:run`

---

## Recommendations (optional next hardening)

- **Frontend streaming UX**: update `apps/frontend/lib/streaming-args.ts` to extract `file_path`/`path` for file tools during tool-call streaming (UI-only quality-of-life).
- **Schema-level aliasing**: consider using Zod transforms/preprocess so `ReadFileParamsSchema` accepts `{ file_path }` and transforms to `{ target_file }`. This would avoid invoking repair in cases that are trivially mappable.
- **Telemetry**: add structured metrics for `InvalidToolArgumentsError` frequency by model + tool name to catch regressions.

---

## Files touched by this fix

- `apps/server/src/agent/llm/streaming/stream-processor.ts`
- `apps/server/src/agent/llm/streaming/stream-processor.test.ts`
