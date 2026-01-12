# Daytona Runner Service

A dedicated Node.js service that bridges `@daytonaio/sdk` with Convex terminal streaming. This service executes commands in Daytona sandboxes and streams output to Convex in real-time.

## Why This Service Exists

The `@daytonaio/sdk` cannot be bundled reliably inside Convex's Node.js runtime due to dependency conflicts. This service runs the SDK in a standard Node.js environment and pushes output to Convex via HTTP.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend UI    │────▶│  Convex Actions  │────▶│  Daytona Runner │
│  (terminal.tsx) │     │  (daytonaActions)│     │  (this service) │
└────────┬────────┘     └──────────────────┘     └────────┬────────┘
         │                                                 │
         │ subscribes to                                   │ uses SDK
         ▼                                                 ▼
┌─────────────────┐                              ┌─────────────────┐
│ terminalOutput  │◀─────────────────────────────│  Daytona API    │
│ (Convex table)  │     pushes output via        │  (sandboxes)    │
└─────────────────┘     /daytona-ingest          └─────────────────┘
```

## Required Environment Variables

### For Daytona Runner Service

| Variable | Required | Description |
|----------|----------|-------------|
| `DAYTONA_API_KEY` | Yes | Daytona API key for authentication |
| `DAYTONA_API_URL` | No | Daytona API URL (default: `https://app.daytona.io/api`) |
| `CONVEX_SITE_URL` | Yes | Convex site URL (e.g., `https://veracious-alligator-638.convex.site`) |
| `CONVEX_INGEST_SECRET` | Yes | Shared secret for authenticating with Convex ingest endpoint |
| `PORT` | No | Server port (default: `5100`) |

### For Convex

| Variable | Required | Description |
|----------|----------|-------------|
| `ENABLE_DAYTONA_TERMINAL` | Yes | Feature flag (`true`/`false`, default: `false`) |
| `CONVEX_INGEST_SECRET` | Yes | Same as Runner - shared secret |
| `DAYTONA_RUNNER_URL` | Yes | URL of this Runner service |
| `DAYTONA_API_KEY` | Yes | For sandbox creation via main API |

### For Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_ENABLE_DAYTONA_TERMINAL` | No | Client-side feature flag |

## Running Locally

```bash
# Install dependencies
cd apps/daytona-runner
npm install

# Set environment variables
export DAYTONA_API_KEY="your-daytona-api-key"
export CONVEX_SITE_URL="https://veracious-alligator-638.convex.site"
export CONVEX_INGEST_SECRET="your-shared-secret"

# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

### POST /v1/exec
Start command execution in a Daytona sandbox.

**Request:**
```json
{
  "taskId": "k57...",
  "sessionId": "terminal-xxx-123",
  "sandboxId": "abc-def-ghi",
  "command": "echo hello",
  "cwd": "/workspace",
  "env": {}
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "sessionId": "terminal-xxx-123",
  "status": "running"
}
```

### POST /v1/cancel
Cancel a running job.

**Request:**
```json
{
  "jobId": "uuid"
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "status": "cancelled"
}
```

### GET /v1/status/:jobId
Get job status.

**Response:**
```json
{
  "jobId": "uuid",
  "taskId": "k57...",
  "sandboxId": "abc-def-ghi",
  "status": "running",
  "startedAt": 1234567890,
  "runningFor": 5000
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "activeJobs": 2,
  "daytonaConfigured": true,
  "convexConfigured": true,
  "timestamp": 1234567890
}
```

## Enabling Daytona Terminal

1. Start the Daytona Runner service
2. Set Convex environment variables:
   ```bash
   npx convex env set ENABLE_DAYTONA_TERMINAL "true"
   npx convex env set DAYTONA_RUNNER_URL "http://localhost:5100"
   npx convex env set CONVEX_INGEST_SECRET "your-shared-secret"
   ```
3. Frontend will automatically route Daytona sandbox commands through the Runner

## Disabling / Rollback

To disable Daytona terminal and rollback to workspace-only mode:

```bash
# Disable feature flag
npx convex env set ENABLE_DAYTONA_TERMINAL "false"

# Stop the Runner service
# (Ctrl+C or kill the process)
```

The existing workspace terminal continues to work regardless of this flag.

## Security Notes

- `CONVEX_INGEST_SECRET` is a shared secret between Runner and Convex
- Never expose API keys to the browser
- All Daytona SDK calls happen server-side in this service
- The ingest endpoint validates the secret before accepting output

## Troubleshooting

### "Daytona API key not configured"
Set `DAYTONA_API_KEY` environment variable.

### "Convex ingest secret not configured"  
Set `CONVEX_INGEST_SECRET` in both Runner and Convex.

### Output not appearing in terminal
1. Check Runner logs for errors
2. Verify `CONVEX_SITE_URL` is correct
3. Check Convex logs for ingest endpoint errors
4. Ensure `ENABLE_DAYTONA_TERMINAL=true` in Convex

### Sandbox creation works but command execution fails
This was the original issue - the SDK handles toolbox URL routing. Ensure Runner is being used (feature flag enabled) and not the legacy direct REST API path.
