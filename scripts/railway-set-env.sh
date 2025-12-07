#!/bin/bash

# Railway Environment Variables Setup Script
# Run this after linking your service with: railway link

echo "🚂 Setting Railway environment variables..."
echo ""

# Check if railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm i -g @railway/cli"
    exit 1
fi

# Check if service is linked
if ! railway status &> /dev/null; then
    echo "❌ No Railway service linked."
    echo "   Please run 'railway link' first to select your service."
    exit 1
fi

echo "Setting environment variables..."
echo ""

# Set all environment variables
railway variables \
  --set "PINECONE_API_KEY=pcsk_4SKStW_A4LXWoTLbVtp58VnwZFYbUo9YYqwvbUD7cWndkDhfsiRdqoU3nwV8ehqVWchCPi" \
  --set "PINECONE_INDEX_NAME=opulentcode" \
  --set "PINECONE_HOST=https://opulentcode-nvxorhz.svc.aped-4627-b74a.pinecone.io" \
  --set "EMBEDDING_MODEL=text-embedding-3-large" \
  --set "USE_PINECONE=true" \
  --set "OPENROUTER_API_KEY=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" \
  --set "MORPH_API_KEY=sk-fnpiSKi8kqN5AXL5DZdS23B8O6y-oWF3Q2xxIjGYZRjDKOtZ" \
  --set "MORPH_API_BASE_URL=https://api.morphllm.com/v1" \
  --set "MORPH_GIT_PROXY_URL=https://git.morphllm.com" \
  --set "BRAINTRUST_API_KEY=sk-gHMKTQjyi4qc2CGe74XcHJK38UB9yc0aKYsu1mus9Bebm1BD" \
  --set "ENABLE_BRAINTRUST=true" \
  --set "NODE_ENV=production" \
  --set "AGENT_MODE=local" \
  --set "WORKSPACE_DIR=/workspace"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Environment variables set successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Verify variables with: railway variables"
    echo "2. Deploy with: railway up --detach"
    echo "3. Run migrations with: railway run npm run db:prod:migrate"
else
    echo ""
    echo "❌ Failed to set environment variables"
    echo "   You may need to set them manually in the Railway dashboard"
fi
