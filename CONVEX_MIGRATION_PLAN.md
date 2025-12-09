# Convex Migration Plan - PostgreSQL to Convex

**Date:** 2025-12-08
**Goal:** Migrate Shadow platform from PostgreSQL to Convex as primary database
**Status:** 🚧 Planning Phase

## Executive Summary

This document outlines the comprehensive migration strategy to move from PostgreSQL (via Prisma) to Convex as the primary database. This will achieve full system cohesion with a single source of truth for all data.

## Current State Analysis

### What's in PostgreSQL (via Prisma)

**Primary Data Models:**
- `User` - Authentication, profile, settings
- `Task` - Core task entity with initialization state
- `ChatMessage` - Message history and metadata
- `Todo` - Task management items
- `Memory` - Repository-specific knowledge
- `Session` - Auth sessions
- `Account` - OAuth accounts (GitHub)
- `Verification` - Email verification tokens
- `TaskSession` - VM/pod session info (remote mode)
- `UserSettings` - User preferences
- `CodebaseUnderstanding` - Shadow Wiki content
- `PullRequestSnapshot` - PR metadata
- `RepositoryIndex` - Indexing state

**Critical Prisma Usage Locations:**
- `apps/server/src/app.ts` - Main API routes (29 Prisma calls)
- `apps/server/src/socket.ts` - WebSocket handlers
- `apps/server/src/agent/chat.ts` - Message creation
- `apps/server/src/utils/task-status.ts` - Status updates
- `apps/server/src/services/*` - All service layer
- `apps/frontend/lib/actions/create-task.ts` - Server action

### What's in Convex

**Schema Defined:**
- All same models as Prisma (schema.ts)
- Mutations and queries already defined
- Actions for backend communication

**Current Usage:**
- Frontend real-time queries
- Live updates and subscriptions
- NOT used for primary data operations

## Migration Strategy

### Phase 1: Setup Convex in Backend ✅ Ready

**Tasks:**
1. Install `convex` package in backend
2. Create Convex HTTP client singleton
3. Set up environment variables
4. Create backend-convex integration layer

**Files to Create:**
- `apps/server/src/lib/convex-client.ts` - Singleton client
- `apps/server/src/lib/convex-operations.ts` - Wrapper functions
- `apps/server/src/types/convex.ts` - Type imports

### Phase 2: Task & Message Operations 🎯 Priority

**Critical Path Operations:**

**A. Task Operations**
- `createTask()` - Task creation
- `updateTask()` - Status updates
- `getTask()` - Task retrieval
- `listTasks()` - User's tasks
- `deleteTask()` - Task removal

**B. Message Operations**
- `appendMessage()` - Add message
- `updateMessage()` - Edit message
- `listMessages()` - Get history

**C. Todo Operations**
- `createTodo()` - Add todo
- `updateTodo()` - Update status
- `listTodos()` - Get task todos
- `bulkCreateTodos()` - Batch insert

**Migration Order:**
1. Task creation flow (`apps/frontend/lib/actions/create-task.ts`)
2. Task status updates (`apps/server/src/utils/task-status.ts`)
3. Message operations (`apps/server/src/agent/chat.ts`)
4. Socket handlers (`apps/server/src/socket.ts`)

### Phase 3: User & Authentication 🔐 Secondary

**Models:**
- User
- Session
- Account
- Verification

**Considerations:**
- Better Auth integration
- GitHub OAuth tokens
- Session management
- Token refresh logic

**Files Affected:**
- `apps/server/src/github/auth/*`
- `apps/frontend/lib/auth/*`

### Phase 4: Service Layer 📦 Gradual

**Services to Migrate:**
- Memory service
- PR manager
- Task cleanup
- Model context service
- Checkpoint service

### Phase 5: Testing & Validation ✅ Critical

**Test Coverage:**
- Unit tests for Convex operations
- Integration tests for task flow
- E2E tests for UI flow
- Performance benchmarks
- Data consistency checks

## Implementation Plan

### Step 1: Install Convex in Backend

```bash
cd apps/server
npm install convex
```

### Step 2: Create Convex Client Singleton

