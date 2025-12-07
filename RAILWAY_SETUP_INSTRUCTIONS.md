# Railway Setup - Application Service Creation

## Current Status

✅ **Railway Project**: `shadow-clean` created
✅ **PostgreSQL Database**: Running and configured
✅ **Code**: Pushed to GitHub (`OpulentiaAI/shadow-clean`)
✅ **Railway CLI**: Linked to Postgres service

## Issue

The `railway up` command deploys to the currently linked service (Postgres). We need to create a **separate application service** for the Shadow server.

## Solution: Create Application Service via Railway Dashboard

### Step 1: Open Railway Project
Visit: **https://railway.com/project/dd7038ad-bc3e-493f-bf65-9bb810ad27bd**

### Step 2: Create New Service from GitHub

1. Click the **"+ New"** button in the top-right
2. Select **"GitHub Repo"**
3. If prompted, authorize Railway to access your GitHub
4. Select repository: **`OpulentiaAI/shadow-clean`**
5. Select branch: **`opulent-main`**
6. Click **"Add Service"** or **"Deploy"**

### Step 3: Railway Auto-Detection

Railway will automatically:
- Detect your `railway.toml` configuration
- Find the `Dockerfile` at `apps/server/Dockerfile`
- Start building the Docker image

### Step 4: Configure Service Settings (After Creation)

Once the service is created, click on it and:

#### A. Add Environment Variables (Variables tab)

Click "Variables" → "New Variable" and add these:

```
DATABASE_URL=postgresql://postgres:YJUUorpNqewphKuzcRjafLAowauhWHEp@switchyard.proxy.rlwy.net:22740/railway

PINECONE_API_KEY=pcsk_4SKStW_A4LXWoTLbVtp58VnwZFYbUo9YYqwvbUD7cWndkDhfsiRdqoU3nwV8ehqVWchCPi
PINECONE_INDEX_NAME=opulentcode
PINECONE_HOST=https://opulentcode-nvxorhz.svc.aped-4627-b74a.pinecone.io
EMBEDDING_MODEL=text-embedding-3-large
USE_PINECONE=true

OPENROUTER_API_KEY=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
MORPH_API_KEY=sk-fnpiSKi8kqN5AXL5DZdS23B8O6y-oWF3Q2xxIjGYZRjDKOtZ
MORPH_API_BASE_URL=https://api.morphllm.com/v1
MORPH_GIT_PROXY_URL=https://git.morphllm.com

BRAINTRUST_API_KEY=sk-gHMKTQjyi4qc2CGe74XcHJK38UB9yc0aKYsu1mus9Bebm1BD
ENABLE_BRAINTRUST=true

NODE_ENV=production
AGENT_MODE=local
WORKSPACE_DIR=/workspace
```

**Or use variable reference for DATABASE_URL:**
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```
(This creates a reference to your Postgres service)

#### B. Configure Networking (Settings tab)

1. Go to **Settings** → **Networking**
2. Railway will automatically assign a public URL
3. Your app will be available at: `https://[service-name].up.railway.app`

#### C. Monitor Deployment (Deployments tab)

1. Click **"Deployments"** to see build progress
2. Watch the build logs for any errors
3. Wait for "Deployment successful" status (~5-10 minutes)

### Step 5: Link CLI to Application Service

After the service is created, return to your terminal and run:

```bash
railway link
```

Select:
- Workspace: `git-godssoldier's Projects`
- Project: `shadow-clean`
- Environment: `production`
- Service: **[Select the NEW app service, NOT Postgres]**

### Step 6: Run Database Migrations

Once linked to the app service:

```bash
railway run npm run db:prod:migrate
```

Or if that doesn't work:

```bash
# Set DATABASE_URL locally and run migration
export DATABASE_URL="postgresql://postgres:YJUUorpNqewphKuzcRjafLAowauhWHEp@switchyard.proxy.rlwy.net:22740/railway"
npm run db:prod:migrate
```

### Step 7: Verify Deployment

Check the service is running:

```bash
# Get the service URL from Railway dashboard, then:
curl https://[your-service].up.railway.app/health
```

Expected response:
```json
{"status":"ok"}
```

## Why Dashboard Instead of CLI?

The Railway CLI's `railway up` command deploys to the **currently linked service**. Since we're linked to Postgres, it tries to deploy there.

The **GitHub integration** creates a proper application service with:
- Automatic deploys on git push
- Proper build caching
- Better deployment management
- Separated concerns (DB service vs App service)

## Troubleshooting

### Build Fails
- Check build logs in Railway dashboard
- Verify Dockerfile path in `railway.toml`
- Ensure all dependencies are in package.json files

### Service Won't Start
- Check environment variables are set
- Verify PORT configuration (should be 4000)
- Check application logs for startup errors

### Can't Connect to Database
- Verify DATABASE_URL is set correctly
- Check Postgres service is running
- Try using the variable reference: `${{Postgres.DATABASE_URL}}`

## Next Steps After Successful Deployment

1. **Enable Auto-Deploy**: Railway automatically redeploys on git push to `opulent-main`
2. **Add Custom Domain** (optional): Settings → Domains
3. **Monitor Logs**: `railway logs` (after linking to app service)
4. **Scale if needed**: Settings → Resources

---

**Current Step**: Create the application service using Step 2 above, then continue with configuration.
