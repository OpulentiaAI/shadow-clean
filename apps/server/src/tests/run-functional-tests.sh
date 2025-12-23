#!/usr/bin/env bash
# Functional Test Runner with Proper Exit Code Handling
# 
# CRITICAL: Uses pipefail to ensure pipeline failures are not masked
# This script will exit non-zero if ANY test fails

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=============================================="
echo "🧪 Functional Test Suite Runner"
echo "=============================================="
echo "Project root: $PROJECT_ROOT"
echo ""

# Track overall success
OVERALL_EXIT=0
PASSED_COUNT=0
FAILED_COUNT=0
SKIPPED_COUNT=0

# Function to run a test and capture exit code properly
run_test() {
    local test_name="$1"
    local test_file="$2"
    local log_file="$3"
    
    echo -e "${YELLOW}▶ Running: $test_name${NC}"
    
    local exit_code=0
    SKIP_META_FAIL=true npx vitest run "$test_file" --reporter=verbose 2>&1 | tee "$log_file" || exit_code=${PIPESTATUS[0]}
    
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        ((PASSED_COUNT++))
    else
        echo -e "${RED}❌ FAILED: $test_name (exit code: $exit_code)${NC}"
        ((FAILED_COUNT++))
        OVERALL_EXIT=1
    fi
    
    echo ""
    return 0  # Don't exit early, run all tests
}

# Create logs directory
LOGS_DIR="$PROJECT_ROOT/test-logs/functional"
mkdir -p "$LOGS_DIR"

cd "$PROJECT_ROOT"

# ============================================
# Phase 0: CI Meta-Test
# ============================================
echo -e "${BLUE}=============================================="
echo "Phase 0: CI Meta-Test"
echo "==============================================${NC}"

if [[ -f "apps/server/src/tests/functional-ci-meta.test.ts" ]]; then
    run_test "Functional CI Meta" \
        "apps/server/src/tests/functional-ci-meta.test.ts" \
        "$LOGS_DIR/ci-meta.log"
else
    echo -e "${YELLOW}⏭ SKIPPED: functional-ci-meta.test.ts (not found)${NC}"
    ((SKIPPED_COUNT++))
fi

# ============================================
# Phase 1: Core Agent Loop Tests
# ============================================
echo -e "${BLUE}=============================================="
echo "Phase 1: Core Agent Loop Tests"
echo "==============================================${NC}"

if [[ -f "apps/server/src/tests/agent-taskpack-functional.e2e.test.ts" ]]; then
    run_test "Agent Taskpack Functional E2E" \
        "apps/server/src/tests/agent-taskpack-functional.e2e.test.ts" \
        "$LOGS_DIR/taskpack-functional.log"
else
    echo -e "${YELLOW}⏭ SKIPPED: agent-taskpack-functional.e2e.test.ts (not found)${NC}"
    ((SKIPPED_COUNT++))
fi

# ============================================
# Phase 2: Run Lifecycle Tests
# ============================================
echo -e "${BLUE}=============================================="
echo "Phase 2: Run Lifecycle Tests"
echo "==============================================${NC}"

if [[ -f "apps/server/src/tests/run-lifecycle.e2e.test.ts" ]]; then
    run_test "Run Lifecycle E2E" \
        "apps/server/src/tests/run-lifecycle.e2e.test.ts" \
        "$LOGS_DIR/run-lifecycle.log"
else
    echo -e "${YELLOW}⏭ SKIPPED: run-lifecycle.e2e.test.ts (not found)${NC}"
    ((SKIPPED_COUNT++))
fi

# ============================================
# Phase 3: Tool Behavior Tests
# ============================================
echo -e "${BLUE}=============================================="
echo "Phase 3: Tool Behavior Tests"
echo "==============================================${NC}"

if [[ -f "apps/server/src/tests/tool-output-utilization.test.ts" ]]; then
    run_test "Tool Output Utilization" \
        "apps/server/src/tests/tool-output-utilization.test.ts" \
        "$LOGS_DIR/tool-output.log"
else
    echo -e "${YELLOW}⏭ SKIPPED: tool-output-utilization.test.ts (not found)${NC}"
    ((SKIPPED_COUNT++))
fi

# ============================================
# Phase 4: Completion Quality Tests
# ============================================
echo -e "${BLUE}=============================================="
echo "Phase 4: Completion Quality Tests"
echo "==============================================${NC}"

if [[ -f "apps/server/src/tests/completion-quality-rubric.test.ts" ]]; then
    run_test "Completion Quality Rubric" \
        "apps/server/src/tests/completion-quality-rubric.test.ts" \
        "$LOGS_DIR/completion-quality.log"
else
    echo -e "${YELLOW}⏭ SKIPPED: completion-quality-rubric.test.ts (not found)${NC}"
    ((SKIPPED_COUNT++))
