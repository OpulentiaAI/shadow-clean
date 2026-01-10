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
- **Available NVIDIA NIM Models** (via NVIDIA Build):
  - `nim:moonshotai/kimi-k2-thinking` - Kimi K2 Thinking (reasoning model, free credits)
  - `nim:deepseek-ai/deepseek-v3.2` - DeepSeek V3.2 (reasoning model, free credits)
  - Requires `NVIDIA_API_KEY` in Convex env or client-provided via settings
- **Available Fireworks Models** (via Fireworks AI):
   - `accounts/fireworks/models/llama-v3p1-405b-instruct` - Llama 3.1 405B
   - `accounts/fireworks/models/deepseek-v3` - DeepSeek V3
   - Custom fine-tuned models accessible via Fireworks account
   - Requires `FIREWORKS_API_KEY` in Convex env or client-provided via settings

## Reasoning Deltas (Streaming Reasoning)

Real-time AI reasoning is now supported for models that emit reasoning streams:

### Supported Models
- **DeepSeek R1/V3**: Full reasoning capability via OpenRouter
- **Kimi K2-Thinking**: NVIDIA NIM reasoning model
- **Claude with Extended Thinking**: OpenRouter variant
- **Grok 3**: Extended reasoning (when available)

### Implementation Flow
1. **Backend** (`convex/streaming.ts`):
   - Detects `reasoning-delta` and `reasoning` stream parts
   - Accumulates reasoning text via `accumulatedReasoning` variable
   - Emits via `appendStreamDelta` with `parts: [{ type: "reasoning", text: "..." }]`
   - Logs: `[STREAMING] Reasoning delta received: N chars`

2. **Storage** (`convex/messages.ts`):
   - Reasoning parts stored in `message.metadata.parts` array
   - Each part tracked as: `{ type: "reasoning", text: "..." }`

3. **Frontend Rendering** (`apps/frontend/components/chat/messages/`):
   - `ReasoningComponent` auto-opens during streaming (`forceOpen` when `isLoading`)
   - Renders via `ToolComponent` with collapsible UI
   - Content displayed in faded markdown for readability
   - Auto-closes when streaming completes

### Using Reasoning Models
1. Select reasoning model (e.g., "deepseek/deepseek-r1") from dropdown
2. Send message - watch "Reasoning" component appear automatically
3. Reasoning streams in real-time as model thinks
4. Final response appears after reasoning completes

### Debugging Reasoning Streams
```bash
# Check logs for reasoning events
[STREAMING] Reasoning delta received: <chars>

# Verify message has reasoning parts
npx convex run messages.js:byTask '{"taskId":"<taskId>"}'
# Look for: metadata.parts[].type === "reasoning"

# Test with CLI
npx convex run streaming.js:streamChatWithTools '{
  "taskId":"<taskId>",
  "prompt":"What is 2+2? Show your reasoning.",
  "model":"deepseek/deepseek-r1",
  "apiKeys":{"openrouter":"<KEY>"},
  "clientMessageId":"test-001"
}'
```

### Best Practices
- Use reasoning models for complex problem-solving, math, and verification
- Monitor token usage - reasoning models use significantly more tokens
- Expect longer response times for reasoning models
- Test models in development first before production use

## Multi-Provider API Key Management

### Architecture
API keys are managed across two layers:
1. **Client-side (cookies)**: Encrypted in browser via `apps/frontend/lib/utils/client-api-keys.ts`
2. **Convex environment variables**: Fallback when client keys aren't provided

### Client-side API Key Flow
1. User enters API key in Settings → Models → API key field
2. Key is saved as encrypted cookie (e.g., `nvidia-key`, `fireworks-key`)
3. On message send, `getClientApiKeys()` reads cookies in `task-content.tsx`
4. Keys are passed to `startStreamWithTools()` via `apiKeys` parameter
5. `convex/streaming.ts` receives keys and passes to `resolveProvider()`

