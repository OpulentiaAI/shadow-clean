# Convex-Native Implementation Strategy

**Status**: Infrastructure ✅ Complete | Implementation 🚧 In Progress
**Date**: 2025-12-08

## Current State

### ✅ What's Already Built
1. **Backend Infrastructure**
   - `convex` package installed in apps/server
   - `apps/server/src/lib/convex-client.ts` - Singleton client
   - `apps/server/src/lib/convex-operations.ts` - Full wrapper API

2. **Convex Functions**
   - `convex/streaming.ts` - Complete streaming implementation
     - `streamChat` - Basic streaming action
     - `streamChatWithTools` - Tool-enabled streaming
     - `appendStreamDelta` - Real-time delta updates
   - `convex/messages.ts` - Message CRUD operations
   - `convex/schema.ts` - Full database schema

3. **Frontend Hooks**
   - `apps/frontend/hooks/convex/` - Convex query/mutation hooks
   - `apps/frontend/hooks/convex/use-hybrid-task.ts` - Hybrid mode support
   - Feature flag: `NEXT_PUBLIC_USE_CONVEX_REALTIME`

### ❌ What's Missing

1. **Backend still uses Socket.IO streaming** (`apps/server/src/agent/chat.ts`)
2. **Frontend not subscribed to Convex streaming messages**
3. **Feature flag not enabled**

## Implementation Plan

### Step 1: Enable Convex Streaming in Frontend

Add a new hook to subscribe to real-time message updates:

**File**: `apps/frontend/hooks/convex/use-message-streaming.ts`

```typescript
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toConvexId } from "@/lib/convex/id";
import { useMemo, useEffect, useState } from "react";

export function useMessageStreaming(taskId: string | undefined) {
  const convexTaskId = useMemo(() => {
    if (!taskId) return undefined;
    try {
      return toConvexId("tasks", taskId);
    } catch {
      return undefined;
    }
  }, [taskId]);

  // Subscribe to messages for this task
  const messages = useQuery(
    api.messages.byTask,
    convexTaskId ? { taskId: convexTaskId } : "skip"
  );

  // Find the actively streaming message
  const streamingMessage = useMemo(() => {
    if (!messages) return null;

    // Look for message with isStreaming: true in metadata
    return messages.find((msg) => {
      if (!msg.metadataJson) return false;
      try {
        const metadata = JSON.parse(msg.metadataJson);
        return metadata.isStreaming === true;
      } catch {
        return false;
      }
    });
  }, [messages]);

  // Extract streaming parts from the streaming message
  const streamingParts = useMemo(() => {
    if (!streamingMessage?.metadataJson) return [];
    try {
      const metadata = JSON.parse(streamingMessage.metadataJson);
      return metadata.parts || [];
    } catch {
      return [];
    }
  }, [streamingMessage]);

  return {
    messages: messages || [],
    isStreaming: !!streamingMessage,
    streamingMessage,
    streamingParts,
  };
}
```

### Step 2: Update Backend to Use Convex Streaming

**Replace** the Socket.IO streaming loop in `apps/server/src/agent/chat.ts` with a Convex action call.

**Current approach** (Socket.IO):
```typescript
// OLD - emits chunks via Socket.IO
for await (const chunk of this.llmService.createMessageStream(...)) {
  emitStreamChunk(chunk, taskId);  // ❌ Socket.IO only
}
```

**New approach** (Convex-native):
```typescript
import { getConvexClient } from "../lib/convex-client";
import { api } from "../../../convex/_generated/api";
import { toConvexId } from "../lib/convex-operations";

// NEW - streams directly to Convex
const convexClient = getConvexClient();

// Start streaming action (runs in Convex)
const result = await convexClient.action(api.streaming.streamChatWithTools, {
  taskId: toConvexId<"tasks">(taskId),
  prompt: userMessage,
  model: context.getMainModel(),
  systemPrompt: taskSystemPrompt,
  llmModel: context.getMainModel(),
  apiKeys: context.getApiKeys(),
});

// Streaming happens automatically in Convex
// Frontend subscribes via useMessageStreaming hook
```

