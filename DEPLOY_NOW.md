# Deploy to Convex & Vercel - CLI Guide

## ⚠️ Prerequisites

Ensure you have installed locally:
- Node.js 18+ (`node --version`)
- npm (`npm --version`)
- Convex CLI (`npx convex --version`)
- Vercel CLI (`vercel --version`)

## 📋 Deploy Steps

### Step 1: Deploy to Convex (5 minutes)

Open terminal in your local project directory:

```bash
cd /Users/jeremyalston/shadow-clean

# Generate Convex types
npx convex codegen

# Deploy to production
npx convex deploy --prod
```

Expected output:
```
✓ Deploying project...
✓ Deployed successfully
✓ Production: https://veracious-alligator-638.convex.cloud
```

**What deploys:**
- ✅ Reasoning delta handling
- ✅ Database index for no duplicates
- ✅ Stop button functionality
- ✅ Stream processing improvements

---

### Step 2: Test Convex Deployment (2 minutes)

**Test 1: No Duplicate Messages**
```bash
# Create test task
TASK_ID=$(npx convex run --prod api.testHelpers:createTestTask '{"name":"Test"}' | jq -r '.taskId')

# Send message
npx convex run --prod api.streaming:streamChatWithTools '{
  "taskId":"'$TASK_ID'",
  "prompt":"What is 2+2?",
  "model":"openai/gpt-4o-mini",
  "apiKeys":{"openrouter":"YOUR_OPENROUTER_KEY"}
}'

# Verify: Only ONE assistant message should appear
npx convex run --prod api.messages:byTask '{"taskId":"'$TASK_ID'"}' | jq '.[] | select(.role=="ASSISTANT") | ._id' | wc -l
# Should output: 1

# Cleanup
npx convex run --prod api.testHelpers:deleteTestTask '{"taskId":"'$TASK_ID'"}'
```

**Test 2: Reasoning Deltas**
```bash
# Create test task
TASK_ID=$(npx convex run --prod api.testHelpers:createTestTask '{"name":"Reasoning Test"}' | jq -r '.taskId')

# Send prompt to reasoning model
npx convex run --prod api.streaming:streamChatWithTools '{
  "taskId":"'$TASK_ID'",
  "prompt":"What is 15 * 23? Show your reasoning.",
  "model":"deepseek/deepseek-r1",
  "apiKeys":{"openrouter":"YOUR_OPENROUTER_KEY"}
}'

# Check for reasoning parts in response
npx convex run --prod api.messages:byTask '{"taskId":"'$TASK_ID'"}' | jq '.[] | select(.role=="ASSISTANT") | .metadata.parts[] | select(.type=="reasoning")'

# Cleanup
npx convex run --prod api.testHelpers:deleteTestTask '{"taskId":"'$TASK_ID'"}'
```

---

### Step 3: Deploy to Vercel (3 minutes)

```bash
# Build the project
npm run build

# Deploy to production
vercel --prod

# Verify deployment
echo "Frontend deployed to: https://code.opulentia.ai"
```

Expected output:
```
✓ Production: https://code.opulentia.ai [5s]
✓ Aliased to: https://code.opulentia.ai
```

---

## 🔍 Verification Checklist

After deployment, verify everything works:

### ✅ Test 1: No Duplicate Messages
1. Go to https://code.opulentia.ai
2. Create new task
3. Send: "What is 2+2?"
4. **Expected**: One message pair (user + assistant)
5. **NOT Expected**: Two identical assistant responses

**Debug**: Check browser console - should NOT see duplicate messageIds

### ✅ Test 2: Stop Button Works
1. Send: "Write 100 lines of Python code..."
2. Click Stop button immediately
3. **Expected**: Response stops within 1-2 seconds
4. **Expected**: Partial content preserved
5. **NOT Expected**: Full response generated after clicking stop

**Debug**: 
```bash
# Check logs for this pattern
npx convex run --prod api.logs:search '{"pattern":"Task was stopped","limit":5}'
```

### ✅ Test 3: Reasoning Streams
1. Select model: "deepseek/deepseek-r1" (or other reasoning model)
2. Send: "What is 2+2? Show your reasoning."
3. **Expected**: "Reasoning" component appears and streams
4. **Expected**: Component auto-opens during streaming
5. **Expected**: Component auto-closes after response

**Debug**: 
```bash
# Check for reasoning parts
npx convex run --prod api.messages:byTask '{"taskId":"TASK_ID"}' | jq '.[] | .metadata.parts | map(select(.type=="reasoning")) | length'
# Should be > 0 for reasoning models
```

### ✅ Test 4: Idempotency
1. Send message with clientMessageId
2. Simulate retry (same clientMessageId)
3. **Expected**: Same prompt message ID
4. **NOT Expected**: Duplicate prompt messages

---

## 🐛 Troubleshooting

### Convex Deploy Fails
```
❌ "No Convex deployment configuration found"
```

**Solution**: Ensure you're in the project root and have `convex.json`:
```bash
cd /Users/jeremyalston/shadow-clean
ls convex.json  # Should exist
npx convex codegen
npx convex deploy --prod
```

### Tests Show No Results
```
❌ "No reasoning parts found"
❌ "Multiple assistant messages"
```

**Solution**: Wait 5-10 seconds for Convex to sync changes, then retry tests.

### Vercel Deploy Fails
```
❌ "Not logged in"
```

**Solution**: 
```bash
vercel logout
vercel login
vercel --prod
```

---

## 📊 Expected Results

### Before Deploy
- ❌ Multiple responses for single prompt
- ❌ Stop button doesn't stop
- ❌ No reasoning display

### After Deploy
- ✅ Single response per prompt
- ✅ Stop button stops within 1-2 seconds
- ✅ Reasoning models show reasoning component
- ✅ Partial content preserved on stop
- ✅ No console errors

---

## 🔐 Required API Keys

For testing reasoning models, you may need:

**OpenRouter** (for most models):
```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
```

**NVIDIA NIM** (for Kimi K2-Thinking):
```bash
export NVIDIA_API_KEY="nvapi-..."
```

**Fireworks** (alternative provider):
```bash
export FIREWORKS_API_KEY="fw_..."
```

---

## 📝 Summary

| Step | Time | Command |
|------|------|---------|
| 1 | 5m | `npx convex deploy --prod` |
| 2 | 2m | Run verification tests |
| 3 | 3m | `vercel --prod` |
| 4 | 5m | Manual verification in UI |
| **Total** | **15m** | **Full deployment** |

---

## 🎯 Next Steps

After successful deployment:

1. **Monitor logs**:
   ```bash
   npx convex logs
   ```

2. **Track usage**:
   - Multiple response fix: `[MESSAGES] Found existing assistant...`
   - Stop button: `[STREAMING] Task was stopped...`
   - Reasoning: `[STREAMING] Reasoning delta received...`

3. **Report success**: All tests passing ✅

---

## 📞 Support

If deployment fails:
1. Check error message carefully
2. Verify you're in `/Users/jeremyalston/shadow-clean`
3. Ensure all prerequisites installed
4. Check `DEPLOYMENT_COMPLETE.md` for detailed info
5. Review `FIXES_MULTIPLE_RESPONSES_ABORT.md` for what was changed

---

**Status**: Ready to deploy  
**Frontend**: https://code.opulentia.ai (already live)  
**Backend**: Ready for `npx convex deploy --prod`  
**Tests**: Ready to verify
