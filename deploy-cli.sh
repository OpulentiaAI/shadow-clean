#!/bin/bash

# EXECUTE THIS SCRIPT IN YOUR LOCAL TERMINAL
# This script will deploy to Convex and Vercel using CLI

set -e

# Colors for output
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

info() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

# Check if required CLIs are installed
check_requirements() {
    log "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 20+"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    if ! command -v npx &> /dev/null; then
        error "npx is not available"
        exit 1
    fi
    
    log "✅ All requirements met!"
}

# Step 1: Deploy to Convex Production
deploy_convex() {
    log "Step 1: Deploying to Convex Production..."
    echo ""
    
    info "Generating Convex types..."
    npx convex codegen
    
    info "Deploying to Convex production..."
    npx convex deploy --prod
    
    log "✅ Convex deployment completed!"
    echo ""
    
    # Get deployment URL
    info "Verifying Convex deployment..."
    curl -s https://veracious-alligator-638.convex.cloud | grep "Convex deployment is running" && log "✅ Convex is accessible" || warn "⚠️ Convex may not be accessible"
    echo ""
}

# Step 2: Run Convex CLI Agent Streaming Tests
run_convex_cli_tests() {
    log "Step 2: Running Convex CLI Agent Streaming Tests..."
    echo ""
    
    # Check for API keys
    if [ -z "$OPENROUTER_API_KEY" ] && [ -z "$NVIDIA_API_KEY" ]; then
        warn "No API keys found. Skipping model tests."
        warn "Set OPENROUTER_API_KEY or NVIDIA_API_KEY to run model tests."
        return
    fi
    
    info "Creating test task..."
    TASK_ID=$(npx convex run --prod testHelpers:createTestTask '{"name":"CLI Streaming Test"}' | grep -o '"taskId":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TASK_ID" ]; then
        warn "Failed to create test task. Skipping tests."
        return
    fi
    
    log "✅ Test task created: $TASK_ID"
    echo ""
    
    # Test NVIDIA NIM streaming
    if [ -n "$NVIDIA_API_KEY" ]; then
        info "Testing NVIDIA NIM streaming..."
        npx convex run --prod streaming:streamChatWithTools "{
            \"taskId\": \"$TASK_ID\",
            \"prompt\": \"What is 15 * 23? Show your reasoning step by step.\",
            \"model\": \"nim:moonshotai/kimi-k2-thinking\",
            \"llmModel\": \"nim:moonshotai/kimi-k2-thinking\",
            \"apiKeys\": {\"nvidia\": \"$NVIDIA_API_KEY\"},
            \"clientMessageId\": \"cli-test-$(date +%s)\"
        }" || warn "⚠️ NVIDIA NIM test failed"
        log "✅ NVIDIA NIM test completed"
        echo ""
    fi
    
    # Test OpenRouter streaming
    if [ -n "$OPENROUTER_API_KEY" ]; then
        info "Testing OpenRouter streaming..."
        npx convex run --prod streaming:streamChatWithTools "{
            \"taskId\": \"$TASK_ID\",
            \"prompt\": \"What is 2+2? Show your reasoning.\",
            \"model\": \"deepseek/deepseek-r1\",
            \"llmModel\": \"deepseek/deepseek-r1\",
            \"apiKeys\": {\"openrouter\": \"$OPENROUTER_API_KEY\"},
            \"clientMessageId\": \"cli-test-$(date +%s)\"
        }" || warn "⚠️ OpenRouter test failed"
        log "✅ OpenRouter test completed"
        echo ""
    fi
    
    # Verify reasoning parts
    info "Verifying reasoning parts..."
    MESSAGES=$(npx convex run --prod messages:byTask "{\"taskId\": \"$TASK_ID\"}")
    echo "$MESSAGES" | grep -q '"type":"reasoning"' && log "✅ Reasoning parts found!" || warn "⚠️ No reasoning parts found"
    echo ""
    
    # Cleanup test task
    info "Cleaning up test task..."
    npx convex run --prod testHelpers:deleteTestTask "{\"taskId\": \"$TASK_ID\"}" || warn "⚠️ Failed to delete test task"
    log "✅ Test task cleaned up"
    echo ""
}

# Step 3: Deploy to Vercel Production
deploy_vercel() {
    log "Step 3: Deploying to Vercel Production..."
    echo ""
    
    info "Building project..."
    npm install
    npm run generate
    npm run build
    
    log "✅ Build completed!"
    echo ""
    
    info "Deploying to Vercel production..."
    cd apps/frontend
    
    # Check if already linked to Vercel
    if [ ! -d ".vercel" ]; then
        info "Linking to Vercel project..."
        vercel link --prod
    fi
    
    # Deploy to production
    vercel --prod
    
    cd ../..
    
    log "✅ Vercel deployment completed!"
    echo ""
    
    # Get deployment URL
    info "Getting deployment URL..."
    vercel ls --prod
    echo ""
}

# Main deployment flow
main() {
    log "🚀 Starting Deployment to Convex + Vercel..."
    log "=================================================="
    echo ""
    
    check_requirements
    
    # Ask user what they want to do
    echo "What would you like to deploy?"
    echo "1) Everything (Convex + Tests + Vercel)"
    echo "2) Convex only"
    echo "3) Streaming tests only"
    echo "4) Vercel only"
    echo ""
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            deploy_convex
            run_convex_cli_tests
            deploy_vercel
            ;;
        2)
            deploy_convex
            ;;
        3)
            run_convex_cli_tests
            ;;
        4)
            deploy_vercel
            ;;
        *)
            warn "Invalid choice. Exiting."
            exit 1
            ;;
    esac
    
    log "🎉 Deployment completed!"
    
    # Show summary
    echo ""
    info "=== Deployment Summary ==="
    info "Convex: https://veracious-alligator-638.convex.cloud"
    info "Vercel: Check Vercel dashboard for URL"
    echo ""
    warn "Next steps:"
    echo "1. Test the reasoning delta functionality in production"
    echo "2. Verify streaming works with NVIDIA NIM and OpenRouter models"
    echo "3. Check that reasoning components auto-open during streaming"
    echo "4. Monitor Convex logs for any issues"
}

# Run main function
main "$@"
