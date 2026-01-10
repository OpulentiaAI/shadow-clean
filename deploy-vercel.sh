#!/bin/bash

# Vercel CLI Deployment Script - Path Traversal Fixed
# Execute this in your local terminal

set -e

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

# Check if Vercel CLI is installed
check_vercel() {
    if ! command -v vercel &> /dev/null; then
        warn "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    log "✅ Vercel CLI ready"
}

# Deploy to Vercel Production
deploy_vercel() {
    log "🚀 Deploying to Vercel Production..."
    echo ""
    
    cd apps/frontend
    
    info "Step 1: Installing dependencies..."
    npm ci
    
    info "Step 2: Building project..."
    npm run build
    
    info "Step 3: Deploying to Vercel production..."
    vercel --prod
    
    cd ../..
    
    log "✅ Vercel deployment completed!"
    echo ""
    
    info "Getting deployment URL..."
    vercel ls --prod
    echo ""
}

# Main function
main() {
    log "Starting Vercel Deployment..."
    log "================================"
    echo ""
    
    check_vercel
    
    deploy_vercel
    
    log "🎉 Deployment successful!"
    echo ""
    info "Next steps:"
    echo "1. Visit your production URL"
    echo "2. Test reasoning delta functionality"
    echo "3. Verify streaming works correctly"
}

main "$@"
