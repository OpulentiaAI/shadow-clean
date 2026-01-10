# 🚀 Deployment Instructions

## ⚠️ Important: Run Locally

The deployment commands must be run in **your local terminal**, not in this environment (CLI tools not available).

---

## 📍 Setup

1. **Navigate to project directory**:
   ```bash
   cd /Users/jeremyalston/shadow-clean
   ```

2. **Ensure prerequisites**:
   ```bash
   node --version          # Should be 18+
   npm --version           # Should be 8+
   npx convex --version    # Should work
   vercel --version        # Should work
   ```

   If any fail, install Node.js from nodejs.org

---

## 🚀 Option 1: Automated Script (RECOMMENDED)

**Make it executable**:
```bash
chmod +x deploy-production.sh
```

**Run the script**:
```bash
./deploy-production.sh
```

The script will:
1. Ask if you want to deploy to Convex
2. Ask if you want to deploy to Vercel
3. Ask if you want to run verification tests
4. Show results

---

## 🚀 Option 2: Manual Commands

### Step 1: Deploy Backend to Convex (5 min)

```bash
cd /Users/jeremyalston/shadow-clean

# Generate Convex types
npx convex codegen

# Deploy to production
npx convex deploy --prod
```

**Expected output**:
```
✓ Deploying project...
✓ Deployed successfully
✓ Production: https://veracious-alligator-638.convex.cloud
```

---

### Step 2: Deploy Frontend to Vercel (3 min)

```bash
# Build the project
npm run build

# Deploy to production
vercel --prod
```

**Expected output**:
```
✓ Production: https://code.opulentia.ai
✓ Build time: ~2 minutes
```

---

### Step 3: Verify Deployment (5 min)

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

# Count assistant messages (should be 1)
npx convex run --prod api.messages:byTask '{"taskId":"'$TASK_ID'"}' | jq '[.[] | select(.role=="ASSISTANT")] | length'

# Cleanup
npx convex run --prod api.testHelpers:deleteTestTask '{"taskId":"'$TASK_ID'"}'
```

**Test 2: Reasoning Deltas**
```bash
# Create test task
TASK_ID=$(npx convex run --prod api.testHelpers:createTestTask '{"name":"Reasoning Test"}' | jq -r '.taskId')

# Send to reasoning model
npx convex run --prod api.streaming:streamChatWithTools '{
  "taskId":"'$TASK_ID'",
  "prompt":"What is 15 * 23? Show your reasoning.",
  "model":"deepseek/deepseek-r1",
  "apiKeys":{"openrouter":"YOUR_OPENROUTER_KEY"}
}'

# Check for reasoning parts (should have some)
npx convex run --prod api.messages:byTask '{"taskId":"'$TASK_ID'"}' | jq '.[] | select(.role=="ASSISTANT") | .metadata.parts | map(select(.type=="reasoning")) | length'

# Cleanup
npx convex run --prod api.testHelpers:deleteTestTask '{"taskId":"'$TASK_ID'"}'
```

---

## ✅ Verification Checklist

After deployment, verify in the UI:

### Test 1: No Duplicate Messages
- [ ] Go to https://code.opulentia.ai
- [ ] Create new task
- [ ] Send: "What is 2+2?"
- [ ] **Expected**: ONE message pair (user + assistant)
- [ ] **NOT Expected**: Two identical responses

### Test 2: Stop Button Works
- [ ] Send: "Write 100 lines of Python code..."
- [ ] Click Stop button immediately
- [ ] **Expected**: Stops within 1-2 seconds
- [ ] **Expected**: Partial content shown
- [ ] **NOT Expected**: Full response after clicking stop

### Test 3: Reasoning Streams
- [ ] Select model: "deepseek/deepseek-r1"
- [ ] Send: "What is 2+2? Show your reasoning."
- [ ] **Expected**: "Reasoning" component appears
- [ ] **Expected**: Reasoning content streams
- [ ] **Expected**: Component auto-closes when done

---

## 🐛 Troubleshooting

### `npx: command not found`
```bash
# Install Node.js from nodejs.org
# Then try again
npx convex --version
```

### `convex: command not found`
```bash
npm install -g convex
npx convex deploy --prod
```

### Convex deploy fails with "No deployment configuration"
```bash
# Make sure you're in the right directory
cd /Users/jeremyalston/shadow-clean
ls convex.json  # Should exist

# Try again
npx convex codegen
npx convex deploy --prod
```

### Vercel deploy fails with "Not logged in"
```bash
vercel logout
vercel login
vercel --prod
```

### Tests show no reasoning parts
```bash
# Wait 10 seconds for Convex to sync
sleep 10

# Retry the test
# The reasoning model should emit reasoning-delta parts
```

---

## 📊 What Gets Deployed

### Convex Backend
- ✅ Schema: `by_task_promptMessageId` index
- ✅ Reasoning delta handlers
- ✅ Task status check in streaming loop
- ✅ Stop button functionality
- ✅ Idempotent message creation

### Vercel Frontend
- ✅ ReasoningComponent UI
- ✅ Stop button wiring
- ✅ Type definitions
- ✅ Error handling

---

## 📝 Expected Results

### Before Deployment
```
❌ Multiple responses for single prompt
❌ Stop button doesn't work
❌ No reasoning display
```

### After Deployment
```
✅ Single response per prompt
✅ Stop works (1-2 seconds)
✅ Reasoning models show reasoning
✅ Partial content on stop
✅ No console errors
```

---

## 🔑 Required API Keys (for testing)

For full testing with reasoning models:

**OpenRouter** (most models):
```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
```

**NVIDIA NIM** (Kimi K2-Thinking):
```bash
export NVIDIA_API_KEY="nvapi-..."
```

**Fireworks** (alternative):
```bash
export FIREWORKS_API_KEY="fw_..."
```

---

## 📚 Documentation

- **QUICK_DEPLOY.md** - Quick reference
- **DEPLOY_NOW.md** - Detailed guide
- **REASONING_DELTAS_IMPLEMENTATION.md** - Technical details
- **FIXES_MULTIPLE_RESPONSES_ABORT.md** - Bug fixes
- **agents.md** - Architecture updates

---

## ⏱️ Time Estimate

| Step | Time |
|------|------|
| Convex deploy | 5 min |
| Vercel build & deploy | 3 min |
| Verification tests | 5 min |
| Manual UI testing | 5 min |
| **Total** | **~18 min** |

---

## 🎯 Summary

1. **Run locally** (in your terminal, not here):
   ```bash
   cd /Users/jeremyalston/shadow-clean
   ./deploy-production.sh
   ```

2. **Or manually**:
   ```bash
   npx convex deploy --prod
   vercel --prod
   ```

3. **Verify** in https://code.opulentia.ai

That's it! 🚀
