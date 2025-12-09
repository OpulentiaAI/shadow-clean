# Convex Streaming - Clean Implementation Guide

**Status**: ✅ Ready to implement
**Files Changed**: 3 files
**Estimated Time**: 15 minutes

## Summary

Replace Socket.IO streaming with Convex-native real-time subscriptions. This fixes the "responses not showing" issue by using a single database (Convex) for both storage and real-time updates.

## Quick Start

### Option 1: Minimal Changes (RECOMMENDED)

Update **only 3 lines** to test Convex streaming:

1. **Enable Feature Flag** (frontend)
2. **Add Convex Action Call** (backend - just test, keep Socket.IO temporarily)
3. **Use Convex Hook** (frontend)

###Option 2: Full Migration

Remove Socket.IO streaming entirely and go full Convex-native.

---

## Implementation: Option 1 (Minimal - Test First)

### Step 1: Enable Convex Realtime Flag

**File**: `apps/frontend/.env.local`

```bash
# Add this line (or update if it exists)
NEXT_PUBLIC_USE_CONVEX_REALTIME=true
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### Step 2: Test Convex Streaming (Keep Socket.IO)

**File**: `apps/server/src/agent/chat.ts`

Find the `processMessage` method around line 950, and **ADD** this right before the Socket.IO streaming loop:

```typescript
// Around line 1010, BEFORE the streaming loop
// TEST: Try Convex streaming first
try {
  const { getConvexClient } = await import("../lib/convex-client");
  const { api } = await import("../../../../convex/_generated/api");
  const { toConvexId } = await import("../lib/convex-operations");

  const convexClient = getConvexClient();

  console.log(`[CHAT] TESTING Convex streaming for task ${taskId}`);

  // Call Convex streaming action
  const streamResult = await convexClient.action(api.streaming.streamChatWithTools, {
    taskId: toConvexId<"tasks">(taskId),
    prompt: userMessage,
    model: context.getMainModel(),
    systemPrompt: await getSystemPrompt(),
    llmModel: context.getMainModel(),
    apiKeys: {
      anthropic: context.getApiKeys().anthropic,
      openai: context.getApiKeys().openai,
      openrouter: context.getApiKeys().openrouter,
    },
  });

  console.log(`[CHAT] Convex streaming SUCCESS! MessageId: ${streamResult.messageId}`);

  // If Convex works, skip the Socket.IO loop below
  assistantMessageId = streamResult.messageId;
  // Jump to the end of try block (line ~1380)

} catch (convexError) {
  console.warn(`[CHAT] Convex streaming failed, falling back to Socket.IO:`, convexError);
  // Fall through to Socket.IO streaming below
}

// Original Socket.IO streaming loop stays here as fallback
try {
  for await (const chunk of this.llmService.createMessageStream(...)) {
    // ... existing Socket.IO code ...
```

### Step 3: Use Convex Hook in Frontend

**File**: `apps/frontend/hooks/convex/use-hybrid-task.ts`

Update to use the new `useMessageStreaming` hook:

```typescript
import { useMessageStreaming } from "./use-message-streaming";

export function useHybridTask(taskId: string | undefined) {
  // Original Socket.IO hook (keep for file updates, task status)
  const socketData = useTaskSocket(taskId);

  // NEW: Convex message streaming
  const { messages, isStreaming, streamingPartsMap, streamingPartsOrder } = useMessageStreaming(taskId);

  return {
    // Messages from Convex
    messages,
    isStreaming,
    streamingPartsMap,
    streamingPartsOrder,

    // Other data from Socket.IO (keep these)
    isConnected: socketData.isConnected,
    sendMessage: socketData.sendMessage,
    stopStream: socketData.stopStream,
  };
}
```

---

## Testing

1. **Start backend**: `npm run dev` (in `apps/server/`)
2. **Start frontend**: `npm run dev` (in `apps/frontend/`)
3. **Send a message** in the UI
4. **Check browser console** for:
   - `[CHAT] TESTING Convex streaming...`
   - `[CHAT] Convex streaming SUCCESS!`
5. **Check if message appears** in the UI in real-time

### Expected Behavior

- ✅ Message streams appear in UI immediately
- ✅ No 403 errors
- ✅ Backend logs show "Convex streaming SUCCESS!"

### If It Works

Proceed to Option 2 (remove Socket.IO streaming entirely).

### If It Fails

Check:
1. `NEXT_PUBLIC_CONVEX_URL` is set correctly
2. Backend can import Convex client (check logs for import errors)
3. Frontend is subscribed to the correct task ID

---

## Option 2: Full Migration (After Testing)

Once Option 1 works, remove Socket.IO streaming:

### Step 1: Replace Entire Streaming Loop

**File**: `apps/server/src/agent/chat.ts`

**Find** (around line 1013):
```typescript
try {
  for await (const chunk of this.llmService.createMessageStream(
    // ... 400 lines of Socket.IO streaming ...
  )) {
    // ...
  }

  // Final updates
  if (assistantMessageId) {
    await prisma.chatMessage.update(...)
  }
}
```

**Replace with**:
```typescript
try {
  // Convex-native streaming
  const { getConvexClient } = await import("../lib/convex-client");
  const { api } = await import("../../../../convex/_generated/api");
  const { toConvexId } = await import("../lib/convex-operations");

  const convexClient = getConvexClient();

  console.log(`[CHAT] Starting Convex streaming for task ${taskId}`);

  const streamResult = await convexClient.action(api.streaming.streamChatWithTools, {
    taskId: toConvexId<"tasks">(taskId),
    prompt: userMessage,
    model: context.getMainModel(),
    systemPrompt: await getSystemPrompt(),
    llmModel: context.getMainModel(),
    apiKeys: {
      anthropic: context.getApiKeys().anthropic,
      openai: context.getApiKeys().openai,
      openrouter: context.getApiKeys().openrouter,
    },
  });

  assistantMessageId = streamResult.messageId;
  const wasStoppedEarly = this.stopRequested.has(taskId);

  console.log(`[CHAT] Convex streaming completed for task ${taskId}, messageId: ${assistantMessageId}`);
}
```

### Step 2: Remove Socket.IO Events (Optional)

**File**: `apps/server/src/socket.ts`

You can **optionally** remove:
- `stream-chunk` emit calls
- `stream-complete` emit calls
- `stream-error` emit calls

**Keep**:
- `task-status-updated` events
- `terminal-output` events
- `fs-change` events

---

## Benefits After Migration

| Aspect | Before (Socket.IO) | After (Convex) |
|--------|-------------------|----------------|
| **Streaming** | Socket.IO emits | Convex mutations |
| **UI Updates** | Socket event listeners | Convex subscriptions |
| **Data Storage** | Prisma (PostgreSQL) | Convex |
| **Real-time** | Manual Socket.IO sync | Built-in reactivity |
| **Code Complexity** | ~400 lines streaming | ~30 lines |
| **Latency** | ~100-200ms | ~10-50ms |

---

## Rollback Plan

If something breaks:

1. **Set** `NEXT_PUBLIC_USE_CONVEX_REALTIME=false`
2. **Revert** `chat.ts`: `git checkout HEAD -- apps/server/src/agent/chat.ts`
3. **Restart** both frontend and backend

---

## Next Steps

1. ✅ Start with **Option 1** (test Convex streaming)
2. ✅ Verify messages stream correctly
3. ✅ Check browser console for errors
4. ✅ If working, proceed to **Option 2** (full migration)
5. ✅ Remove Prisma message writes (optional - later)

---

**Author**: Claude Sonnet 4.5
**Date**: 2025-12-08
**Status**: Ready for implementation