### Provider Resolution (in convex/streaming.ts)
```typescript
function resolveProvider({ model, apiKeys }: ProviderOptions): LanguageModel {
  // Priority 1: Fireworks (accounts/fireworks/ prefix)
  if (model.startsWith("accounts/fireworks/")) {
    const fireworksKey = apiKeys.fireworks || process.env.FIREWORKS_API_KEY;
    return createOpenAI({
      apiKey: fireworksKey,
      baseURL: "https://api.fireworks.ai/inference/v1",
    }).chat(model);
  }

  // Priority 2: NVIDIA NIM (nim: prefix)
  if (model.startsWith("nim:")) {
    const nvidiaKey = apiKeys.nvidia || process.env.NVIDIA_API_KEY;
    return createOpenAI({
      apiKey: nvidiaKey,
      baseURL: "https://integrate.api.nvidia.com/v1",
    }).chat(model.slice(4)); // Remove "nim:" prefix
  }

  // Priority 3: OpenRouter (client-provided or env)
  // Priority 4: Anthropic
  // Priority 5: OpenAI
}
```

### Setting Environment Variables in Convex
```bash
# For NVIDIA NIM
npx convex env set NVIDIA_API_KEY "nvapi-your-key-here"

# For Fireworks
npx convex env set FIREWORKS_API_KEY "fw_your-key-here"

# View all env vars
npx convex env list
```

### Debugging API Key Issues
When users report "API key not provided" errors:
1. Check browser console for `[CLIENT_API_KEYS]` logs showing what cookies were found
2. Check Convex logs for `[STREAMING] API keys present` showing what reached the action
3. If cookies are missing, verify cookies are not being blocked by browser security settings
4. If env vars are missing, set them via `npx convex env set`

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

## Convex CLI Testing Patterns

### Environment Setup

```bash
export CONVEX_DEPLOY_KEY="prod:veracious-alligator-638|<your-key>"
```

### Create/Delete Test Scratchpad Task

```bash
# Create scratchpad task (isScratchpad: true)
npx convex run api/testHelpers.js:createTestTask '{"name":"Test Task"}'
# Returns: {"taskId":"k57...","name":"Test Task"}

# Delete test task
npx convex run api/testHelpers.js:deleteTestTask '{"taskId":"<taskId>"}'
```

### Individual Tool Tests (Convex-Native for Scratchpad)

```bash
# list_dir - List files in scratchpad
npx convex run files.js:getTree '{"taskId":"<taskId>"}'

# edit_file / storeVirtualFile - Create/update file
npx convex run files.js:storeVirtualFile '{"taskId":"<taskId>","path":"app.py","content":"print(\"hello\")","isDirectory":false}'

# read_file / getContent - Read file
npx convex run files.js:getContent '{"taskId":"<taskId>","path":"app.py"}'

# grep_search support - Get all files with content
npx convex run files.js:getAllVirtualFiles '{"taskId":"<taskId>"}'

# delete_file - Delete file
npx convex run files.js:deleteVirtualFile '{"taskId":"<taskId>","path":"app.py"}'
```

### Multistep Agent Test (Full Streaming with Tools)

```bash
# Get OpenRouter API key from Convex env
npx convex env list | grep OPENROUTER

# Run streaming agent with tools
npx convex run streaming.js:streamChatWithTools '{
  "taskId":"<taskId>",
  "prompt":"List all files, read app.py, then create README.md describing it.",
  "model":"openai/gpt-4o-mini",
  "apiKeys":{"openrouter":"<OPENROUTER_API_KEY>"},
  "clientMessageId":"test-001"
}'
```

### Expected Log Output for Scratchpad Tools

```
[STREAMING] [v7] Scratchpad task - using Convex-native tool execution for list_dir
[LIST_DIR] Scratchpad task - using Convex virtualFiles
[STREAMING] [v7] Scratchpad task - using Convex-native tool execution for read_file
[READ_FILE] Scratchpad task - using Convex virtualFiles
```

### Scratchpad Tool Implementation Status

