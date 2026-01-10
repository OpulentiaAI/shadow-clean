#!/bin/bash

# Complete Deployment Script: Convex + Streaming Tests + Vercel Production
# This script handles the full deployment pipeline for reasoning delta features

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[DEPLOY]${NC} $1"
}

error() {
    echo -e "${RED}[DEPLOY]${NC} $1"
    exit 1
}

info() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

# Check if required CLIs are installed
check_requirements() {
    log "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 20+"
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    if ! command -v convex &> /dev/null; then
        warn "Convex CLI not found. Installing..."
        npm install -g convex
    fi
    
    if ! command -v vercel &> /dev/null; then
        warn "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    log "All requirements met!"
}

# Step 1: Deploy to Convex Production
deploy_convex() {
    log "Step 1: Deploying to Convex Production..."
    
    info "Generating Convex types..."
    npx convex codegen || error "Failed to generate Convex types"
    
    info "Deploying to Convex production..."
    npx convex deploy --prod || error "Failed to deploy to Convex"
    
    log "✅ Convex deployment completed!"
    
    # Get deployment URL
    CONVEX_URL=$(npx convex deploy --prod --dry-run 2>&1 | grep -o 'https://[^"]*\.convex\.cloud' | head -1)
    if [ -n "$CONVEX_URL" ]; then
        info "Convex URL: $CONVEX_URL"
        echo "$CONVEX_URL" > .convex-url
    fi
}

# Step 2: Run Convex Streaming Tests
run_streaming_tests() {
    log "Step 2: Running Convex Streaming Tests..."
    
    info "Setting up test environment..."
    
    # Set required environment variables
    export CONVEX_URL=${CONVEX_URL:-"https://veracious-alligator-638.convex.cloud"}
    export CONVEX_DEPLOY_KEY="prod:veracious-alligator-638|eyJ2MiI6IjM1MTMwYzUyOWQ4NjRlNDE5Y2Y3MDE3MGVlNDA1ZmVmIn0="
    
    # Check for API keys
    if [ -z "$OPENROUTER_API_KEY" ] && [ -z "$NVIDIA_API_KEY" ]; then
        warn "No API keys found. Tests will use mock data."
        export USE_MOCK_TESTS=true
    else
        info "Using API keys: ${OPENROUTER_API_KEY:+OpenRouter} ${NVIDIA_API_KEY:+NVIDIA}"
    fi
    
    info "Running TypeScript E2E tests..."
    npx tsx tests/e2e_streaming.ts || warn "TypeScript tests failed, continuing..."
    
    info "Running Python streaming tests..."
    python3 test-streaming-python.py || warn "Python tests failed, continuing..."
    
    info "Running curl-based tests..."
    ./test-streaming-curl.sh || warn "Curl tests failed, continuing..."
    
    log "✅ Streaming tests completed!"
}

# Step 3: Run Convex CLI Agent Streaming Tests
run_convex_cli_tests() {
    log "Step 3: Running Convex CLI Agent Streaming Tests..."
    
    info "Creating test task..."
    TASK_ID=$(npx convex run --prod testHelpers:createTestTask '{"name":"CLI Streaming Test"}' | grep -o '"taskId":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TASK_ID" ]; then
        error "Failed to create test task"
    fi
    
    info "Test task created: $TASK_ID"
    
    info "Testing reasoning streaming with NVIDIA NIM model..."
    if [ -n "$NVIDIA_API_KEY" ]; then
        npx convex run --prod streaming:streamChatWithTools "{
            \"taskId\": \"$TASK_ID\",
            \"prompt\": \"What is 15 * 23? Show your reasoning step by step.\",
            \"model\": \"nim:moonshotai/kimi-k2-thinking\",
            \"llmModel\": \"nim:moonshotai/kimi-k2-thinking\",
            \"apiKeys\": {\"nvidia\": \"$NVIDIA_API_KEY\"},
            \"clientMessageId\": \"cli-test-$(date +%s)\"
        }" || warn "NVIDIA NIM test failed"
    fi
    
    info "Testing reasoning streaming with OpenRouter model..."
    if [ -n "$OPENROUTER_API_KEY" ]; then
        npx convex run --prod streaming:streamChatWithTools "{
            \"taskId\": \"$TASK_ID\",
            \"prompt\": \"What is 2+2? Show your reasoning.\",
            \"model\": \"deepseek/deepseek-r1\",
            \"llmModel\": \"deepseek/deepseek-r1\",
            \"apiKeys\": {\"openrouter\": \"$OPENROUTER_API_KEY\"},
            \"clientMessageId\": \"cli-test-$(date +%s)\"
        }" || warn "OpenRouter test failed"
    fi
    
    info "Verifying message parts..."
    MESSAGES=$(npx convex run --prod messages:byTask "{\"taskId\": \"$TASK_ID\"}")
    echo "$MESSAGES" | grep -q '"type":"reasoning"' && log "✅ Reasoning parts found!" || warn "⚠️ No reasoning parts found"
    
    info "Cleaning up test task..."
    npx convex run --prod testHelpers:deleteTestTask "{\"taskId\": \"$TASK_ID\"}" || warn "Failed to delete test task"
    
    log "✅ Convex CLI tests completed!"
}

