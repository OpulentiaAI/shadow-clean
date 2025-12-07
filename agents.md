# Agent and Convex Internals

This doc captures the current agent execution flow, Convex integration, and workspace dependencies that power the real‑time terminal, shell, and file editor.

## High-level flow
- **Frontend (Next.js, app router)**: Tasks page fetches task/todos/messages directly from Postgres (via `getTaskWithDetails`) and subscribes to Convex for live chat updates. Task IDs are validated as Convex IDs before any Convex calls (see `asConvexId`).
- **Backend (apps/server)**: `/api/tasks/:taskId/initiate` drives task initialization via `TaskInitializationEngine` (workspace prep, git clone, services). Status moves `INITIALIZING → ACTIVE/RUNNING`; failures set `FAILED`.
- **Convex**:
  - **Chat actions**: `agent.streamText` and `messages.startStreaming/appendStreamDelta` require a Convex task ID. If no Convex ID, calls short‑circuit in the client hooks.
  - **Task details action**: `tasks.getDetails` proxies file changes from the backend `/api/tasks/:taskId/file-changes`; returns empty when init is pending or workspace inactive.

## Chat & streaming
- Frontend `TaskPageContent` derives `convexTaskId = asConvexId(task?.id ?? taskId)`.
- `useSendMessage` appends the user message via Convex only when `convexTaskId` exists.
- `useStreamText` calls `agent.streamText` with `taskId`; Convex handler no‑ops if `taskId` is missing.
- Convex mutations:
  - `messages.startStreaming` seeds an assistant message with `isStreaming` metadata.
  - `messages.appendStreamDelta` accumulates deltas and marks final chunks.

## Workspace initialization (backend)
- Triggered synchronously right after task creation (`apps/frontend/lib/actions/create-task.ts` calls `/api/tasks/:id/initiate` immediately).
- Server (`apps/server/src/app.ts`) validates GitHub access (for non‑local repos), builds model context, then runs `TaskInitializationEngine` steps:
  - `PREPARE_WORKSPACE` (local) or `CREATE_VM`/`WAIT_VM_READY`/`VERIFY_VM_WORKSPACE` (remote)
  - `START_BACKGROUND_SERVICES`, `INSTALL_DEPENDENCIES`, `COMPLETE_SHADOW_WIKI`
- File data & diff stats: backend route `/api/tasks/:taskId/file-changes` returns workspace git changes. If status is `INITIALIZING` or workspace inactive, it returns empty so the UI renders without crashing.

## Real-time terminal, shell, file editor
- Require backend on **port 4000** and a prepared workspace path on the task.
- File tree/content routes: `/api/tasks/:taskId/files/tree` and `/content` use the workspace executor; they short‑circuit with empty/400 if the workspace is still initializing or missing.
- Socket events: server emits task status and chat history; frontend listens for room joins per task.

## Dev commands
- **Start frontend + backend together**: `npm run dev:app` (frontend on 3000, backend on 4000).
- **Standalone**: `npm run dev --filter=frontend` (apps/frontend), `npm run dev --filter=server` (apps/server).

## Notes / gotchas
- Convex calls must receive Convex-shaped IDs; otherwise, client hooks skip the request.
- If `/file-changes` fetch fails, ensure backend is running and the task workspace is initialized (status not `INITIALIZING`).
- Monaco editor is required for the agent environment; frontend dev runs with webpack (no Turbopack) to keep Monaco chunks stable.

