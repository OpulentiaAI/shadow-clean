#!/bin/bash
# Shadow Agent Test Runner
# Runs the automated test harness and exits non-zero on failure

set -e

echo "=== Shadow Agent Test Runner ==="
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Step 1: Deploy Convex functions
echo "Step 1: Deploying Convex functions..."
npx convex dev --once
echo ""

# Step 2: Create a test task
echo "Step 2: Creating test task..."
TASK_RESULT=$(npx convex run "api/testHelpers:createTestTask" '{}' 2>&1)
TASK_ID=$(echo "$TASK_RESULT" | grep -o "'[^']*'" | head -1 | tr -d "'")

# Extract taskId from output
if echo "$TASK_RESULT" | grep -q "taskId:"; then
  TASK_ID=$(echo "$TASK_RESULT" | grep "taskId:" | sed "s/.*taskId: '\([^']*\)'.*/\1/" | tr -d " '\"")
fi

echo "Test Task ID: $TASK_ID"
echo ""

# Step 3: Run tests
echo "Step 3: Running Shadow Agent tests..."
TEST_RESULT=$(npx convex run "shadowAgent/tests:runAllTests" "{\"taskId\": \"$TASK_ID\"}" 2>&1)
echo "$TEST_RESULT"
echo ""

# Step 4: Parse results
echo "Step 4: Parsing results..."
PASSED=$(echo "$TEST_RESULT" | grep -o "passed: [0-9]*" | grep -o "[0-9]*")
FAILED=$(echo "$TEST_RESULT" | grep -o "failed: [0-9]*" | grep -o "[0-9]*")
ERRORS=$(echo "$TEST_RESULT" | grep -o "errors: [0-9]*" | grep -o "[0-9]*")
TOTAL=$(echo "$TEST_RESULT" | grep -o "total: [0-9]*" | grep -o "[0-9]*")

echo "Summary: $PASSED passed, $FAILED failed, $ERRORS errors (of $TOTAL total)"
echo ""

# Step 5: Exit with appropriate code
if [ "$FAILED" -gt 0 ] || [ "$ERRORS" -gt 0 ]; then
  echo "❌ TESTS FAILED"
  exit 1
else
  echo "✅ ALL TESTS PASSED"
  exit 0
fi