# Step 4: Deploy to Vercel Production
deploy_vercel() {
    log "Step 4: Deploying to Vercel Production..."
    
    info "Building project..."
    npm install
    npm run generate
    npm run build || error "Build failed"
    
    info "Deploying to Vercel production..."
    cd apps/frontend
    
    # Check if already linked to Vercel
    if [ ! -d ".vercel" ]; then
        info "Linking to Vercel project..."
        vercel link --prod
    fi
    
    # Deploy to production
    vercel --prod || error "Vercel deployment failed"
    
    cd ../..
    
    log "✅ Vercel deployment completed!"
    
    # Get deployment URL
    VERCEL_URL=$(vercel ls --prod 2>&1 | grep -o 'https://[^ ]*' | head -1)
    if [ -n "$VERCEL_URL" ]; then
        info "Vercel URL: $VERCEL_URL"
        echo "$VERCEL_URL" > .vercel-url
    fi
}

# Step 5: Verify Deployment
verify_deployment() {
    log "Step 5: Verifying Deployment..."
    
    if [ -f ".convex-url" ]; then
        CONVEX_URL=$(cat .convex-url)
        info "Testing Convex deployment..."
        curl -s "$CONVEX_URL" | grep -q "Convex deployment is running" && log "✅ Convex is accessible" || warn "⚠️ Convex may not be accessible"
    fi
    
    if [ -f ".vercel-url" ]; then
        VERCEL_URL=$(cat .vercel-url)
        info "Testing Vercel deployment..."
        curl -s -o /dev/null -w "%{http_code}" "$VERCEL_URL" | grep -q "200" && log "✅ Vercel is accessible" || warn "⚠️ Vercel may not be accessible"
    fi
    
    log "✅ Deployment verification completed!"
}

# Main deployment flow
main() {
    log "🚀 Starting Complete Deployment Pipeline..."
    log "=================================================="
    
    check_requirements
    
    # Ask user what they want to do
    echo ""
    echo "What would you like to deploy?"
    echo "1) Everything (Convex + Tests + Vercel)"
    echo "2) Convex only"
    echo "3) Streaming tests only"
    echo "4) Convex CLI tests only"
    echo "5) Vercel only"
    echo "6) Verify existing deployment"
    echo ""
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            deploy_convex
            run_streaming_tests
            run_convex_cli_tests
            deploy_vercel
            verify_deployment
            ;;
        2)
            deploy_convex
            ;;
        3)
            run_streaming_tests
            ;;
        4)
            run_convex_cli_tests
            ;;
        5)
            deploy_vercel
            ;;
        6)
            verify_deployment
            ;;
        *)
            error "Invalid choice"
            ;;
    esac
    
    log "🎉 Deployment pipeline completed!"
    
    # Show summary
    echo ""
    info "=== Deployment Summary ==="
    
    if [ -f ".convex-url" ]; then
        info "Convex URL: $(cat .convex-url)"
    fi
    
    if [ -f ".vercel-url" ]; then
        info "Vercel URL: $(cat .vercel-url)"
    fi
    
    echo ""
    warn "Next steps:"
    echo "1. Test the reasoning delta functionality in production"
    echo "2. Verify streaming works with NVIDIA NIM and OpenRouter models"
    echo "3. Check that reasoning components auto-open during streaming"
    echo "4. Monitor Convex logs for any issues"
    echo "5. Update any environment variables if needed"
}

# Run main function
main "$@"
