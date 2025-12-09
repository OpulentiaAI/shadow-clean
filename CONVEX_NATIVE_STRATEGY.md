# Convex Native Strategy for Shadow Platform

**Date:** 2025-12-08
**Status:** 🚧 In Progress

## Architecture Analysis

### Convex Agent Reference (@convex-dev/agent)
- Agents run entirely in Convex infrastructure
- Tools are Convex functions with `createTool`
- Everything runs serverlessly in Convex
- No external Node.js orchestrator needed

### Shadow Platform Current Architecture
- **Hybrid Model**: Node.js orchestrator + Convex database
- Agent runs in `apps/server` (Node.js + Express)
- Tools execute via sidecar service for file operations
- WebSocket streaming via Socket.IO
- Convex used for real-time data and database

## Migration Approach: Convex-Native Database with Hybrid Execution

### Decision: Keep Hybrid Architecture with Convex-Primary Data

**Rationale:**
1. **Existing investment** in Node.js orchestrator with streaming
2. **File system operations** require sidecar service for security
3. **WebSocket streaming** works well with current architecture
4. **Convex as primary database** gives us real-time benefits
5. **Gradual migration** is less risky than full rewrite

### Phase 1: Convex-Native Data Layer ✅ (Completed)

**What we did:**
- ✅ Installed Convex in backend
- ✅ Created Convex client singleton (`apps/server/src/lib/convex-client.ts`)
- ✅ Created typed operation wrappers (`apps/server/src/lib/convex-operations.ts`)
- ✅ Migrated frontend server action to use Convex
- ✅ Added CONVEX_URL to backend environment

### Phase 2: Backend Agent Integration (Current Phase)

**Objectives:**
1. Update backend routes to use Convex operations
2. Fix AI SDK compatibility issues
3. Maintain Braintrust observability
4. Ensure tool execution works with Convex backend

**Files to Update:**

#### A. Task Initialization & Management
- `apps/server/src/app.ts` - Main API routes
  - Replace Prisma task queries with Convex operations
  - Fix AI SDK type issues (lines 323, 331-334)

- `apps/server/src/utils/task-status.ts` - Status updates
  - Replace all `prisma.task.update()` with `updateTask()`

- `apps/server/src/initialization/index.ts` - Workspace init
  - Use Convex for status updates during initialization

#### B. Message & Chat Operations
- `apps/server/src/agent/chat.ts` - Message creation
  - Replace `prisma.chatMessage.create()` with `appendMessage()`
  - Fix AI SDK tool call types (lines 1021, 1045)

- `apps/server/src/socket.ts` - WebSocket handlers
  - Replace Prisma task queries with `getTask()`
  - Use Convex for real-time updates

#### C. Tool System Integration
- `apps/server/src/agent/tools/index.ts` - Tool definitions
  - Fix AI SDK v4 tool type issues
  - Ensure tools work with Convex-backed tasks
  - Maintain todo/memory operations with Convex

#### D. AI SDK Version Compatibility
**Issues Found:**
- `InvalidToolArgumentsError` renamed to `InvalidArgumentError`
- `LanguageModelV1FunctionToolCall` → `LanguageModelV2FunctionTool`
- `experimental_createMCPClient` removed
- Tool definition schema changes

**Solution:** Update AI SDK imports and types to match v5 API

### Phase 3: Observability & Testing

**Braintrust Integration:**
- Maintain existing Braintrust logging
- Ensure Convex operations are traced
- Add performance monitoring for Convex calls

**Testing:**
- Verify task creation end-to-end
- Test workspace initialization
- Validate message streaming
- Confirm tool execution

### Key Architectural Decisions

#### 1. Convex as Primary Database ✅
- All data operations go through Convex
- Real-time subscriptions for UI updates
- Efficient queries with indexes
- No more PostgreSQL dependency

#### 2. Node.js Agent Orchestrator ✅
- Maintains streaming capability
- Coordinates sidecar for file ops
- Handles complex LLM interactions
- WebSocket management

#### 3. Sidecar Service ✅
- File system operations
- Command execution
- Security boundary
- Workspace isolation

#### 4. Tool Execution Pattern
```typescript
// Tools in apps/server/src/agent/tools/
export const toolDefinition = {
  name: "tool_name",
  description: "...",
  parameters: z.object({ ... }),
  execute: async (args, ctx) => {
    // 1. Get task from Convex
    const task = await getTask(ctx.taskId);

    // 2. Execute via sidecar
    const result = await sidecarClient.executeTool(...);

    // 3. Update Convex state
    await appendMessage({ taskId: ctx.taskId, ... });

    return result;
  }
};
```

### Implementation Checklist

#### Backend Migration
- [x] Create Convex client singleton
- [x] Create Convex operation wrappers
- [x] Migrate frontend server action
- [ ] Update app.ts routes
- [ ] Update socket.ts handlers
- [ ] Update chat.ts message operations
- [ ] Update task-status.ts
- [ ] Fix AI SDK compatibility issues
- [ ] Update tool definitions

#### Observability
- [ ] Add Convex operation tracing to Braintrust
- [ ] Monitor Convex call performance
- [ ] Add error tracking for Convex operations

#### Testing
- [ ] Test task creation flow
- [ ] Test workspace initialization
- [ ] Test message streaming
- [ ] Test tool execution
- [ ] Test error handling
- [ ] Performance benchmarks

### Benefits of This Approach

1. **Real-time by default** - Convex subscriptions
2. **Simplified state management** - Single source of truth
3. **Better scaling** - Convex handles concurrency
4. **Maintains existing features** - Streaming, tools, sidecar
5. **Gradual migration** - Low risk, incremental progress

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Convex query limits | MEDIUM | Implement pagination, optimize queries |
| AI SDK version incompatibility | HIGH | Update to v5, fix type issues |
| State synchronization | MEDIUM | Use Convex transactions, validate state |
| Tool execution failures | HIGH | Robust error handling, state rollback |

## Next Steps

**Immediate Actions:**
1. Fix AI SDK compatibility issues in backend
2. Update app.ts to use Convex operations
3. Update socket.ts handlers
4. Update chat.ts message operations
5. Test complete flow end-to-end

**Go/No-Go Decision Points:**
- After fixing AI SDK issues: Verify compilation
- After updating routes: Test task creation
- After updating chat: Test message streaming
- Final: All tests passing, observability working

---

**Created by:** Claude Sonnet 4.5
**Status:** 🚀 Ready for Backend Implementation
