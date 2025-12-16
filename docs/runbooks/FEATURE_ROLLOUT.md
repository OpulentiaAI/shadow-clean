# Feature Flag Rollout Guide

## Rollout Order

Enable flags in this order, with monitoring between each:

### Phase 1: Observability (Low Risk)

```bash
# 1. Enable retry with backoff (handles transient errors)
npx convex env set ENABLE_RETRY_WITH_BACKOFF true

# Monitor for 24h, check error rate
npx convex run monitoring/dashboard:getSystemHealth

# 2. Enable prompt message ID (improves reliability)
npx convex env set ENABLE_PROMPT_MESSAGE_ID true

# Monitor for 24h, check message consistency
npx convex run monitoring/dashboard:checkAlerts
```

### Phase 2: Optimization (Medium Risk)

```bash
# 3. Enable message compression (reduces tokens)
npx convex env set ENABLE_MESSAGE_COMPRESSION true

# Monitor for 24h, check quality and latency
npx convex run monitoring/dashboard:getSystemHealth

# 4. Enable external logging (if configured)
npx convex env set LOG_PROVIDER_ENABLED true

# Verify logs appear in external system
```

### Phase 3: Durability (Higher Risk)

```bash
# 5. Enable workflow mode (durable execution)
npx convex env set ENABLE_WORKFLOW true

# Monitor closely for 48h
# Test restart resilience
npx convex run monitoring/dashboard:checkAlerts
```

---

## Rollout Checklist

### Before Enabling Each Flag

- [ ] Monitoring dashboard working
- [ ] Alert thresholds set
- [ ] Runbook reviewed
- [ ] Rollback tested
- [ ] Team notified

### After Enabling Each Flag

- [ ] Monitor for 1h immediately
- [ ] Check error rate < 5%
- [ ] Check completion rate > 95%
- [ ] No stuck workflows
- [ ] No performance degradation

---

## Rollback Procedure

If issues detected:

1. Disable the flag immediately:

   ```bash
   npx convex env set <FLAG_NAME> false
   ```

2. Check system health:

   ```bash
   npx convex run monitoring/dashboard:getSystemHealth
   ```

3. Document the issue

4. Fix before re-enabling

---

## Feature Flag Reference

| Flag | Purpose | Risk | Rollback Impact |
|------|---------|------|-----------------|
| `ENABLE_RETRY_WITH_BACKOFF` | Retry transient failures | Low | None |
| `ENABLE_PROMPT_MESSAGE_ID` | Retry-safe streaming | Low | None |
| `ENABLE_MESSAGE_COMPRESSION` | Reduce token usage | Medium | None |
| `LOG_PROVIDER_ENABLED` | External logging | Low | Logs stop |
| `ENABLE_WORKFLOW` | Durable execution | High | Reverts to direct |

---

## Monitoring During Rollout

```bash
# Check every 15 minutes during first hour
for i in {1..4}; do
  echo "=== Check $i/4 ($(date)) ==="
  npx convex run monitoring/dashboard:getSystemHealth
  npx convex run monitoring/dashboard:checkAlerts
  sleep 900
done
```

---

## Success Criteria

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Error rate | < 1% | > 5% |
| Completion rate | > 99% | < 95% |
| Stuck workflows | 0 | > 3 |
| Response time | < 5s | > 10s |
