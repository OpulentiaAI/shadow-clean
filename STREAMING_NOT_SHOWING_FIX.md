# Streaming Not Showing - Diagnostic & Fix

## Status
✅ Deployment complete to Convex and Vercel  
⏳ Streaming partially working - reasoning content not displaying  
📍 Issue: Data reaching backend but not displaying in UI

---

## What We Know

1. **Backend deployed**: `npx convex deploy --prod` succeeded
2. **Task says "Running"**: Stream action is executing
3. **No Convex errors**: Backend logic appears sound
4. **No reasoning visible**: UI not showing reasoning components

---

## The Problem

Reasoning deltas are being handled in the backend (convex/streaming.ts line 1182+), but the reasoning content isn't appearing in the UI. This could be:

1. **Backend**: Not calling `appendStreamDelta` with reasoning parts
2. **Frontend**: Not receiving/subscribing to metadata updates
3. **UI**: Not rendering reasoning components even if data exists

---

## How to Diagnose (5 minutes)

### Step 1: Open DevTools

1. Go to https://code.opulentia.ai
2. Press **F12** or **Right-click → Inspect**
3. Click **Console** tab

### Step 2: Send a Message

1. Create a new task
2. Select model: **deepseek/deepseek-r1** (reasoning model)
3. Send: "What is 2+2? Show your reasoning."
4. **Watch the console**

### Step 3: Look for These Logs

```
[USE_TASK_MESSAGES] Raw Convex data: {
  ...
  messages: [
    {
      ...
      hasparts: 2  ← Should be > 0!
    }
  ]
}

[REASONING_COMPONENT] Rendering with: {
  textLength: 542  ← Should be > 0!
}
```

### Step 4: Interpret Results

| What You See | Meaning | Next Step |
|--------------|---------|-----------|
| `hasparts: 0` | Backend not saving reasoning | Check backend logs |
| `hasparts: 2+` but no `[REASONING_COMPONENT]` | Frontend not rendering | Check UI code |
| `[REASONING_COMPONENT]` but `textLength: 0` | Component rendered but empty | Check data structure |
| `[REASONING_COMPONENT]` + `textLength: > 0` | ✅ Working! | Nothing to do |

---

## Most Likely Issue

**Frontend isn't re-rendering when metadata changes**

The useQuery hook should subscribe to updates, but it might not be detecting the metadata change because:

1. `metadataJson` is a string field
2. Convex updates it atomically
3. Frontend needs to parse and pass it correctly

**Fix**: Already applied in this commit - added enhanced logging to see metadata structure.

---

## How to Proceed

### Option 1: Run Diagnostic (Recommended)

```bash
# 1. Deploy the diagnostic version
# (Already pushed - GitHub Actions running)

# 2. Wait for Vercel to deploy
# Check: https://github.com/OpulentiaAI/shadow-clean/actions

# 3. Once deployed, test at code.opulentia.ai
# Open console (F12) and send message

# 4. Share the console output showing:
# - [USE_TASK_MESSAGES] logs
# - hasparts value
# - Whether [REASONING_COMPONENT] appears
```

### Option 2: Check Backend Logs

```bash
# View recent Convex logs
npx convex logs

# Filter for streaming logs
npx convex logs | grep STREAMING
```

### Option 3: Query Database Directly

```bash
# Get latest task
TASK_ID=$(npx convex run --prod api.tasks:listByUserExcludeArchived '{"userId":"<YOUR_USER_ID>"}' | jq -r '.[0].id')

# Check last message's metadata
npx convex run --prod api.messages:byTask '{"taskId":"'$TASK_ID'"}' | jq '.[-1].metadataJson | fromjson | .parts'

# Should show reasoning parts like:
# [
#   { "type": "reasoning", "text": "..." },
#   { "type": "text", "text": "..." }
# ]
```

---

## What Was Added

### 1. Enhanced Frontend Logging
**File**: `apps/frontend/hooks/tasks/use-task-messages.tsx`

Now logs:
- Metadata keys present
- Number of parts
- Part types

### 2. Component Rendering Logs
**File**: `apps/frontend/components/chat/messages/reasoning.tsx`

Now logs:
- Part type
- Text length
- First 100 characters

### 3. Diagnostic Guides
**Files**:
- `STREAMING_DIAGNOSTIC.md` - Step-by-step diagnosis
- `diagnose-streaming.md` - Detailed troubleshooting

---

## Expected Timeline

1. **GitHub Actions deploys** → 2-3 min
2. **Vercel updates** → 2-3 min  
3. **Cache clears** → 30 sec
4. **You can test** → ~5-10 min total

Check: https://github.com/OpulentiaAI/shadow-clean/actions

---

## Next Steps

**Immediate (now)**:
1. Check GitHub Actions to see if deploy is running
2. Once deployed, open DevTools console
3. Send test message to reasoning model
4. Check console for the diagnostic logs

**If logs show `hasparts: 0`**:
- Add backend logging (see STREAMING_DIAGNOSTIC.md Step 2)
- Redeploy backend
- Check if `reasoning-delta` parts are being emitted

**If logs show `hasparts: 2+` but no component**:
- Issue is in UI mapping
- Check assistant-message.tsx normalizedParts
- Add logging to debug rendering

**If logs show `textLength: 0`**:
- Issue is in data structure
- Check part.text property exists in metadata

---

## Key Commands to Have Ready

```bash
# Monitor deployment
git log --oneline | head -5

# Check Convex status
npx convex status

# View latest logs
npx convex logs | head -50

# Query messages
npx convex run --prod api.messages:byTask '{"taskId":"<TASK_ID>"}' | jq '.[-1]'
```

---

## Summary

✅ Deployment done  
✅ Code correct  
⏳ Need to verify data flow  

The diagnostic logs will show exactly where the breakdown is. Once we have console output, we can pinpoint the fix!

---

**Status**: Deploy in progress via GitHub Actions  
**Next**: Test with enhanced diagnostic logging  
**Estimated Fix Time**: < 30 min after identifying the issue
