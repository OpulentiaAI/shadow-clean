# Complete Deployment Guide: Convex + Streaming Tests + Vercel Production

## 🚀 Deployment Overview

This guide provides step-by-step instructions to deploy the reasoning delta features to production.

## 📋 Prerequisites

- Node.js 20+ installed
- npm installed
- Convex CLI installed (`npm install -g convex`)
- Vercel CLI installed (`npm install -g vercel`)
- GitHub CLI (optional, for triggering workflows)
- Access to repository secrets

## 🔐 Required Secrets

Ensure these are set in your GitHub repository secrets:

- `CONVEX_DEPLOY_KEY`: `prod:veracious-alligator-638|eyJ2MiI6IjM1MTMwYzUyOWQ4NjRlNDE5Y2Y3MDE3MGVlNDA1ZmVmIn0=`
- `OPENROUTER_API_KEY`: Your OpenRouter API key
- `NVIDIA_API_KEY`: Your NVIDIA NIM API key
- `VERCEL_TOKEN`: Your Vercel authentication token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

## 🎯 Deployment Options

### Option 1: Automated GitHub Actions (Recommended)

#### Trigger via GitHub UI:
1. Go to your repository on GitHub
2. Navigate to "Actions" tab
3. Select "Deploy Production" workflow
4. Click "Run workflow"
5. Select options:
   - Deploy to Convex: ✅
   - Run streaming tests: ✅
   - Deploy to Vercel: ✅
6. Click "Run workflow"

#### Trigger via GitHub CLI:
```bash
gh workflow run deploy-production.yml
```

#### Trigger on push to main:
```bash
git add .
git commit -m "Deploy reasoning delta features to production"
git push origin main
```

### Option 2: Manual Deployment

#### Step 1: Deploy to Convex Production

```bash
# Navigate to project root
cd /Users/jeremyalston/shadow-clean

# Generate Convex types
npx convex codegen

# Deploy to Convex production
npx convex deploy --prod

# Verify deployment
curl -s https://veracious-alligator-638.convex.cloud | grep "Convex deployment is running"
```

#### Step 2: Run Streaming Tests

```bash
# Set environment variables
export CONVEX_URL="https://veracious-alligator-638.convex.cloud"
export CONVEX_DEPLOY_KEY="prod:veracious-alligator-638|eyJ2MiI6IjM1MTMwYzUyOWQ4NjRlNDE5Y2Y3MDE3MGVlNDA1ZmVmIn0="
export OPENROUTER_API_KEY="your-openrouter-key"
export NVIDIA_API_KEY="your-nvidia-key"

# Run TypeScript E2E tests
npx tsx tests/e2e_streaming.ts

# Run Python streaming tests
python3 test-streaming-python.py

# Run curl-based tests
./test-streaming-curl.sh
```

#### Step 3: Run Convex CLI Agent Streaming Tests

```bash
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

#### Step 4: Deploy to Vercel Production

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

### Option 3: Using Deployment Script

```bash
# Make script executable
chmod +x deploy-complete.sh

# Run complete deployment
./deploy-complete.sh

# Select option 1 for everything (Convex + Tests + Vercel)
```

## 📊 Deployment Verification

### Verify Convex Deployment

```bash
# Check Convex is running
curl -s https://veracious-alligator-638.convex.cloud

# List deployed functions
npx convex functions --prod

# Check deployment status
npx convex deployment status --prod
```

### Verify Streaming Tests

```bash
# Check test results
cat test-results.log

# Verify reasoning parts are stored
npx convex run --prod messages:byTask '{"taskId":"<task-id>"}' | grep -A 5 '"type":"reasoning"'

# Test streaming endpoint
curl -X POST https://veracious-alligator-638.convex.cloud/api/streaming/streamChatWithTools \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "<task-id>",
    "prompt": "Test reasoning",
    "model": "nim:moonshotai/kimi-k2-thinking",
    "apiKeys": {"nvidia": "<your-key>"}
  }'
```

### Verify Vercel Deployment

```bash
# Check Vercel deployment status
vercel ls --prod

# Test production URL
curl -I https://your-production-url.vercel.app

# Check environment variables
vercel env ls --prod
```

## 🧪 Testing in Production

### Test Reasoning Delta Streaming

1. **Open production URL**: Navigate to your Vercel deployment
2. **Create a new task**: Start a new conversation or task
3. **Send reasoning prompt**: Ask a question that requires step-by-step reasoning
4. **Verify auto-open**: The reasoning component should automatically open during streaming
5. **Verify auto-close**: The component should close when streaming completes
6. **Check content**: Verify reasoning text is properly formatted

### Test NVIDIA NIM Model

```bash
# Test with NVIDIA NIM model
curl -X POST https://veracious-alligator-638.convex.cloud/api/streaming/streamChatWithTools \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "<task-id>",
    "prompt": "What is 15 * 23? Show your reasoning.",
    "model": "nim:moonshotai/kimi-k2-thinking",
    "apiKeys": {"nvidia": "<your-nvidia-key>"}
  }'
