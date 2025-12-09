# Railway Environment Variables Setup

**Date**: 2025-12-08
**Status**: ✅ Convex variables set in Railway

## Services Configured

### ✅ shadow-frontend (Primary Frontend)

**Variables Set**:
```bash
CONVEX_URL=https://fiery-iguana-603.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://fiery-iguana-603.convex.cloud
NEXT_PUBLIC_USE_CONVEX_REALTIME=true
```

**Status**: ✅ All Convex variables configured

## Commands Used

```bash
# Set Convex URL (frontend public)
railway variables --set NEXT_PUBLIC_CONVEX_URL=https://fiery-iguana-603.convex.cloud

# Set Convex URL (backend/server access)
railway variables --set CONVEX_URL=https://fiery-iguana-603.convex.cloud

# Enable Convex real-time streaming
railway variables --set NEXT_PUBLIC_USE_CONVEX_REALTIME=true
```

## Verify Variables

```bash
# View all variables for current service
railway variables

# View specific Convex variables
railway variables | grep CONVEX
```

## Deploy Changes

After setting environment variables, Railway will automatically redeploy the service. You can also trigger a manual deployment:

```bash
# Trigger redeploy with new variables
railway up

# Or redeploy from GitHub (if using GitHub integration)
git push origin main
```

## Backend Service (if separate)

If you have a separate backend service (not monorepo), switch to it and set:

```bash
# Link to backend service
railway service link <backend-service-id>

# Set backend Convex URL
railway variables --set CONVEX_URL=https://fiery-iguana-603.convex.cloud
```

## Verification

Once deployed, check logs:

```bash
# View deployment logs
railway logs

# Look for Convex connection
railway logs | grep CONVEX
railway logs | grep "streaming"
```

## Next Steps

1. ✅ Variables set in Railway
2. ⏳ Wait for automatic redeploy (~2-5 minutes)
3. ✅ Test production deployment
4. ✅ Verify Convex streaming works in production

## Production URLs

- **Frontend**: Check `railway status` for deployment URL
- **Convex**: `https://fiery-iguana-603.convex.cloud`
- **Dashboard**: `npx convex dashboard`

---

**Status**: ✅ Complete
**Next**: Wait for Railway redeploy, then test production
