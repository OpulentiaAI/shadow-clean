# Streaming Diagnostic Guide

Deployment is complete but reasoning streaming isn't showing. Let's diagnose:

## Quick Diagnostic (5 minutes)

### Step 1: Check Console Logs

1. Go to https://code.opulentia.ai
2. Open DevTools: **F12** or **Right-click → Inspect**
3. Click **Console** tab
4. Create a new task
5. Send a message to a reasoning model (e.g., "What is 2+2?")
6. **Look for these logs:**

```
[USE_TASK_MESSAGES] Raw Convex data: {
  dataExists: true,
  dataLength: 2,
  messages: [
    {
      id: "...",
      role: "user",
      hasMetadata: true,
      metadataKeys: [...],
      hasparts: 0  ← Check this!
    },
    {
      id: "...",
      role: "assistant",
      hasMetadata: true,
      metadataKeys: ["isStreaming", "parts"],
      hasparts: 2  ← Should be > 0 for reasoning!
    }
  ]
}

[REASONING_COMPONENT] Rendering with: {
  partType: "reasoning",
  textLength: 542,
  isLoading: true,
  forceOpen: true,
  first100Chars: "Let me think about this..."
}
```

### What Each Log Means

| Log | Means |
|-----|-------|
| `hasparts: 0` | No reasoning data reached the frontend |
| `hasparts: > 0` | Frontend received parts, but not rendering |
| `[REASONING_COMPONENT]` appears | Component is rendering |
| `[REASONING_COMPONENT]` doesn't appear | Frontend isn't detecting reasoning parts |

---

## Diagnostic Flow Chart

```
START: No reasoning showing
  │
  ├─ Check console for [USE_TASK_MESSAGES] logs
  │   ├─ Not present? → Issue A: Frontend not subscribing
  │   └─ Present? → Check hasparts value
  │
  ├─ Is hasparts > 0?
  │   ├─ No (hasparts: 0) → Issue B: Backend not saving parts
  │   └─ Yes (hasparts: 2+) → Check for [REASONING_COMPONENT]
  │
  ├─ Does [REASONING_COMPONENT] appear in console?
  │   ├─ No → Issue C: Frontend not mapping parts correctly
  │   └─ Yes → Issue D: Component rendering but empty/blank
  │
  └─ Check textLength in [REASONING_COMPONENT]
      ├─ textLength: 0 → Part.text is empty
      └─ textLength: > 0 → Text is there, UI issue
```

---

## Issue A: Frontend Not Subscribing

**Symptom**: No `[USE_TASK_MESSAGES]` logs at all

**Cause**: useQuery not subscribing to updates

**Fix**:
1. Ensure `NEXT_PUBLIC_USE_CONVEX_REALTIME=true` in .env
2. Check browser console for Convex connection errors
3. Verify task ID is valid (should be 25+ character ID)

**Command to test**:
```bash
# Check if env is set
cat apps/frontend/.env | grep CONVEX
```

---

## Issue B: Backend Not Saving Parts

**Symptom**: `hasparts: 0` in logs

**Cause**: 
- `appendStreamDelta` not being called with parts
- Reasoning delta handler not triggered
- AI SDK not emitting `reasoning-delta` parts

**Fix**:
1. Check backend logs for:
   ```
   [STREAMING] Reasoning delta received: N chars
   [STREAMING] Calling appendStreamDelta with parts...
   ```

2. If logs missing:
   - Streaming handler not executing
   - Check if model supports reasoning (deepseek/deepseek-r1, etc)

**Verify**:
```bash
# Query latest message
npx convex run --prod api.messages:byTask '{"taskId":"<TASK_ID>"}' | jq '.[-1] | {
  role: .role,
  hasMetadata: (.metadataJson != null),
  parts: (.metadataJson | fromjson | .parts | length)
}'

# Should show: parts: 2 (or more for reasoning)
```

---

## Issue C: Frontend Not Mapping Parts

**Symptom**: 
- `hasparts: 2` in logs
- NO `[REASONING_COMPONENT]` logs

**Cause**: assistant-message.tsx not rendering reasoning parts

**Fix**:
1. Check if `message.metadata?.parts` is populated
2. Check if normalizedParts includes reasoning
3. Verify groupedParts maps reasoning correctly

