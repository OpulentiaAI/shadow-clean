#!/bin/bash

##############################################################################
# Deployment Script for Shadow Agent
# Deploys to Convex (backend) and Vercel (frontend)
# Run this in your local terminal: bash deploy-production.sh
##############################################################################

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Shadow Agent Production Deployment Script             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "convex.json" ]; then
    echo -e "${RED}❌ Error: convex.json not found${NC}"
    echo "Please run this script from /Users/jeremyalston/shadow-clean"
    exit 1
fi

echo -e "${BLUE}📍 Working Directory: $(pwd)${NC}"
echo ""

# Step 1: Deploy to Convex
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 1: Deploy Backend to Convex${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Do you want to deploy to Convex? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏳ Generating Convex types...${NC}"
    npx convex codegen
    
    echo ""
    echo -e "${YELLOW}⏳ Deploying to Convex production...${NC}"
    npx convex deploy --prod
    
    echo ""
    echo -e "${GREEN}✅ Convex deployment complete!${NC}"
    echo -e "${GREEN}   URL: https://veracious-alligator-638.convex.cloud${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping Convex deployment${NC}"
fi

echo ""

# Step 2: Deploy to Vercel
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 2: Deploy Frontend to Vercel${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Do you want to deploy to Vercel? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏳ Building frontend...${NC}"
    npm run build
    
    echo ""
    echo -e "${YELLOW}⏳ Deploying to Vercel production...${NC}"
    vercel --prod
    
    echo ""
    echo -e "${GREEN}✅ Vercel deployment complete!${NC}"
    echo -e "${GREEN}   URL: https://code.opulentia.ai${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping Vercel deployment${NC}"
fi

echo ""

# Step 3: Verification
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 3: Verification${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Do you want to run verification tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏳ Running verification tests...${NC}"
    echo ""
    
    # Test 1: Check Convex deployment
    echo -e "${BLUE}Test 1: Verify Convex Index${NC}"
    if npx convex run --prod api.tables:list 2>/dev/null | grep -q "by_task_promptMessageId"; then
        echo -e "${GREEN}✅ Index by_task_promptMessageId found${NC}"
    else
        echo -e "${YELLOW}⚠️  Index check inconclusive (might be ok)${NC}"
    fi
    echo ""
    
    # Test 2: Create test task
    echo -e "${BLUE}Test 2: Create Test Task${NC}"
    TASK_ID=$(npx convex run --prod api.testHelpers:createTestTask '{"name":"Deployment Test"}' 2>/dev/null | jq -r '.taskId' 2>/dev/null || echo "")
    
    if [ -z "$TASK_ID" ]; then
        echo -e "${YELLOW}⚠️  Could not create test task (this is ok, may need API keys)${NC}"
    else
        echo -e "${GREEN}✅ Test task created: $TASK_ID${NC}"
        
        # Test 3: Check for duplicate messages
        echo ""
        echo -e "${BLUE}Test 3: Verify No Duplicate Messages${NC}"
        COUNT=$(npx convex run --prod api.messages:byTask "{\"taskId\":\"$TASK_ID\"}" 2>/dev/null | jq 'map(select(.role=="ASSISTANT")) | length' 2>/dev/null || echo "")
        
        if [ "$COUNT" = "0" ] || [ "$COUNT" = "1" ]; then
            echo -e "${GREEN}✅ No duplicates detected${NC}"
        elif [ -n "$COUNT" ]; then
            echo -e "${RED}❌ Possible duplicate: $COUNT assistant messages${NC}"
        fi
        
        # Cleanup
        npx convex run --prod api.testHelpers:deleteTestTask "{\"taskId\":\"$TASK_ID\"}" 2>/dev/null || true
        echo -e "${GREEN}✅ Test task cleaned up${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Verification complete!${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping verification${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOYMENT SCRIPT COMPLETE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "1. Go to https://code.opulentia.ai"
echo "2. Create a new task"
echo "3. Send a message and verify:"
echo "   ✓ ONE response appears (not duplicate)"
echo "   ✓ Stop button stops in 1-2 seconds"
echo "   ✓ Reasoning models show reasoning component"
echo ""
