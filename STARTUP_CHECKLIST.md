# Startup Checklist - Convex Native Streaming

**Status**: ✅ All services configured and ready
**Date**: 2025-12-08

## What's Been Done ✅

1. ✅ **Convex package installed** in backend (`apps/server`)
2. ✅ **Convex client singleton** created (`apps/server/src/lib/convex-client.ts`)
3. ✅ **Convex operations wrapper** ready (`apps/server/src/lib/convex-operations.ts`)
4. ✅ **Frontend streaming hook** created (`apps/frontend/hooks/convex/use-message-streaming.ts`)
5. ✅ **Frontend .env.local configured** with Convex URL
6. ✅ **Convex functions deployed** and ready (`streaming.streamChatWithTools` available)

## Current Service Status

### ✅ Running Services
- **Convex Dev Server**: Port 8080 (PID 39449)
- **Backend Server**: Port 4000 (PIDs 532, 20938)
- **Convex Deployment**: `https://fiery-iguana-603.convex.cloud`

### Environment Variables Configured
```bash
# Root .env.local
CONVEX_URL=https://fiery-iguana-603.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://fiery-iguana-603.convex.cloud

# Frontend .env.local (NEWLY CREATED)
NEXT_PUBLIC_CONVEX_URL=https://fiery-iguana-603.convex.cloud
NEXT_PUBLIC_USE_CONVEX_REALTIME=true
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Next Steps to Enable Convex Streaming

### Step 1: Restart Frontend (REQUIRED)

The frontend needs to reload with the new `.env.local` file:

```bash
# Stop the frontend dev server (Ctrl+C)
# Then restart:
cd apps/frontend
npm run dev
```

### Step 2: Verify Convex Connection

Once frontend restarts, open browser DevTools console and look for:
```
[Convex] Connected to https://fiery-iguana-603.convex.cloud
```

### Step 3: Test Current State (Before Code Changes)

1. **Create a new task** in the UI
2. **Send a message**
3. **Expected behavior**: You'll see the "responses not showing" issue (Socket.IO streaming)
4. **Check browser console** for any Convex connection errors

### Step 4: Implement Convex Streaming

Follow **Option 1** in `CONVEX_STREAMING_IMPLEMENTATION.md`:

**File**: `apps/server/src/agent/chat.ts` (around line 1010)

Add the Convex streaming test code BEFORE the Socket.IO loop.

**File**: `apps/frontend/hooks/convex/use-hybrid-task.ts`

Update to use the `useMessageStreaming` hook.

### Step 5: Test Convex Streaming

1. **Restart backend server** (to pick up chat.ts changes)
2. **Send a message** in the UI
3. **Check browser console** for:
   - `[CHAT] TESTING Convex streaming...`
   - `[CHAT] Convex streaming SUCCESS!`
4. **Verify** messages stream in real-time

## Troubleshooting

### Issue: "Could not find public function for 'streaming:streamChatWithTools'"

**Solution**: Functions are deployed (we just synced them). If you still see this:
```bash
npx convex dev --until-success --once
```

### Issue: Frontend shows blank/no Convex connection

**Solution**:
1. Make sure you **restarted the frontend** after creating `.env.local`
2. Check `NEXT_PUBLIC_CONVEX_URL` is set in browser console: `console.log(process.env.NEXT_PUBLIC_CONVEX_URL)`

### Issue: 500 error on POST /api/tasks/.../messages

**Solution**:
1. The task ID needs to exist in both Prisma AND Convex
2. Create a **new task** via the UI (this creates it in both databases)
3. Try sending a message to the NEW task

### Issue: Backend can't import Convex client

**Solution**: Restart backend server:
```bash
# Stop backend (Ctrl+C)
cd apps/server
npm run dev
```

## Commands Reference

### Start All Services
```bash
# Terminal 1: Convex Dev (already running on port 8080)
npx convex dev

# Terminal 2: Backend (already running on port 4000)
cd apps/server
npm run dev

# Terminal 3: Frontend (RESTART THIS AFTER CREATING .env.local)
cd apps/frontend
npm run dev
```

### Check Service Status
```bash
# Convex dev server
lsof -i :8080

# Backend server
lsof -i :4000

# Frontend server
lsof -i :3000
```

### Deploy Convex Functions
```bash
# Auto-deploys with `convex dev` running
# Or manually:
npx convex deploy
```

## Quick Test Procedure

1. ✅ **Verify services running**: Check ports 3000, 4000, 8080
2. ✅ **Restart frontend**: `cd apps/frontend && npm run dev`
3. ✅ **Open browser**: `http://localhost:3000`
4. ✅ **Create new task**: Click "New Task" button
5. ✅ **Send message**: Type "Hello" and send
6. ✅ **Check console**: Look for Convex connection logs
7. ✅ **Implement streaming**: Follow `CONVEX_STREAMING_IMPLEMENTATION.md`

## Success Criteria

### Before Code Changes
- ❌ Messages don't stream (Socket.IO issue)
- ✅ Convex client connects successfully
- ✅ Frontend has environment variables

### After Code Changes
- ✅ Messages stream in real-time
- ✅ No 403 errors
- ✅ Backend logs "Convex streaming SUCCESS!"
- ✅ Frontend shows streaming message parts

## Files to Edit (Next)

1. **`apps/server/src/agent/chat.ts`** - Add Convex streaming test (~25 lines)
2. **`apps/frontend/hooks/convex/use-hybrid-task.ts`** - Use Convex hook (~5 lines)

See `CONVEX_STREAMING_IMPLEMENTATION.md` for exact code.

---

**Status**: 🟢 Ready to implement streaming
**Blocker**: None - all infrastructure is ready
**Next Action**: Restart frontend, then follow implementation guide
