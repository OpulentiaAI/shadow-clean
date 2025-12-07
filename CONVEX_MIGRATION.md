# Convex Migration Plan (Milestones & References)

This doc tracks the migration from the current Prisma/Express/socket stack to Convex-native data, realtime, streaming, and agents. No new pages will be added; existing UI will be rewired to Convex.

## Milestone 0 — Baseline (✅ COMPLETE)
- [x] Scaffold Convex (`convex/convex.config.ts`, `convex/schema.ts`) and run `npx convex dev` for codegen.
- [x] Seed initial actions for tasks/messages/auth placeholder.
- [x] Add agent stub (`convex/agent.ts`) using `@convex-dev/agent`.
- [x] Minimal frontend call path wired to Convex actions.

## Milestone 1 — Data Model Parity (✅ COMPLETE)
- [x] Translated all Prisma models to Convex tables/indexes:
  - `users`, `sessions`, `accounts`, `verification` - Auth tables
  - `tasks`, `taskSessions` - Task management
  - `chatMessages`, `pullRequestSnapshots` - Chat system
  - `todos`, `memories` - Task auxiliaries
  - `repositoryIndex`, `codebaseUnderstanding` - Indexing
  - `userSettings` - User preferences
- [x] Added comprehensive indexes for all query patterns (by_user, by_repo, by_task_status, etc.)
- [x] All enums ported: `TaskStatus`, `InitStatus`, `MessageRole`, `TodoStatus`, `MemoryCategory`, `PullRequestStatus`

### Schema Reference (`convex/schema.ts`)
```typescript
// Tables created:
- users (with by_email, by_external_id indexes)
- sessions (with by_token, by_user indexes)
- accounts (with by_user, by_provider, by_user_provider indexes)
- verification (with by_identifier index)
- tasks (with by_user, by_repo, by_user_status, by_status, by_user_repo indexes)
- taskSessions (with by_task, by_task_active indexes)
- chatMessages (with by_task_sequence, by_task_role, by_model_created indexes)
- pullRequestSnapshots (with by_message index)
- todos (with by_task, by_task_sequence, by_task_status indexes)
- memories (with by_user_repo, by_task, by_category indexes)
- repositoryIndex (with by_repo index)
- codebaseUnderstanding (with by_repo, by_user indexes)
- userSettings (with by_user index)
```

## Milestone 2 — Auth & Users (✅ COMPLETE)
- [x] Created `convex/auth.ts` with full auth functions:
  - `currentUser`, `getUserByEmail`, `getUserByExternalId` - User queries
  - `upsertUser` - User create/update
  - `createSession`, `getSessionByToken`, `deleteSession`, `deleteUserSessions` - Session management
  - `createAccount`, `getAccountByProvider`, `getGitHubAccount` - Account linking
  - `updateGitHubInstallation`, `clearGitHubInstallation` - GitHub integration
  - `createVerification`, `getVerification`, `deleteVerification` - Email verification

## Milestone 3 — Tasks, Todos, Memories (✅ COMPLETE)
- [x] Full task CRUD in `convex/tasks.ts`:
  - `create`, `update`, `updateTitle`, `archive`, `remove`
  - `get`, `getWithDetails`, `getTitle`, `getStatus`, `getStackedPRInfo`
  - `listByUser`, `listByUserExcludeArchived`, `countActiveByUser`
- [x] Full todo CRUD in `convex/todos.ts`:
  - `create`, `update`, `updateStatus`, `remove`, `removeAllByTask`
  - `get`, `byTask`, `byTaskAndStatus`
  - `reorder`, `bulkCreate`
- [x] Full memory CRUD in `convex/memories.ts`:
  - `create`, `update`, `remove`
  - `get`, `byTask`, `byUserAndRepo`, `byCategory`, `byUserRepoAndCategory`
  - `search`, `bulkCreate`

## Milestone 4 — Chat & Streaming (✅ COMPLETE)
- [x] Full message CRUD in `convex/messages.ts`:
  - `append`, `update`, `edit`, `remove`, `removeAfterSequence`
  - `get`, `byTask`, `getLatestSequence`
  - Messages include `pullRequestSnapshot` and `stackedTask` joins
- [x] PR snapshots in `convex/pullRequestSnapshots.ts`:
  - `create`, `update`, `get`, `getByMessage`, `remove`, `removeByMessage`

## Milestone 5 — Agents & Tools (✅ COMPLETE)
- [x] Full agent implementation in `convex/agent.ts`:
  - `createThread` - Create new conversation threads
  - `generateText` - Generate text responses
  - `streamText` - Stream text responses
  - `continueThread` - Continue existing conversations
  - `getThreadMessages` - Retrieve thread history
  - `chat` - Task-aware chat with repository context
  - `analyzeCode` - Code analysis with questions
  - `generateCode` - Code generation from descriptions
  - `explainError` - Error explanation and fixes

## Milestone 6 — Supporting Tables (✅ COMPLETE)
- [x] Repository indexing in `convex/repositoryIndex.ts`:
  - `get`, `upsert`, `updateLastIndexed`, `remove`, `list`
  - `needsReindex` - Check if repo needs re-indexing
