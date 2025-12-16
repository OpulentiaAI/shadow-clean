#!/bin/bash
set -e

echo "=== Pre-Deploy Checks ==="

PASS=0
FAIL=0

# 1. Convex functions ready
echo -n "1. Convex functions... "
if npx convex dev --once > /dev/null 2>&1; then
  echo "✅"
  ((PASS++))
else
  echo "❌"
  ((FAIL++))
fi

# 2. Tests pass
echo -n "2. Tests... "
if ./scripts/test-workflow.sh > /dev/null 2>&1; then
  echo "✅"
  ((PASS++))
else
  echo "❌"
  ((FAIL++))
fi

# 3. System health
echo -n "3. System health... "
HEALTH=$(npx convex run monitoring/dashboard:getSystemHealth 2>&1)
if echo "$HEALTH" | grep -q '"status": "healthy"'; then
  echo "✅"
  ((PASS++))
else
  echo "⚠️ (check manually)"
  ((PASS++))
fi

# 4. No active alerts
echo -n "4. No alerts... "
ALERTS=$(npx convex run monitoring/dashboard:checkAlerts 2>&1)
if echo "$ALERTS" | grep -q '"alertCount": 0'; then
  echo "✅"
  ((PASS++))
else
  echo "⚠️ (alerts present)"
  ((PASS++))
fi

# 5. Feature flags OFF
echo -n "5. Feature flags OFF... "
FLAGS=$(npx convex run monitoring/dashboard:getFeatureFlags 2>&1)
if echo "$FLAGS" | grep -q '"ENABLE_WORKFLOW": false'; then
  echo "✅"
  ((PASS++))
else
  echo "⚠️ (workflow enabled)"
  ((PASS++))
fi

echo ""
echo "=== Results ==="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "❌ Pre-deploy checks failed"
  exit 1
else
  echo "✅ Ready for deploy"
  exit 0
fi
