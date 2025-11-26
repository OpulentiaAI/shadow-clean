# Railway Deployment Guide

## Current Setup Status

✅ Railway project created: `shadow-clean`
✅ Project URL: https://railway.com/project/dd7038ad-bc3e-493f-bf65-9bb810ad27bd
✅ PostgreSQL database added
✅ Code pushed to GitHub: https://github.com/OpulentiaAI/shadow-clean

## Step 1: Connect GitHub Repository

1. Open your Railway project: https://railway.com/project/dd7038ad-bc3e-493f-bf65-9bb810ad27bd

2. Click the **"+ New"** button

3. Select **"GitHub Repo"**

4. Choose repository: **OpulentiaAI/shadow-clean**

5. Select branch: **opulent-main**

6. Railway will auto-detect your `Dockerfile` and begin building

## Step 2: Configure Environment Variables

Click on your newly created service, then go to the **"Variables"** tab and add these variables:

### Database Connection
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```
(This references the PostgreSQL service you already added)

### Pinecone Configuration
```
PINECONE_API_KEY=pcsk_4SKStW_A4LXWoTLbVtp58VnwZFYbUo9YYqwvbUD7cWndkDhfsiRdqoU3nwV8ehqVWchCPi
PINECONE_INDEX_NAME=opulentcode
PINECONE_HOST=https://opulentcode-nvxorhz.svc.aped-4627-b74a.pinecone.io
EMBEDDING_MODEL=text-embedding-3-large
USE_PINECONE=true
```

### API Keys
```
OPENROUTER_API_KEY=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
MORPH_API_KEY=sk-fnpiSKi8kqN5AXL5DZdS23B8O6y-oWF3Q2xxIjGYZRjDKOtZ
MORPH_API_BASE_URL=https://api.morphllm.com/v1
MORPH_GIT_PROXY_URL=https://git.morphllm.com
BRAINTRUST_API_KEY=sk-gHMKTQjyi4qc2CGe74XcHJK38UB9yc0aKYsu1mus9Bebm1BD
ENABLE_BRAINTRUST=true
```

### Application Configuration
```
NODE_ENV=production
AGENT_MODE=local
WORKSPACE_DIR=/app/workspace
```

### GitHub Integration (Optional - for GitHub features)
```
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
GITHUB_PERSONAL_ACCESS_TOKEN=your-token
```

## Step 3: Wait for Deployment

Railway will automatically:
- Build your Docker image
- Deploy the container
- Expose the service on a public URL
- Run health checks on `/health` endpoint

This takes approximately 5-10 minutes.

## Step 4: Run Database Migrations

Once the deployment is successful, run migrations from your terminal:

```bash
railway run npm run db:prod:migrate
```

Or manually in the Railway dashboard:
1. Click on your service
2. Go to the **"Deployments"** tab
3. Click **"View Logs"**
4. Verify the service is running

Then from your terminal:
```bash
# Link to the service (you'll need to select it interactively)
railway link

# Run migrations
railway run npm run db:prod:migrate
```

## Step 5: Verify Deployment

1. Check the service URL in Railway dashboard (under "Settings" → "Networking")

2. Visit `https://your-service-url.railway.app/health`

3. You should see a health check response

## Troubleshooting

### Build Fails
- Check the build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify Dockerfile is correct

### Service Won't Start
- Check environment variables are set correctly
- Verify `DATABASE_URL` references the Postgres service
- Check application logs

### Database Connection Issues
- Ensure PostgreSQL service is running
- Verify `DATABASE_URL` variable is set
- Check migrations have run successfully

## Continuous Deployment

Railway automatically deploys when you push to the `opulent-main` branch:

```bash
git add .
git commit -m "Your changes"
git push origin opulent-main
```

Railway will detect the push and redeploy automatically.

## Useful Commands

```bash
# View logs
railway logs

# Run commands in production environment
railway run <command>

# Open Railway dashboard
railway open

# Check deployment status
railway status
```