| Tool | Convex-Native | Notes |
|------|---------------|-------|
| `list_dir` | ✅ | Uses `files.getTree` |
| `read_file` | ✅ | Uses `files.getContent` |
| `edit_file` | ✅ | Uses `files.storeVirtualFile` |
| `search_replace` | ✅ | Read → replace → write virtualFiles |
| `grep_search` | ✅ | Searches `files.getAllVirtualFiles` content |
| `file_search` | ✅ | Searches virtualFiles paths |
| `delete_file` | ✅ | Uses `files.deleteVirtualFile` |
| `run_terminal_cmd` | ❌ | Returns graceful error (no terminal in scratchpad) |
| `semantic_search` | ❌ | Returns graceful error with grep_search suggestion |
| `warp_grep` | ❌ | Returns graceful error with grep_search suggestion |

## Production Test Configs (Frontend Shape Verification)

**CRITICAL**: Tool results must match frontend component expected shapes. Always verify after changes.

### Frontend Expected Data Shapes

```typescript
// list-dir.tsx expects:
{ success: boolean; contents: Array<{ name: string; isDirectory: boolean }> }

// read-file.tsx expects:
{ success: boolean; content: string; path: string }

// edit-file.tsx expects:
{ success: boolean; message: string; path: string }

// grep-search.tsx expects:
{ success: boolean; matches: Array<{ file: string; line: number; content: string }> }

// file-search.tsx expects:
{ success: boolean; files: Array<{ path: string; name: string }> }
```

### Shape Verification Test

```bash
# After ANY tool result changes, run this verification:
export CONVEX_DEPLOY_KEY="prod:veracious-alligator-638|<key>"

# 1. Create test task
TASK=$(npx convex run api/testHelpers.js:createTestTask '{"name":"Shape Test"}' | jq -r '.taskId')

# 2. Create test file
npx convex run files.js:storeVirtualFile "{\"taskId\":\"$TASK\",\"path\":\"test.py\",\"content\":\"x=1\",\"isDirectory\":false}"

# 3. Verify list_dir shape (MUST have contents + isDirectory)
npx convex run streaming.js:streamChatWithTools "{\"taskId\":\"$TASK\",\"prompt\":\"List files\",\"model\":\"openai/gpt-4o-mini\",\"apiKeys\":{\"openrouter\":\"$OPENROUTER_API_KEY\"},\"clientMessageId\":\"test\"}" 2>&1 | grep "Tool result" | grep -q '"contents".*"isDirectory"' && echo "✅ list_dir shape OK" || echo "❌ list_dir shape BROKEN"

# 4. Cleanup
npx convex run api/testHelpers.js:deleteTestTask "{\"taskId\":\"$TASK\"}"
```

### Common Shape Bugs

| Bug | Symptom | Fix |
|-----|---------|-----|
| `entries` vs `contents` | "Error listing files" in UI | Return `contents` not `entries` |
| `type` vs `isDirectory` | Files show wrong icons | Return `isDirectory: boolean` not `type: string` |
| Missing `success` field | Tool shows as failed | Always include `success: true/false` |

## Message Duplication Prevention

**CRITICAL**: Follow these patterns to prevent duplicate messages in chat.

### Root Causes
1. **Prompt appears twice in the LLM context**
   - Prompt saved to DB via `appendMessage` / `savePromptMessage`
   - `fetchConversationContext` loads that prompt again
   - Prompt is also appended to the LLM `messages` array as the current user message
   - Result: model "sees" the prompt twice → confusing/duplicative behavior
2. **Retry-safe prompt, non-idempotent assistant**
   - `savePromptMessage` is idempotent via `clientMessageId`
   - If the action is retried with the same `clientMessageId`, the prompt is reused
   - Without an idempotent "get or create assistant" step, retries can create multiple assistant messages for the same prompt

### Prevention Pattern

```typescript
// Task Creation (create-task.ts)
const clientMessageId = crypto.randomUUID();
const { messageId: promptMessageId } = await appendMessage({ taskId, role: "USER", clientMessageId, ... });
await streamChatWithTools({ taskId, prompt, promptMessageId, clientMessageId }); // Prevent duplicates + allow retries

// streamChatWithTools (streaming.ts)
// Excludes promptMessageId from conversation history
const history = await fetchConversationContext(ctx, taskId, messageId, promptMessageId);

// BP012: assistant message creation must be idempotent for retries
const assistant = await ctx.runMutation(api.messages.getOrCreateAssistantForPrompt, { taskId, promptMessageId });
```

