# Incident Response Runbook

## Quick Reference

### Immediate Actions

| Symptom | Action | Command |
|---------|--------|---------|
| High error rate | Disable workflow mode | `npx convex env set ENABLE_WORKFLOW false` |
| Stuck workflows | Check dashboard | `npx convex run monitoring/dashboard:checkAlerts` |
| API errors | Check deploy | `npx convex deploy -y` |
| Feature regression | Disable all flags | See "Emergency Rollback" |

### Emergency Rollback

```bash
# Disable ALL feature flags immediately
npx convex env set ENABLE_WORKFLOW false
npx convex env set ENABLE_PROMPT_MESSAGE_ID false
npx convex env set ENABLE_RETRY_WITH_BACKOFF false
npx convex env set ENABLE_MESSAGE_COMPRESSION false
npx convex env set LOG_PROVIDER_ENABLED false

# Verify rollback
npx convex run api/testHelpers:checkWorkflowMode
# Expected: { "mode": "direct" }
```

---

## Monitoring Commands

```bash
# System health
npx convex run monitoring/dashboard:getSystemHealth

# Alert status
npx convex run monitoring/dashboard:checkAlerts

# Feature flags
npx convex run monitoring/dashboard:getFeatureFlags

# Recent traces
npx convex run monitoring/dashboard:getRecentTraces

# Workflow mode check
npx convex run api/testHelpers:checkWorkflowMode
```

---

## Incident Categories

### P1: Service Down

**Symptoms**: API returns errors, no responses

**Actions**:

1. Check Convex dashboard for function errors
2. Check recent deploys: `git log -5 --oneline`
3. Rollback if recent deploy: `git revert HEAD && npx convex deploy -y`
4. Contact Convex support if infrastructure issue

**Resolution**: Service restored, post-mortem scheduled

---

### P2: High Error Rate (>20%)

**Symptoms**: Dashboard shows errorRate > 0.2

**Actions**:

1. Run alert check:
   ```bash
   npx convex run monitoring/dashboard:checkAlerts
   ```

2. Disable workflow mode:
   ```bash
   npx convex env set ENABLE_WORKFLOW false
   ```

3. Check error logs in Convex dashboard

4. Identify error pattern:
   - API key issues?
   - Rate limits?
   - Model provider outage?

5. Fix root cause before re-enabling

**Resolution**: Error rate < 5%, root cause identified

---

### P3: Stuck Workflows

**Symptoms**: Workflows stuck in STARTED/IN_PROGRESS >5 min

**Actions**:

1. Check workflow count:
   ```bash
   npx convex run monitoring/dashboard:getSystemHealth
   ```

2. If <5 stuck: Manual investigation
3. If >5 stuck: Disable workflow mode

4. Check for:
   - API rate limits
   - Model provider outage
   - Convex function timeout

**Resolution**: No stuck workflows, monitoring resumed

---

### P4: Performance Degradation

**Symptoms**: Slow responses, high latency

**Actions**:

1. Check model selection: Ensure fast models for simple tasks
2. Disable message compression (adds latency):
   ```bash
   npx convex env set ENABLE_MESSAGE_COMPRESSION false
   ```
3. Check concurrent workflow count
4. Consider reducing WORKFLOW_MAX_PARALLELISM

**Resolution**: Response times normalized

---

## Escalation

| Level | Contact | When |
|-------|---------|------|
| L1 | On-call engineer | First response |
| L2 | Team lead | P1/P2 unresolved >30min |
| L3 | Convex support | Infrastructure issues |

---

## Post-Incident Checklist

- [ ] Incident documented
- [ ] Root cause identified
- [ ] Fix deployed and verified
- [ ] Monitoring alerts reviewed
- [ ] Runbook updated if needed
- [ ] Team notified of resolution