fi

# ============================================
# Phase 5: Performance Budget Tests
# ============================================
echo -e "${BLUE}=============================================="
echo "Phase 5: Performance Budget Tests"
echo "==============================================${NC}"

if [[ -f "apps/server/src/tests/agent-performance-budget.test.ts" ]]; then
    run_test "Agent Performance Budget" \
        "apps/server/src/tests/agent-performance-budget.test.ts" \
        "$LOGS_DIR/performance-budget.log"
else
    echo -e "${YELLOW}⏭ SKIPPED: agent-performance-budget.test.ts (not found)${NC}"
    ((SKIPPED_COUNT++))
fi

# ============================================
# Phase 6: Model Differential Tests
# ============================================
echo -e "${BLUE}=============================================="
echo "Phase 6: Model Differential Tests"
echo "==============================================${NC}"

if [[ -f "apps/server/src/tests/model-differential-functional.test.ts" ]]; then
    run_test "Model Differential Functional" \
        "apps/server/src/tests/model-differential-functional.test.ts" \
        "$LOGS_DIR/model-differential.log"
else
    echo -e "${YELLOW}⏭ SKIPPED: model-differential-functional.test.ts (not found)${NC}"
    ((SKIPPED_COUNT++))
fi

# ============================================
# Phase 7: Tool Surface Coverage
# ============================================
echo -e "${BLUE}=============================================="
echo "Phase 7: Tool Surface Coverage"
echo "==============================================${NC}"

if [[ -f "apps/server/src/tests/agent-tool-surface-coverage.test.ts" ]]; then
    run_test "Tool Surface Coverage" \
        "apps/server/src/tests/agent-tool-surface-coverage.test.ts" \
        "$LOGS_DIR/tool-surface-coverage.log"
else
    echo -e "${YELLOW}⏭ SKIPPED: agent-tool-surface-coverage.test.ts (not found)${NC}"
    ((SKIPPED_COUNT++))
fi

# ============================================
# Phase 8: Plan-Act Consistency
# ============================================
echo -e "${BLUE}=============================================="
echo "Phase 8: Plan-Act Consistency"
echo "==============================================${NC}"

if [[ -f "apps/server/src/tests/plan-act-consistency.test.ts" ]]; then
    run_test "Plan-Act Consistency" \
        "apps/server/src/tests/plan-act-consistency.test.ts" \
        "$LOGS_DIR/plan-act-consistency.log"
else
    echo -e "${YELLOW}⏭ SKIPPED: plan-act-consistency.test.ts (not found)${NC}"
    ((SKIPPED_COUNT++))
fi

# ============================================
# Phase 9: Continuation Functional
# ============================================
echo -e "${BLUE}=============================================="
echo "Phase 9: Continuation Functional"
echo "==============================================${NC}"

if [[ -f "apps/server/src/tests/continuation-functional.e2e.test.ts" ]]; then
    run_test "Continuation Functional E2E" \
        "apps/server/src/tests/continuation-functional.e2e.test.ts" \
        "$LOGS_DIR/continuation-functional.log"
else
    echo -e "${YELLOW}⏭ SKIPPED: continuation-functional.e2e.test.ts (not found)${NC}"
    ((SKIPPED_COUNT++))
fi

# ============================================
# Phase 10: Soak Tests (if NIGHTLY=true)
# ============================================
echo -e "${BLUE}=============================================="
echo "Phase 10: Soak Tests"
echo "==============================================${NC}"

if [[ -f "apps/server/src/tests/functional-soak.nightly.test.ts" ]]; then
    run_test "Functional Soak Tests" \
        "apps/server/src/tests/functional-soak.nightly.test.ts" \
        "$LOGS_DIR/functional-soak.log"
else
    echo -e "${YELLOW}⏭ SKIPPED: functional-soak.nightly.test.ts (not found)${NC}"
    ((SKIPPED_COUNT++))
fi

# ============================================
# Summary
# ============================================
echo "=============================================="
echo "📊 Functional Test Summary"
echo "=============================================="
echo -e "Passed:  ${GREEN}$PASSED_COUNT${NC}"
echo -e "Failed:  ${RED}$FAILED_COUNT${NC}"
echo -e "Skipped: ${YELLOW}$SKIPPED_COUNT${NC}"
echo ""
echo "Logs saved to: $LOGS_DIR/"

if [[ $OVERALL_EXIT -eq 0 ]]; then
    echo -e "${GREEN}🎉 All functional tests PASSED${NC}"
else
    echo -e "${RED}⚠️  Some tests FAILED - check logs above${NC}"
fi

# Exit with proper code - THIS IS CRITICAL
exit $OVERALL_EXIT