**Debug**:
Add this to assistant-message.tsx line 100:

```typescript
console.log("[ASSISTANT_MESSAGE] normalizedParts:", normalizedParts);
console.log("[ASSISTANT_MESSAGE] reasoning parts:", normalizedParts.filter(p => p.type === "reasoning"));
```

---

## Issue D: Component Rendering But Blank

**Symptom**:
- `[REASONING_COMPONENT]` appears in logs
- `textLength: 0`

**Cause**: Part.text is empty or undefined

**Fix**:
1. Check if `part.text` property exists
2. Check metadata.parts structure:

```json
{
  "parts": [
    { "type": "reasoning", "text": "" }  // ← text is empty!
  ]
}
```

**Verify**:
```bash
# Check actual part structure
npx convex run --prod api.messages:byTask '{"taskId":"<TASK_ID>"}' | jq '.[-1].metadataJson | fromjson | .parts[] | select(.type=="reasoning")'
```

---

## Step 2: Backend Verification

If frontend logs don't show parts arriving, check backend:

### Check Streaming Handler

1. Add logging to convex/streaming.ts (around line 1182):

```typescript
if (partType === "reasoning-delta") {
  console.log(`[STREAMING_DEBUG] Got reasoning-delta, text length:`, reasoningDelta.length);
  console.log(`[STREAMING_DEBUG] Calling appendStreamDelta...`);
  
  await ctx.runMutation(api.messages.appendStreamDelta, {
    messageId,
    deltaText: reasoningDelta,
    isFinal: false,
    parts: [
      {
        type: "reasoning",
        text: reasoningDelta,
      },
    ],
  });
  
  console.log(`[STREAMING_DEBUG] appendStreamDelta done`);
}
```

2. Deploy: `npx convex deploy --prod`
3. Retry message
4. Check Convex logs for the debug messages

### Expected Convex Logs

```
[STREAMING_DEBUG] Got reasoning-delta, text length: 245
[STREAMING_DEBUG] Calling appendStreamDelta...
[STREAMING_DEBUG] appendStreamDelta done
[STREAMING] Reasoning delta received: 245 chars
```

If you don't see these logs:
- Model isn't emitting reasoning-delta parts
- Or handler is crashing (check for errors)

---

## Step 3: Test with Raw Convex Query

```bash
# 1. Get a task ID from recent messages
TASK_ID=$(npx convex run --prod api.tasks:listByUserExcludeArchived '{"userId":"<USER_ID>"}' | jq -r '.[0].id')

# 2. Send message to reasoning model
npx convex run --prod api.streaming:streamChatWithTools '{
  "taskId":"'$TASK_ID'",
  "prompt":"What is 2+2? Show your reasoning.",
  "model":"deepseek/deepseek-r1",
  "apiKeys":{"openrouter":"YOUR_KEY"}
}'

# 3. Check result
npx convex run --prod api.messages:byTask '{"taskId":"'$TASK_ID'"}' | jq '.[-1] | {
  role: .role,
  content: .content[0:50],
  parts: (.metadataJson | fromjson | .parts | map({type, textLength: (.text | length)}))
}'

# Expected:
# {
#   "role": "ASSISTANT",
#   "content": "Let me think about this...",
#   "parts": [
#     {"type": "reasoning", "textLength": 245},
#     {"type": "text", "textLength": 850}
#   ]
# }
```

---

## Commit & Redeploy

After adding diagnostic logs:

```bash
git add -A
git commit -m "Add streaming diagnostic logs"
git push origin opulent-main

# Wait for GitHub Actions to deploy to Vercel
# Then test again with DevTools open
```

---

## Summary Checklist

- [ ] Can see `[USE_TASK_MESSAGES]` logs
- [ ] Message has `hasparts > 0`
- [ ] Can see `[REASONING_COMPONENT]` logs
- [ ] `textLength > 0` in component logs
- [ ] Reasoning content visible in UI

When all boxes are checked, streaming is working! 🎉

---

## Need Help?

1. Run through diagnostic flow above
2. Share console logs that appear
3. Check Convex logs at dashboard.convex.dev
4. Verify task ID and message ID are valid
5. Make sure using reasoning model (deepseek/deepseek-r1, etc)

The code is deployed. Just need to find where data is getting lost!