**File:** `apps/server/src/lib/convex-client.ts`

```typescript
import { ConvexHttpClient } from "convex/browser";

let convexClient: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("CONVEX_URL not configured");
    }
    convexClient = new ConvexHttpClient(convexUrl);
  }
  return convexClient;
}
```

### Step 3: Create Operation Wrappers

**File:** `apps/server/src/lib/convex-operations.ts`

```typescript
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getConvexClient } from "./convex-client";

// Task Operations
export async function createTask(input: {
  title: string;
  repoFullName: string;
  repoUrl: string;
  userId: Id<"users">;
  isScratchpad?: boolean;
  baseBranch?: string;
  baseCommitSha?: string;
  shadowBranch?: string;
  mainModel?: string;
  githubIssueId?: string;
}) {
  const client = getConvexClient();
  return client.mutation(api.tasks.create, input);
}

export async function updateTask(input: {
  taskId: Id<"tasks">;
  status?: string;
  initStatus?: string;
  // ... other fields
}) {
  const client = getConvexClient();
  return client.mutation(api.tasks.update, input);
}

// Message Operations
export async function appendMessage(input: {
  taskId: Id<"tasks">;
  role: string;
  content: string;
  llmModel?: string;
  // ... other fields
}) {
  const client = getConvexClient();
  return client.mutation(api.messages.append, input);
}

// ... more operations
```

### Step 4: Update Frontend Server Action

**File:** `apps/frontend/lib/actions/create-task.ts`

**Change:** Replace Prisma with Convex client

```typescript
// OLD (Prisma):
task = await prisma.task.create({
  data: { ... }
});

// NEW (Convex):
import { createTask as createConvexTask } from "@/lib/convex/actions";
const { taskId } = await createConvexTask({
  title,
  repoFullName,
  repoUrl,
  userId,
  isScratchpad,
  baseBranch,
  shadowBranch,
  mainModel,
  githubIssueId,
});
```

### Step 5: Update Backend Task Status

**File:** `apps/server/src/utils/task-status.ts`

**Replace all `prisma.task.update()` calls with Convex:**

```typescript
import { updateTask } from "../lib/convex-operations";

export async function setInitStatus(taskId: string, initStatus: InitStatus) {
  await updateTask({
    taskId: taskId as Id<"tasks">,
    initStatus,
  });
}
```

### Step 6: Update Socket Handlers

**File:** `apps/server/src/socket.ts`

**Replace Prisma task queries:**

```typescript
// OLD:
const task = await prisma.task.findUnique({ where: { id: taskId } });

// NEW:
import { getTask } from "./lib/convex-operations";
const task = await getTask(taskId as Id<"tasks">);
```

### Step 7: Update Chat Service

**File:** `apps/server/src/agent/chat.ts`

**Replace message creation:**

```typescript
// OLD:
await prisma.chatMessage.create({ ... });

// NEW:
await appendMessage({ ... });
```

## Environment Variables

**Backend (.env):**
```bash
# Add to apps/server/.env
CONVEX_URL=https://fiery-iguana-603.convex.cloud  # From frontend config
```

**Note:** Reuse the same Convex deployment URL as the frontend.

## Data Migration

### One-Time Data Transfer (if needed)

If there's existing production data in PostgreSQL:

```typescript
// Migration script: scripts/migrate-postgres-to-convex.ts
import { prisma } from "@repo/db";
import { getConvexClient } from "../apps/server/src/lib/convex-client";
import { api } from "../convex/_generated/api";

async function migrateData() {
  const client = getConvexClient();

  // 1. Migrate Users
  const users = await prisma.user.findMany();
  for (const user of users) {
    await client.mutation(api.auth.upsertUser, {
      externalId: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified,
    });
  }

  // 2. Migrate Tasks
  const tasks = await prisma.task.findMany();
  for (const task of tasks) {
    await client.mutation(api.tasks.create, {
      title: task.title,
      repoFullName: task.repoFullName,
      repoUrl: task.repoUrl,
      userId: task.userId,
      // ... map all fields
    });
  }

  // 3. Migrate Messages, Todos, etc.
  // ...
}
```

## Rollback Strategy