```

### Test OpenRouter Model

```bash
# Test with OpenRouter model
curl -X POST https://veracious-alligator-638.convex.cloud/api/streaming/streamChatWithTools \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "<task-id>",
    "prompt": "What is 2+2? Show your reasoning.",
    "model": "deepseek/deepseek-r1",
    "apiKeys": {"openrouter": "<your-openrouter-key>"}
  }'
```

## 🔍 Troubleshooting

### Convex Deployment Issues

**Issue**: Deployment fails with authentication error
```bash
# Solution: Verify deploy key
echo $CONVEX_DEPLOY_KEY

# Re-deploy with explicit key
CONVEX_DEPLOY_KEY="prod:..." npx convex deploy --prod
```

**Issue**: Functions not found
```bash
# Solution: Regenerate types and deploy
npx convex codegen
npx convex deploy --prod
```

### Streaming Test Issues

**Issue**: Tests fail with API key errors
```bash
# Solution: Verify API keys are set
echo $OPENROUTER_API_KEY
echo $NVIDIA_API_KEY

# Test API key validity
curl -H "Authorization: Bearer $NVIDIA_API_KEY" https://integrate.api.nvidia.com/v1/models
```

**Issue**: No reasoning parts found
```bash
# Solution: Check message structure
npx convex run --prod messages:byTask '{"taskId":"<task-id>"}' | jq '.[].metadataJson'

# Verify streaming is enabled
npx convex run --prod streaming:streamChatWithTools '{"sendReasoning":true}'
```

### Vercel Deployment Issues

**Issue**: Build fails
```bash
# Solution: Clean build
rm -rf node_modules .next
npm install
npm run build
vercel --prod
```

**Issue**: Environment variables missing
```bash
# Solution: Set environment variables
vercel env add CONVEX_URL --prod
vercel env add NEXT_PUBLIC_CONVEX_SITE_URL --prod
```

## 📈 Monitoring

### Convex Monitoring

```bash
# View Convex logs
npx convex logs --follow

# Check function performance
npx convex metrics

# Monitor streaming activity
npx convex logs --filter streaming
```

### Vercel Monitoring

```bash
# View Vercel logs
vercel logs --prod

# Check deployment status
vercel inspect --prod

# Monitor performance
vercel analytics
```

## 🎉 Deployment Checklist

- [ ] Convex deployment successful
- [ ] Streaming tests pass
- [ ] Reasoning deltas captured correctly
- [ ] NVIDIA NIM model working
- [ ] OpenRouter model working
- [ ] Vercel deployment successful
- [ ] Production URL accessible
- [ ] Reasoning components auto-open during streaming
- [ ] Reasoning components auto-close when finished
- [ ] Content properly formatted
- [ ] No console errors
- [ ] Performance metrics within thresholds

## 📝 Post-Deployment Steps

1. **Update documentation**: Record deployment details
2. **Monitor logs**: Watch for any issues in first 24 hours
3. **Test functionality**: Verify all features work as expected
4. **Update team**: Notify team of successful deployment
5. **Backup**: Create backup of deployment configuration

## 🔄 Rollback Plan

If issues occur after deployment:

```bash
# Rollback Convex
npx convex deployment rollback <deployment-id>

# Rollback Vercel
vercel rollback --prod

# Or deploy previous commit
git revert <commit-hash>
git push origin main
```

## 📞 Support

If you encounter issues:

1. Check Convex logs: `npx convex logs --follow`
2. Check Vercel logs: `vercel logs --prod`
3. Review GitHub Actions workflow runs
4. Check environment variables
5. Verify API keys are valid

## 🎯 Success Criteria

Deployment is successful when:

- ✅ Convex deployment completes without errors
- ✅ All streaming tests pass
- ✅ Reasoning deltas are captured and stored
- ✅ Vercel deployment completes without errors
- ✅ Production URL is accessible
- ✅ Reasoning components auto-open during streaming
- ✅ Reasoning components auto-close when finished
- ✅ Content is properly formatted and displayed
- ✅ No console errors in production
- ✅ Performance metrics are acceptable

---

**Deployment Status**: Ready to execute
**Last Updated**: 2025-01-10
**Version**: 1.0.0
