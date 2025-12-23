#!/usr/bin/env bash
# Security Test Runner with Proper Exit Code Handling
# 
# CRITICAL: Uses pipefail to ensure pipeline failures are not masked
# This script will exit non-zero if ANY test fails, even when piping output

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "🔒 Security Test Suite Runner"
echo "=============================================="
echo "Project root: $PROJECT_ROOT"
echo ""

# Track overall success
OVERALL_EXIT=0

# Function to run a test and capture exit code properly
run_test() {
    local test_name="$1"
    local test_cmd="$2"
    local log_file="${3:-/dev/null}"
    
    echo -e "${YELLOW}▶ Running: $test_name${NC}"
    
    # Run test and capture both output and exit code
    # Using process substitution to avoid subshell exit code issues
    local exit_code=0
    if [[ "$log_file" != "/dev/null" ]]; then
        $test_cmd 2>&1 | tee "$log_file" || exit_code=$?
    else
        $test_cmd || exit_code=$?
    fi
    
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
    else
        echo -e "${RED}❌ FAILED: $test_name (exit code: $exit_code)${NC}"
        OVERALL_EXIT=1
    fi
    
    echo ""
    return $exit_code
}

# Create logs directory
LOGS_DIR="$PROJECT_ROOT/test-logs"
mkdir -p "$LOGS_DIR"

cd "$PROJECT_ROOT"

# Run vitest-based tests
echo "=============================================="
echo "Phase 1: Vitest Security Tests"
echo "=============================================="

run_test "Metamorphic Tests" \
    "npx vitest run apps/server/src/tests/agent-loop-metamorphic.test.ts --reporter=verbose" \
    "$LOGS_DIR/metamorphic.log" || true

run_test "SSRF Bypass Matrix" \
    "npx vitest run apps/server/src/tests/ssrf-bypass-matrix.test.ts --reporter=verbose" \
    "$LOGS_DIR/ssrf-bypass.log" || true

run_test "Secrets Redaction" \
    "npx vitest run apps/server/src/tests/secrets-redaction.test.ts --reporter=verbose" \
    "$LOGS_DIR/secrets-redaction.log" || true

# Run standalone tsx tests
echo "=============================================="
echo "Phase 2: Standalone Security Tests"
echo "=============================================="

run_test "MCP Connector Security" \
    "npx tsx apps/server/src/tests/mcp-connector-security.test.ts" \
    "$LOGS_DIR/mcp-security.log" || true

# Summary
echo "=============================================="
echo "📊 Test Summary"
echo "=============================================="
echo "Logs saved to: $LOGS_DIR/"

if [[ $OVERALL_EXIT -eq 0 ]]; then
    echo -e "${GREEN}🎉 All security tests PASSED${NC}"
else
    echo -e "${RED}⚠️  Some tests FAILED - check logs above${NC}"
fi

# Exit with proper code - THIS IS CRITICAL
exit $OVERALL_EXIT
