# ✅ Deployment Checklist

Use this checklist to track your deployment progress.

---

## 🔧 Pre-Deployment Setup

- [ ] Open local terminal
- [ ] Navigate to: `/Users/jeremyalston/shadow-clean`
- [ ] Verify Node.js: `node --version` (should be 18+)
- [ ] Verify npm: `npm --version` (should work)
- [ ] Verify convex CLI: `npx convex --version` (should work)
- [ ] Verify vercel CLI: `vercel --version` (should work)

---

## 🚀 Deployment Steps

### Option A: Automated Script

- [ ] Make script executable:
  ```bash
  chmod +x deploy-production.sh
  ```

- [ ] Run the script:
  ```bash
  ./deploy-production.sh
  ```

- [ ] When prompted "Deploy to Convex?": Answer **yes**
  - Wait for: `✓ Deployed successfully`

- [ ] When prompted "Deploy to Vercel?": Answer **yes**
  - Wait for: `✓ Production: https://code.opulentia.ai`

- [ ] When prompted "Run verification tests?": Answer **yes**
  - Wait for: `✓ Verification complete!`

---

### Option B: Manual Commands

If script doesn't work, run manually:

- [ ] Generate Convex types:
  ```bash
  npx convex codegen
  ```
  - Expected: No errors

- [ ] Deploy to Convex:
  ```bash
  npx convex deploy --prod
  ```
  - Expected: `✓ Deployed successfully`

- [ ] Build frontend:
  ```bash
  npm run build
  ```
  - Expected: `✓ Built successfully`

- [ ] Deploy to Vercel:
  ```bash
  vercel --prod
  ```
  - Expected: `✓ Production: https://code.opulentia.ai`

---

## ✅ Verification in Browser

Open: https://code.opulentia.ai

### Test 1: No Duplicate Messages

- [ ] Click "Create new task"
- [ ] Type message: "What is 2+2?"
- [ ] Send the message
- [ ] Check chat history:
  - [ ] ONE user message
  - [ ] ONE assistant message
  - [ ] NOT two identical responses

**Expected**: Single message pair appears

---

### Test 2: Stop Button Works

- [ ] Click "Create new task"
- [ ] Select a fast model (e.g., gpt-4o-mini)
- [ ] Type long message: "Write 100 lines of Python code for a todo list app with full features"
- [ ] Click Send
- [ ] Wait 1-2 seconds for response to start
- [ ] Click Stop button
- [ ] Check results:
  - [ ] Response stops immediately (within 1-2 seconds)
  - [ ] Partial content is visible
  - [ ] Message is marked "complete" (not "failed")

**Expected**: Streaming halts, partial content shown

---

### Test 3: Reasoning Streams

- [ ] Click "Create new task"
- [ ] Select model: "deepseek/deepseek-r1"
  - OR "nim:moonshotai/kimi-k2-thinking" if available
- [ ] Send message: "What is 15 * 23? Show your reasoning step by step."
- [ ] Observe chat:
  - [ ] "Reasoning" component appears in the chat
  - [ ] Component is expanded/open automatically
  - [ ] Reasoning content starts streaming
  - [ ] Final response appears after reasoning
  - [ ] Component auto-closes when done

**Expected**: Reasoning component visible with streaming content

---

### Test 4: No Console Errors

- [ ] Open browser DevTools: F12 or Right-click → Inspect
- [ ] Go to Console tab
- [ ] Perform all tests above
- [ ] Check:
  - [ ] No red error messages
  - [ ] No warnings about missing props
  - [ ] No network errors

**Expected**: Clean console, no errors

---

## 🔍 Advanced Verification (Optional)

If you have API keys and want to run CLI tests:

- [ ] Set environment variables:
  ```bash
  export OPENROUTER_API_KEY="sk-or-v1-..."
  export NVIDIA_API_KEY="nvapi-..."
  ```

- [ ] Test via CLI:
  ```bash
  # Test 1: Check for duplicates
  TASK_ID=$(npx convex run --prod api.testHelpers:createTestTask '{"name":"Test"}' | jq -r '.taskId')
  
  # Send message
  npx convex run --prod api.streaming:streamChatWithTools '{
    "taskId":"'$TASK_ID'",
    "prompt":"What is 2+2?",
    "model":"openai/gpt-4o-mini",
    "apiKeys":{"openrouter":"YOUR_KEY"}
  }'
  
  # Count responses (should be 1)
  npx convex run --prod api.messages:byTask '{"taskId":"'$TASK_ID'"}' | jq '[.[] | select(.role=="ASSISTANT")] | length'
  
  # Cleanup
  npx convex run --prod api.testHelpers:deleteTestTask '{"taskId":"'$TASK_ID'"}'
  ```

- [ ] Test reasoning:
  ```bash
  # Create task
  TASK_ID=$(npx convex run --prod api.testHelpers:createTestTask '{"name":"Reasoning"}' | jq -r '.taskId')
  
  # Send to reasoning model
  npx convex run --prod api.streaming:streamChatWithTools '{
    "taskId":"'$TASK_ID'",
    "prompt":"What is 15 * 23?",
    "model":"deepseek/deepseek-r1",
    "apiKeys":{"openrouter":"YOUR_KEY"}
  }'
  
  # Check for reasoning parts (should be > 0)
  npx convex run --prod api.messages:byTask '{"taskId":"'$TASK_ID'"}' | jq '.[] | select(.role=="ASSISTANT") | .metadata.parts | map(select(.type=="reasoning")) | length'
  
  # Cleanup
  npx convex run --prod api.testHelpers:deleteTestTask '{"taskId":"'$TASK_ID'"}'
  ```

- [ ] Results verify correctly

---

## 📊 Deployment Summary

After all checks pass, you're done! 🎉

| Component | Status |
|-----------|--------|
| Convex Backend | ✅ Deployed |
| Vercel Frontend | ✅ Deployed |
| No Duplicates | ✅ Verified |
| Stop Button | ✅ Verified |
| Reasoning Streams | ✅ Verified |
| No Console Errors | ✅ Verified |

---

## 🐛 Troubleshooting

If any check fails, see the troubleshooting section:

| Problem | Solution |
|---------|----------|
| `npx: command not found` | Install Node.js from nodejs.org |
| Convex deploy fails | Run `npx convex codegen` first |
| Vercel deploy fails | Run `vercel login` first |
| Tests show duplicates | Wait 10s for sync, check database index exists |
| No reasoning content | Verify API key provided, wait for model response |
| Stop button doesn't work | Check browser console for errors, verify Convex deployed |

See **DEPLOY_INSTRUCTIONS.md** for detailed troubleshooting.

---

## 📝 Notes

- Deployment takes ~15-20 minutes total
- Convex deploy: ~5 minutes
- Vercel build: ~2-3 minutes
- Tests: ~5 minutes
- Manual verification: ~5 minutes

---

## ✨ Success Criteria

Deployment is **SUCCESSFUL** when:

1. ✅ No errors during `npx convex deploy --prod`
2. ✅ No errors during `vercel --prod`
3. ✅ Single response per prompt (no duplicates)
4. ✅ Stop button stops streaming in 1-2 seconds
5. ✅ Reasoning component appears for reasoning models
6. ✅ Reasoning content streams in real-time
7. ✅ Browser console has no errors
8. ✅ All features work as described

---

**When all boxes are checked, you're done! 🚀**

For questions, see the documentation:
- **DEPLOY_INSTRUCTIONS.md** - Detailed guide
- **README_DEPLOYMENT.md** - Overview
- **REASONING_DELTAS_IMPLEMENTATION.md** - Technical details
