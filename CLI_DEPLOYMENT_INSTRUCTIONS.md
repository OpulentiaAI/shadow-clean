# 🚀 CLI Deployment Instructions

## Execute These Commands in Your Local Terminal

### **OPTION 1: Automated Script (RECOMMENDED)**

```bash
cd /Users/jeremyalston/shadow-clean

# Make script executable (if not already)
chmod +x deploy-cli.sh

# Run the deployment script
./deploy-cli.sh

# Select option 1 for everything (Convex + Tests + Vercel)
```

---

### **OPTION 2: Manual Commands**

#### **STEP 1: Deploy to Convex Production**

```bash
cd /Users/jeremyalston/shadow-clean

# Generate Convex types
npx convex codegen

# Deploy to Convex production
npx convex deploy --prod

# Verify deployment
curl -s https://veracious-alligator-638.convex.cloud | grep "Convex deployment is running"
```

#### **STEP 2: Run Convex CLI Agent Streaming Tests**

```bash
# Set environment variables (replace with your actual keys)
export OPENROUTER_API_KEY="your-openrouter-key"
export NVIDIA_API_KEY="your-nvidia-key"

# Create test task
TASK_ID=$(npx convex run --prod testHelpers:createTestTask '{"name":"CLI Streaming Test"}' | grep -o '"taskId":"[^"]*"' | cut -d'"' -f4)
echo "Test task created: $TASK_ID"

# Test NVIDIA NIM streaming
npx convex run --prod streaming:streamChatWithTools "{
  \"taskId\": \"$TASK_ID\",
  \"prompt\": \"What is 15 * 23? Show your reasoning step by step.\",
  \"model\": \"nim:moonshotai/kimi-k2-thinking\",
  \"llmModel\": \"nim:moonshotai/kimi-k2-thinking\",
  \"apiKeys\": {\"nvidia\": \"$NVIDIA_API_KEY\"},
  \"clientMessageId\": \"cli-test-$(date +%s)\"
}"

# Test OpenRouter streaming
npx convex run --prod streaming:streamChatWithTools "{
  \"taskId\": \"$TASK_ID\",
  \"prompt\": \"What is 2+2? Show your reasoning.\",
  \"model\": \"deepseek/deepseek-r1\",
  \"llmModel\": \"deepseek/deepseek-r1\",
  \"apiKeys\": {\"openrouter\": \"$OPENROUTER_API_KEY\"},
  \"clientMessageId\": \"cli-test-$(date +%s)\"
}"

# Verify reasoning parts
npx convex run --prod messages:byTask "{\"taskId\": \"$TASK_ID\"}" | grep '"type":"reasoning"'

# Cleanup test task
npx convex run --prod testHelpers:deleteTestTask "{\"taskId\": \"$TASK_ID\"}"
```

#### **STEP 3: Deploy to Vercel Production**

```bash
# Build project
npm install
npm run generate
npm run build

# Deploy to Vercel
cd apps/frontend
vercel --prod
cd ../..

# Get deployment URL
vercel ls --prod
```

---

## 📋 Quick Reference Commands

### **Convex Commands**
```bash
# Deploy to Convex
npx convex deploy --prod

# List deployed functions
npx convex functions --prod

# View Convex logs
npx convex logs --follow

# Check deployment status
npx convex deployment status --prod
```

### **Vercel Commands**
```bash
# Deploy to Vercel production
vercel --prod

# List deployments
vercel ls --prod

# View logs
vercel logs --prod

# Check environment variables
vercel env ls --prod
```

---

## 🔑 Required Environment Variables

```bash
# Set these before running tests
export OPENROUTER_API_KEY="your-openrouter-key"
export NVIDIA_API_KEY="your-nvidia-key"
```

---

## ✅ Verification

After deployment, verify:

```bash
# Check Convex is running
curl -s https://veracious-alligator-638.convex.cloud

# Test production URL (replace with actual URL)
curl -I https://your-production-url.vercel.app
```

---

## 🚨 Troubleshooting

### **If Convex deployment fails:**
```bash
# Verify Convex CLI is installed
npx convex --version

# Regenerate types
npx convex codegen

# Re-deploy
npx convex deploy --prod
```

### **If Vercel deployment fails:**
```bash
# Verify Vercel CLI is installed
vercel --version

# Clean build
rm -rf node_modules .next
npm install
npm run build
vercel --prod
```

### **If tests fail:**
```bash
# Verify API keys are set
echo $OPENROUTER_API_KEY
echo $NVIDIA_API_KEY

# Check Convex logs
npx convex logs --follow
```

---

## 📝 Deployment Checklist

- [ ] Convex deployment successful
- [ ] Streaming tests pass
- [ ] Reasoning deltas captured
- [ ] Vercel deployment successful
- [ ] Production URL accessible
- [ ] Auto-open during streaming works
- [ ] Auto-close when finished works

---

**Execute the automated script or manual commands above in your local terminal!**
