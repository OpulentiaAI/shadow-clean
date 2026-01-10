# Diagnose Streaming Issues

The streaming is deployed but reasoning isn't showing. Let's diagnose:

## Step 1: Check Browser Console

1. Open https://code.opulentia.ai
2. Open DevTools (F12)
3. Go to Console tab
4. Create a new task
5. Send a message
6. Watch for these logs:

```
[USE_TASK_MESSAGES] Raw Convex data: { dataExists: true, dataLength: 2, rawRoles: [...] }
[STREAMING] Reasoning delta received: N chars
[STREAMING] Stream iteration complete...
```

**What to look for:**
- Do you see `[STREAMING]` logs? (If not, backend streaming isn't working)
- Do you see `[USE_TASK_MESSAGES]` logs? (If not, frontend queries aren't subscribing)
- Does metadata include `parts`?

---

## Step 2: Check Convex Dashboard

1. Go to https://dashboard.convex.dev
2. Select project: veracious-alligator-638
3. Go to Data Explorer
4. Find a chatMessages entry
5. Check the `metadataJson` field:

```json
{
  "isStreaming": false,
  "parts": [
    { "type": "text", "text": "..." },
    { "type": "reasoning", "text": "..." }
  ]
}
```

**What to check:**
- Does metadataJson exist?
- Does it have `parts` array?
- Do parts include `type: "reasoning"` entries?

If no reasoning parts, the backend isn't emitting them.

---

## Step 3: Check Network Tab

1. Open DevTools Network tab
2. Send a message
3. Look for POST requests to `/api/messages/appendStreamDelta`
4. Check response JSON for `parts` field

**What to check:**
- Are appendStreamDelta calls being made?
- Do they include reasoning parts?
- What's the response?

---

## Step 4: Verify Backend Code

The issue might be:

### A. Reasoning delta handler not triggered
Check: Is the AI SDK actually emitting `reasoning-delta` parts?

**Test:**
```typescript
// In convex/streaming.ts, add logging to the delta handler
if (partType === "reasoning-delta") {
  console.log(`[STREAMING] REASONING DELTA:`, JSON.stringify(part).substring(0, 200));
  // ... rest of handler
}
```

### B. Metadata not being updated
Check: Is appendStreamDelta being called with parts?

**Test:**
```typescript
// In convex/streaming.ts, log before calling appendStreamDelta
console.log(`[STREAMING] Calling appendStreamDelta with parts:`, parts);
await ctx.runMutation(api.messages.appendStreamDelta, { ... });
```

### C. Frontend not re-rendering
Check: Is the useQuery hook detecting changes to metadataJson?

**Test:**
Add this to task-content.tsx:
```typescript
useEffect(() => {
  console.log("[TASK_CONTENT] Messages changed:", displayMessages);
  displayMessages.forEach((msg) => {
    if (msg.metadata?.parts) {
      console.log(`[TASK_CONTENT] Message ${msg.id} has parts:`, msg.metadata.parts);
    }
  });
}, [displayMessages]);
```

---

## Step 5: Test with Simpler Model First

Before testing reasoning models:

1. Use `openai/gpt-4o-mini` (non-reasoning)
2. Send simple message: "Say hello"
3. Does it appear in chat?
4. Does streaming work?

If simple model works but reasoning doesn't:
- The issue is with reasoning delta handling
- Check if DeepSeek R1 emits `reasoning-delta` parts

If even simple model doesn't work:
- Issue is with basic streaming
- Check convex/streaming.ts appendStreamDelta calls

---

## Common Issues & Fixes

### Issue: Metadata shows `isStreaming: true` but no parts
**Fix:** The streaming loop completed but appendStreamDelta wasn't called
- Check if reasoning handler is being triggered
- Verify part type is exactly "reasoning-delta" (case-sensitive)

### Issue: No parts array in metadata at all
**Fix:** Metadata initialization or update not working
- Check messages.ts `internalStartStreaming` creates parts: []
- Check appendStreamDelta receives parts parameter

### Issue: Parts exist but don't render
**Fix:** Frontend not mapping reasoning parts correctly
- Check assistant-message.tsx normalizedParts mapping
- Verify ReasoningComponent receiving correct part prop
- Check if isLoading/forceOpen props are set

### Issue: ReasoningComponent renders but shows blank
**Fix:** Part.text is empty or undefined
- Add logging to reason component: console.log("Part:", part)
- Check metadataJson parsing didn't strip text field

---

## Quick Fix Checklist

Run these in order:

1. **[ ] Check browser console for [STREAMING] logs**
   - If missing: Backend not streaming
   - If present: Skip to step 3

2. **[ ] Check Convex Dashboard for parts in metadataJson**
   - If missing: Backend not saving parts
   - If present: Issue is frontend rendering

3. **[ ] Verify ReasoningComponent renders**
   - Add: console.log("Rendering reasoning for:", part)
   - Should see logs in console

4. **[ ] Check DevTools Network for appendStreamDelta calls**
   - Should see multiple requests per message
   - Should include parts in payload

---

## Debug Code to Add

### convex/streaming.ts - Add logging:

```typescript
// After line 1182 (reasoning-delta handler)
if (partType === "reasoning-delta") {
  const reasoningDelta = (part as any).delta ?? (part as any).text ?? "";
  console.log(`[STREAMING_DEBUG] Reasoning-delta part:`, {
    hasText: !!reasoningDelta,
    length: reasoningDelta.length,
    first100: reasoningDelta.substring(0, 100),
  });
  
  if (reasoningDelta) {
    accumulatedReasoning += reasoningDelta;
    console.log(`[STREAMING_DEBUG] Calling appendStreamDelta with parts...`);
    
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
    console.log(`[STREAMING_DEBUG] appendStreamDelta completed`);
  }
}
```

### apps/frontend/components/chat/messages/reasoning.tsx - Add logging:

```typescript
export function ReasoningComponent({
  part,
  isLoading = false,
  forceOpen = false,
}: {
  part: ReasoningPart;
  isLoading?: boolean;
  forceOpen?: boolean;
}) {
  console.log(`[REASONING_COMPONENT] Rendering with:`, {
    partType: part.type,
    textLength: part.text?.length || 0,
    isLoading,
    forceOpen,
    first50: part.text?.substring(0, 50),
  });
  
  const trimmedPart = part.text.trim();
  // ... rest of component
}
```

---

## Run These Commands to Verify

```bash
# 1. Check if reasoning handler is in the deployed code
npx convex run --prod api.streaming:streamChatWithTools '{
  "taskId": "<TASK_ID>",
  "prompt": "Test reasoning",
  "model": "deepseek/deepseek-r1",
  "apiKeys": {"openrouter": "YOUR_KEY"}
}'

# 2. Check messages for parts
npx convex run --prod api.messages:byTask '{"taskId": "<TASK_ID>"}' | jq '.[] | .metadataJson | fromjson | .parts'

# 3. Check raw database
npx convex run --prod api.tables:list | grep metadataJson
```

---

## Next Steps

1. Run diagnostic steps above
2. Share the console logs
3. Check browser DevTools for errors
4. If still stuck, add the debug code and retry

The streaming code is deployed. Just need to find where the data is getting lost!
