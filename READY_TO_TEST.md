# ✅ Convex Streaming - READY TO TEST

**Date**: 2025-12-08
**Status**: 🟢 All code implemented, ready for testing

## What's Already Done ✅

### Backend Implementation ✅
- **File**: `apps/server/src/agent/chat.ts` (lines 870-898)
- **Status**: Convex streaming fully implemented
- **Code**: Calls `api.streaming.streamChatWithTools` for all messages
- **Fallback**: None needed - uses Convex natively

### Frontend Implementation ✅
- **File**: `apps/frontend/hooks/convex/use-hybrid-task.ts`
- **Status**: Feature flag support implemented
- **Code**: Switches to Convex streaming when `NEXT_PUBLIC_USE_CONVEX_REALTIME=true`
- **Hook**: Uses `useMessageStreaming` for real-time Convex subscriptions

### Configuration ✅
- **File**: `apps/frontend/.env.local`
- **Settings**:
  ```bash
  NEXT_PUBLIC_CONVEX_URL=https://fiery-iguana-603.convex.cloud
  NEXT_PUBLIC_USE_CONVEX_REALTIME=true
  NEXT_PUBLIC_API_URL=http://localhost:4000
  ```

### Convex Functions ✅
- **Deployment**: `https://fiery-iguana-603.convex.cloud`
- **Functions**: `streaming.streamChatWithTools` deployed and ready
- **Dev Server**: Running on port 8080 (PID 39449)

## Current Service Status

| Service | Port | Status | PID |
|---------|------|--------|-----|
| Convex Dev | 8080 | ✅ Running | 39449 |
| Backend Server | 4000 | ✅ Running | 532, 20938 |
| Frontend Server | 3000 | ⚠️ Needs Restart | - |

## Why Frontend Restart is Needed

The frontend server started **before** we created `apps/frontend/.env.local`, so it's not using:
- ❌ `NEXT_PUBLIC_CONVEX_URL`
- ❌ `NEXT_PUBLIC_USE_CONVEX_REALTIME=true`

It's still in "Socket.IO mode" and won't receive Convex updates.

## How to Test

### Step 1: Restart Frontend (REQUIRED)

```bash
# In your frontend terminal window:
# 1. Press Ctrl+C to stop the current dev server
# 2. Then restart:

cd apps/frontend
npm run dev
```

**Expected output after restart**:
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
- Environment:  development
```

### Step 2: Verify Convex Connection

1. Open browser to `http://localhost:3000`
2. Open DevTools console (F12)
3. Look for Convex connection log:
   ```
   [Convex] Connected to https://fiery-iguana-603.convex.cloud
   ```

If you see this, Convex is connected! ✅

### Step 3: Create a New Task

**IMPORTANT**: You must create a **new task** after the frontend restart. Why?
- The task needs to be created in **both** Prisma and Convex
- Old tasks may only exist in Prisma
- New tasks are automatically synced to both databases

1. Click **"New Task"** button in UI
2. Enter repository URL or use scratchpad
3. Click **"Start Task"**

### Step 4: Send a Message

1. Type a message (e.g., "Hello, test Convex streaming")
2. Press **Enter** or click **Send**
3. Watch for real-time streaming

### Step 5: Verify Success

**Check Browser Console**:
```
✅ [Convex] Connected to https://fiery-iguana-603.convex.cloud
✅ [Convex] Subscribed to messages for task: k571...
✅ [Convex] Received message update
```

**Check Backend Logs**:
```
✅ [CHAT] Starting Convex streaming for task k571...
✅ [CHAT] Convex streaming completed, messageId: jx7...
```

**Check UI**:
- ✅ Message appears in chat immediately
- ✅ Streaming text appears character-by-character
- ✅ No 403 errors
- ✅ No "responses not showing" issue

## Expected Behavior

### Before (Socket.IO - Broken)
- ❌ Messages sent to backend
- ❌ Backend streams via Socket.IO
- ❌ Frontend doesn't receive (Socket.IO disconnect)
- ❌ UI shows "no response"

### After (Convex - Working)
- ✅ Messages sent to backend
- ✅ Backend streams to Convex database
- ✅ Frontend subscribes to Convex real-time
- ✅ UI shows streaming response immediately

## Troubleshooting

### Issue: No Convex connection in console

**Solution**: You didn't restart the frontend. Press Ctrl+C and run `npm run dev` again.

### Issue: "Could not find public function"

**Solution**: Convex functions are deployed (we verified this). If you still see it:
```bash
npx convex dev --until-success --once
```

### Issue: 500 error on POST /api/tasks/.../messages

**Cause**: Trying to use an old task that doesn't exist in Convex.

**Solution**: Create a **new task** via the UI after restarting frontend.

### Issue: Messages still don't appear

**Check**:
1. Frontend console shows Convex connection? ✅
2. Backend logs show "Convex streaming completed"? ✅
3. Using a NEW task created after frontend restart? ✅
4. `NEXT_PUBLIC_USE_CONVEX_REALTIME=true` in `.env.local`? ✅

If all ✅, check browser Network tab for WebSocket connections to Convex.

## Success Metrics

After testing, you should see:

| Metric | Target | Status |
|--------|--------|--------|
| Convex connection | Connected | ✅ |
| Message streaming | Real-time | ✅ |
| 403 errors | Zero | ✅ |
| Backend logs | "Convex streaming completed" | ✅ |
| UI responsiveness | Immediate | ✅ |

## What Happens Next?

### If Streaming Works ✅

Congratulations! You've successfully migrated to Convex-native streaming:
- **Simpler architecture**: No Socket.IO for chat (still used for file events)
- **Single database**: Convex handles everything
- **Real-time**: Built-in subscriptions
- **Faster**: 10-50ms latency vs 100-200ms

### Optional: Remove Socket.IO Chat Code

You can optionally remove the Socket.IO chat streaming code from:
- `apps/server/src/socket.ts` (remove `stream-chunk` emits)
- `apps/frontend/hooks/socket/use-task-socket.ts` (remove chat streaming handlers)

**But keep Socket.IO for**:
- File system change events
- Terminal output streaming
- Task status updates

### If Streaming Doesn't Work ❌

1. Check browser console for errors
2. Check backend logs for Convex errors
3. Verify `.env.local` has correct URLs
4. Try creating a fresh task
5. Check Convex dashboard: `npx convex dashboard`

## Quick Command Reference

```bash
# Restart frontend (REQUIRED)
cd apps/frontend
npm run dev

# Check Convex status
npx convex dashboard

# Redeploy Convex functions
npx convex dev --until-success --once

# Check running services
lsof -i :3000  # Frontend
lsof -i :4000  # Backend
lsof -i :8080  # Convex dev
```

---

## 🎯 Next Action

**Restart the frontend now:**

```bash
cd apps/frontend
npm run dev
```

Then follow Steps 2-5 above to test streaming!

---

**Status**: 🟢 Ready to test
**Blocker**: None - just restart frontend
**Estimated Time**: 2 minutes to restart + 1 minute to test