### Follow-up Message Flow
- Frontend calls `startStreamWithTools` with `clientMessageId` (UUID for idempotency)
- `streamChatWithTools` creates prompt via `savePromptMessage` (has idempotency check)
- `streamChatWithTools` uses `getOrCreateAssistantForPrompt` to avoid duplicate assistant messages on retry

### Task Status (Avoid "Stuck Generating")
Streaming actions set `tasks.status` as the UI's coarse "generating" signal:
- Stream start: `RUNNING`
- Stream completion: `STOPPED` (allows follow-ups + restores correct keyboard shortcuts)

**Do not** set `tasks.status = RUNNING` after streaming completes (it makes follow-ups behave like a stream is still active).

### Production E2E (Idempotency + STOPPED)
`npm run e2e:prod-agent` now verifies (by default):
- `E2E_VERIFY_IDEMPOTENCY` (same `clientMessageId` reuses the same assistant message)
- `E2E_VERIFY_TASK_STOPPED` (task ends in `STOPPED`)

## Authentication (Convex Better Auth)

Authentication was migrated from Prisma/PostgreSQL (Railway) to Convex-native using `@convex-dev/better-auth`.

### Architecture

- **Better Auth Component**: Uses `@convex-dev/better-auth` package with Convex adapter
- **Two User Tables**: Better Auth stores users in `user` (singular) table; app uses `users` (plural) table for tasks/settings
- **User ID Mapping**: `getUser()` and `createTask()` both call `api.auth.upsertUser` with `externalId: authUser._id` to map Better Auth users to our `users` table

### Key Files

| File | Purpose |
|------|---------|
| `convex/convex.config.ts` | Registers `betterAuth` component |
| `convex/auth.config.ts` | Auth config with `getAuthConfigProvider()` |
| `convex/auth.ts` | `createAuth()`, `authComponent`, `getCurrentUser` query, `upsertUser` mutation |
| `convex/http.ts` | Registers Better Auth routes via `authComponent.registerRoutes()` |
| `apps/frontend/lib/auth/auth-server.ts` | `convexBetterAuthNextJs` exports: `fetchAuthQuery`, `fetchAuthMutation`, `isAuthenticated`, `getToken` |
| `apps/frontend/lib/auth/auth-client.ts` | Client auth with `convexClient()` plugin |
| `apps/frontend/lib/auth/get-user.ts` | Gets Better Auth user → upserts to `users` table → returns `users` table ID |

### Convex Environment Variables

```bash
SITE_URL=https://code.opulentia.ai
GITHUB_CLIENT_ID=<github-oauth-client-id>
GITHUB_CLIENT_SECRET=<github-oauth-client-secret>
BETTER_AUTH_SECRET=<random-secret>
```

### Frontend Environment Variables (Vercel)

```bash
NEXT_PUBLIC_CONVEX_URL=https://veracious-alligator-638.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://veracious-alligator-638.convex.site
```

### Prisma → Convex Migration Status

| Operation | Old (Prisma) | New (Convex) |
|-----------|--------------|--------------|
| Get user | `auth.api.getSession` | `fetchAuthQuery(api.auth.getCurrentUser)` → `upsertUser` |
| User settings | `prisma.userSettings.*` | `api.userSettings.get/update/getOrCreate` |
| GitHub account | `prisma.account.findFirst` | `api.auth.getGitHubAccount` |
| Task ownership | `db.task.findUnique` | `api.tasks.get` (Convex only) |
| Create task user | hardcoded ID | `fetchAuthQuery(api.auth.getCurrentUser)` → `upsertUser` |

### Critical Pattern: User ID Consistency

Both `getUser()` and `createTask()` must use the same user ID source:

```typescript
// In both files:
const authUser = await fetchAuthQuery(api.auth.getCurrentUser, {});
const usersTableId = await fetchAuthMutation(api.auth.upsertUser, {
  externalId: authUser._id,  // Better Auth user ID
  name: authUser.name,
  email: authUser.email,
  ...
});
// usersTableId is Id<"users"> - use this for tasks, settings, etc.
```

This ensures task ownership verification works (task.userId matches getUser().id).
