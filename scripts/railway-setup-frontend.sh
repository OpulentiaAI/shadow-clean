#!/bin/bash

# Railway Frontend Environment Variables Setup
# Run this script after linking to the shadow-frontend service

echo "🚂 Setting up Railway frontend environment variables..."
echo ""
echo "⚠️  You must run 'railway link' first and select:"
echo "   - Workspace: git-godssoldier's Projects"
echo "   - Project: shadow-clean"
echo "   - Environment: production"
echo "   - Service: shadow-frontend"
echo ""
read -p "Press Enter after you've linked to shadow-frontend service..."

# Check if railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm i -g @railway/cli"
    exit 1
fi

# Check if service is linked
if ! railway status &> /dev/null; then
    echo "❌ No Railway service linked."
    echo "   Please run 'railway link' first to select shadow-frontend service."
    exit 1
fi

echo "Setting environment variables for shadow-frontend..."
echo ""

# Set all environment variables
railway variables \
  --set "GITHUB_CLIENT_ID=placeholder" \
  --set "GITHUB_CLIENT_SECRET=placeholder" \
  --set "GITHUB_APP_USER_ID=placeholder" \
  --set "GITHUB_APP_SLUG=shadow-ai" \
  --set "NEXT_PUBLIC_API_URL=https://shadow-clean-production.up.railway.app" \
  --set "DATABASE_URL=\${{Postgres.DATABASE_URL}}" \
  --set "DIRECT_URL=\${{Postgres.DATABASE_URL}}" \
  --set "NODE_ENV=production"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Environment variables set successfully!"
    echo ""
    echo "🚀 Deploying frontend..."
    railway up -d

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Frontend deployment triggered!"
        echo ""
        echo "Monitor deployment at:"
        echo "https://railway.com/project/dd7038ad-bc3e-493f-bf65-9bb810ad27bd"
    else
        echo ""
        echo "❌ Deployment failed"
    fi
else
    echo ""
    echo "❌ Failed to set environment variables"
    echo "   You may need to set them manually in the Railway dashboard"
fi