### Step 3: Remove Socket.IO Streaming (Optional)

**Keep Socket.IO for:**
- Initial connection
- Task status updates
- Terminal output
- File system events

**Remove Socket.IO for:**
- Chat message streaming (use Convex subscriptions instead)

### Step 4: Update Frontend to Use Convex Subscriptions

**File**: `apps/frontend/hooks/convex/use-hybrid-task.ts`

Update to use `useMessageStreaming` instead of Socket.IO streaming:

```typescript
import { useMessageStreaming } from "./use-message-streaming";

export function useHybridTask(taskId: string | undefined) {
  const socketData = useTaskSocket(taskId);
  const { messages, isStreaming, streamingParts } = useMessageStreaming(taskId);

  return {
    // Convex-powered
    messages,
    isStreaming,
    streamingParts,

    // Socket.IO-powered (task updates, file changes)
    isConnected: socketData.isConnected,
    sendMessage: socketData.sendMessage,
    stopStream: socketData.stopStream,
  };
}
```

### Step 5: Enable Convex Realtime Flag

**File**: `apps/frontend/.env.local`

```bash
NEXT_PUBLIC_USE_CONVEX_REALTIME=true
```

## Benefits of Convex-Native Approach

### Performance
- ✅ **No polling** - Real-time reactivity built-in
- ✅ **Optimistic updates** - Instant UI response
- ✅ **Automatic caching** - Convex manages cache invalidation
- ✅ **Parallel queries** - Multiple subscriptions optimized

### Developer Experience
- ✅ **TypeScript-first** - Full type safety from DB to UI
- ✅ **Single source of truth** - No Prisma/Convex sync issues
- ✅ **Simpler architecture** - Fewer moving parts
- ✅ **Built-in auth** - Convex handles permissions

### Deployment
- ✅ **No PostgreSQL needed** - One less service to manage
- ✅ **Automatic scaling** - Convex handles traffic spikes
- ✅ **Zero downtime** - Built-in migration support

## Migration Steps (Recommended Order)

### Phase 1: Streaming Messages (Current Focus)
1. ✅ Create `use-message-streaming.ts` hook
2. 🔄 Update `chat.ts` to call Convex streaming action
3. 🔄 Update `use-hybrid-task.ts` to use Convex subscriptions
4. 🔄 Enable `NEXT_PUBLIC_USE_CONVEX_REALTIME=true`
5. ✅ Test end-to-end streaming flow

### Phase 2: Task Operations
1. Replace `createTask` in `apps/frontend/lib/actions/create-task.ts`
2. Replace task status updates in `apps/server/src/utils/task-status.ts`
3. Remove Prisma task queries

### Phase 3: User & Auth (Optional)
1. Migrate user operations to Convex
2. Update BetterAuth integration
3. Remove Prisma user tables

### Phase 4: Complete Removal (Final)
1. Remove Prisma package
2. Remove PostgreSQL dependency
3. Update deployment scripts

## Rollback Strategy

**Feature Flag**: Keep `NEXT_PUBLIC_USE_CONVEX_REALTIME` as on/off switch

**Dual-write**: During migration, write to both systems:
```typescript
// Save to Prisma (old)
await prisma.chatMessage.create({ ... });

// Also save to Convex (new)
await appendMessage({ ... });
```

**Testing**: Run both systems in parallel, compare outputs

## Next Actions

**Immediate** (to fix current streaming issue):
1. Create `use-message-streaming.ts` hook
2. Update `chat.ts` to use `api.streaming.streamChatWithTools`
3. Enable Convex realtime flag
4. Test message streaming

**Short-term** (complete migration):
1. Migrate task operations
2. Remove Prisma from critical path
3. Performance benchmarks

**Long-term** (optional):
1. Full Prisma removal
2. Auth migration
3. PostgreSQL cleanup

---

**Author**: Claude Sonnet 4.5
**Status**: Ready for implementation
**Estimated Time**: 2-4 hours for Phase 1