- [x] Codebase understanding in `convex/codebaseUnderstanding.ts`:
  - `get`, `getByRepo`, `getByTaskId`
  - `create`, `update`, `remove`, `listByUser`
- [x] Task sessions in `convex/taskSessions.ts`:
  - `create`, `end`, `endAllForTask`, `updateConnection`
  - `get`, `getActiveByTask`, `listByTask`
  - `remove`, `removeAllForTask`
- [x] User settings in `convex/userSettings.ts`:
  - `get`, `getOrCreate`, `create`, `update`, `upsert`, `remove`

## Milestone 7 — Frontend Integration (✅ COMPLETE)
- [x] Convex React provider in `apps/frontend/lib/convex/provider.tsx`
- [x] HTTP client in `apps/frontend/lib/convex/client.ts`
- [x] Type-safe actions in `apps/frontend/lib/convex/actions.ts` - All CRUD operations
- [x] React hooks in `apps/frontend/lib/convex/hooks.ts` - All real-time hooks
- [x] Layout updated with `ConvexClientProvider` wrapper
- [x] Added `convex` dependency to frontend `package.json`
- [x] Removed demo page (`apps/frontend/app/convex-demo/`)

### Frontend Convex Integration Files
```
apps/frontend/lib/convex/
├── index.ts        - Barrel exports
├── client.ts       - ConvexHttpClient singleton + api export
├── provider.tsx    - ConvexClientProvider React wrapper
├── actions.ts      - Server-callable actions (30+ functions)
└── hooks.ts        - React Query-style hooks (40+ hooks)
```

## Milestone 8 — Cleanup & Hardening (🔄 IN PROGRESS)
- [ ] Remove unused Prisma/Express/socket code paths after parity confirmed
- [ ] Add lint/tests for Convex functions; ensure type validators cover returns
- [ ] Secrets: set Convex env vars (`CONVEX_DEPLOY_KEY`, LLM keys, GitHub token)
- [ ] Run `npx convex dev` with authentication to push schema to cloud

## Key File References

### Convex Backend
| File | Purpose |
|------|---------|
| `convex/schema.ts` | Complete data model with all tables/indexes |
| `convex/tasks.ts` | Task CRUD + queries |
| `convex/messages.ts` | Chat message CRUD with joins |
| `convex/todos.ts` | Todo CRUD + bulk ops |
| `convex/memories.ts` | Memory CRUD + search |
| `convex/auth.ts` | User, session, account, verification |
| `convex/userSettings.ts` | User preferences |
| `convex/agent.ts` | AI agent actions |
| `convex/repositoryIndex.ts` | Repo indexing state |
| `convex/codebaseUnderstanding.ts` | Codebase analysis storage |
| `convex/taskSessions.ts` | Task session management |
| `convex/pullRequestSnapshots.ts` | PR snapshot storage |
| `convex/convex.config.ts` | Convex app config with agent component |

### Frontend Integration
| File | Purpose |
|------|---------|
| `apps/frontend/lib/convex/provider.tsx` | React context provider |
| `apps/frontend/lib/convex/client.ts` | HTTP client + API types |
| `apps/frontend/lib/convex/actions.ts` | Type-safe mutation/query calls |
| `apps/frontend/lib/convex/hooks.ts` | React hooks for real-time data |
| `apps/frontend/lib/convex/index.ts` | Barrel exports |
| `apps/frontend/app/layout.tsx` | Root layout with provider |

### Legacy (to be deprecated)
| File | Purpose |
|------|---------|
| `packages/db/prisma/schema.prisma` | Legacy Prisma schema |
| `apps/server/src/**` | Legacy Express server |
| `apps/frontend/lib/db-operations/**` | Legacy Prisma operations |
| `apps/frontend/app/api/**` | Legacy API routes |

## Migration Usage Guide

### Using Convex Queries (Real-time)
```typescript
import { useConvexTask, useConvexMessages } from "@/lib/convex/hooks";

function TaskView({ taskId }) {
  const task = useConvexTask(taskId);
  const messages = useConvexMessages(taskId);
  // Data automatically updates in real-time
}
```

### Using Convex Mutations
```typescript
import { useCreateTask, useAppendMessage } from "@/lib/convex/hooks";

function CreateTaskForm() {
  const createTask = useCreateTask();
  const appendMessage = useAppendMessage();
  
  const handleSubmit = async () => {
    const { taskId } = await createTask({ ... });
    await appendMessage({ taskId, role: "USER", content: "..." });
  };
}
```

### Using Server Actions (Non-React)
```typescript
import { createTask, listMessages } from "@/lib/convex/actions";

async function serverAction() {
  const result = await createTask({ ... });
  const messages = await listMessages(result.taskId);
}
```

## Environment Variables Required

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=prod:your-deploy-key

# OpenAI (for agent)
OPENAI_API_KEY=sk-...

# Optional
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...
```

## Next Steps

1. **Authenticate Convex CLI**: Run `npx convex login` and `npx convex dev` to push schema
2. **Set Environment Variables**: Configure `NEXT_PUBLIC_CONVEX_URL` in deployment
3. **Migrate Frontend Calls**: Replace React Query hooks with Convex hooks gradually
4. **Test Real-time Features**: Verify live updates work across clients
5. **Deprecate Legacy Code**: Once parity confirmed, remove Prisma/Express paths