**In case of issues:**

1. Keep Prisma code in place during migration
2. Use feature flags to switch between Prisma/Convex
3. Implement dual-write initially (write to both)
4. Verify data consistency before full cutover

**Feature Flag Example:**

```typescript
const USE_CONVEX = process.env.USE_CONVEX === "true";

async function createTask(data) {
  if (USE_CONVEX) {
    return createConvexTask(data);
  } else {
    return prisma.task.create({ data });
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// tests/convex-operations.test.ts
describe("Convex Operations", () => {
  it("should create task", async () => {
    const { taskId } = await createTask({
      title: "Test Task",
      repoFullName: "test/repo",
      repoUrl: "https://github.com/test/repo",
      userId: "test-user" as Id<"users">,
    });
    expect(taskId).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// tests/task-flow.test.ts
describe("Task Initialization Flow", () => {
  it("should complete full initialization", async () => {
    // 1. Create task
    const { taskId } = await createTask(...);

    // 2. Initiate backend
    const response = await fetch(`/api/tasks/${taskId}/initiate`, ...);

    // 3. Verify workspace created
    // 4. Verify status updates
    // 5. Verify message processed
  });
});
```

### E2E Tests

```typescript
// tests/e2e/task-creation.spec.ts
test("user can create and initialize task", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await page.click('[data-testid="new-task"]');
  await page.fill('[data-testid="message-input"]', "Test message");
  await page.click('[data-testid="submit"]');

  // Wait for initialization
  await page.waitForSelector('[data-testid="task-active"]');

  // Verify workspace created via backend
  const workspace = await checkWorkspace(taskId);
  expect(workspace.exists).toBe(true);
});
```

## Performance Considerations

### Convex Advantages

✅ **Real-time by default** - No polling needed
✅ **Optimistic updates** - Better UX
✅ **Automatic caching** - Faster reads
✅ **Reactive queries** - Live data updates
✅ **Built-in pagination** - Efficient large datasets

### Potential Concerns

⚠️ **Query complexity** - Convex has different query patterns than SQL
⚠️ **Data size limits** - Document size limits (1MB per doc)
⚠️ **Migration overhead** - Initial data transfer time
⚠️ **Function limits** - 16MB function bundle size

### Mitigation

- Use indexes effectively
- Implement cursor-based pagination
- Split large documents into chunks
- Monitor function performance

## Success Criteria

**Migration Complete When:**

✅ All Prisma imports removed from critical path
✅ Task creation uses Convex
✅ Message operations use Convex
✅ Real-time updates working
✅ All tests passing
✅ Performance benchmarks met
✅ Zero data loss during migration
✅ Rollback plan tested

## Timeline Estimate

**Aggressive (1-2 days):**
- Day 1: Setup + Task/Message operations
- Day 2: Testing + remaining services

**Conservative (3-5 days):**
- Day 1: Setup + infrastructure
- Day 2: Task & Message migration
- Day 3: User & Auth migration
- Day 4: Service layer migration
- Day 5: Testing & validation

**Recommended:** Start with aggressive, extend if needed.

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data loss | HIGH | LOW | Dual-write, backups |
| Performance degradation | MEDIUM | MEDIUM | Benchmarks, rollback |
| Auth issues | HIGH | LOW | Keep Prisma auth initially |
| Breaking changes | HIGH | LOW | Feature flags, gradual rollout |

## Next Steps

**Immediate Actions:**

1. ✅ Review and approve this plan
2. 🔄 Install Convex in backend (`npm install convex`)
3. 🔄 Create Convex client singleton
4. 🔄 Implement task operations wrapper
5. 🔄 Update frontend server action
6. 🔄 Test task creation flow
7. 🔄 Migrate remaining operations
8. 🔄 Remove Prisma dependencies

**Go/No-Go Decision Points:**

- After Step 3: Verify Convex client works
- After Step 6: Verify task creation works end-to-end
- After Step 7: Verify message operations work
- Final: All tests passing, ready for production

---

**Created by:** Claude Sonnet 4.5
**Status:** 🚀 Ready for Implementation
**Approval Required:** Yes - Review before proceeding
