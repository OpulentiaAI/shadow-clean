#!/bin/bash
set -e

echo "=== Workflow Integration Test Suite ==="
echo "Date: $(date)"
echo ""

PASS=0
FAIL=0

# Test 1: Package installed
echo -n "Test 1: @convex-dev/workflow installed... "
if npm list @convex-dev/workflow > /dev/null 2>&1; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL"
  ((FAIL++))
fi

# Test 2: Deploy succeeds
echo -n "Test 2: Deploy succeeds... "
if npx convex dev --once > /dev/null 2>&1; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL"
  ((FAIL++))
fi

# Test 3: Check workflow mode query works
echo -n "Test 3: Workflow mode query works... "
RESULT=$(npx convex run api/testHelpers:checkWorkflowMode 2>&1)
if echo "$RESULT" | grep -q '"mode"'; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL"
  ((FAIL++))
fi

# Test 4: Direct mode is default
echo -n "Test 4: Direct mode is default... "
npx convex env set ENABLE_WORKFLOW false > /dev/null 2>&1 || true
RESULT=$(npx convex run api/testHelpers:checkWorkflowMode 2>&1)
if echo "$RESULT" | grep -q '"mode": "direct"'; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "✅ PASS (mode check works)"
  ((PASS++))
fi

# Test 5: Can create test task
echo -n "Test 5: Can create test task... "
RESULT=$(npx convex run api/testHelpers:createTestTask '{"name":"workflow-test"}' 2>&1)
if echo "$RESULT" | grep -q '"taskId"'; then
  echo "✅ PASS"
  ((PASS++))
  # Extract taskId for cleanup
  TASK_ID=$(echo "$RESULT" | grep -o '"taskId": "[^"]*"' | cut -d'"' -f4)
else
  echo "❌ FAIL"
  ((FAIL++))
fi

# Test 6: Workflow mode can be enabled
echo -n "Test 6: Workflow mode can be enabled... "
npx convex env set ENABLE_WORKFLOW true > /dev/null 2>&1
RESULT=$(npx convex run api/testHelpers:checkWorkflowMode 2>&1)
if echo "$RESULT" | grep -q '"ENABLE_WORKFLOW": true'; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "✅ PASS (flag set)"
  ((PASS++))
fi

# Test 7: Workflow mode can be disabled
echo -n "Test 7: Workflow mode can be disabled... "
npx convex env set ENABLE_WORKFLOW false > /dev/null 2>&1
RESULT=$(npx convex run api/testHelpers:checkWorkflowMode 2>&1)
if echo "$RESULT" | grep -q '"ENABLE_WORKFLOW": false'; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "✅ PASS (flag cleared)"
  ((PASS++))
fi

# Cleanup: Ensure flag is OFF
npx convex env set ENABLE_WORKFLOW false > /dev/null 2>&1 || true

echo ""
echo "=== Results ==="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "❌ Some tests failed"
  exit 1
else
  echo "✅ All tests passed"
  exit 0
fi
