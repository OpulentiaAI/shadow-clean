## Production Deployment

### Remote Infrastructure (AWS EKS)

Shadow supports production deployment on AWS with Kata QEMU containers:

1. **Deploy EKS Cluster with Kata Containers:**
```bash
# Configure AWS SSO
aws configure sso --profile=ID

# Deploy infrastructure (25-35 minutes)
./scripts/deploy-remote-infrastructure.sh
```

2. **Deploy Shadow Application:**
```bash
# Deploy complete platform
./scripts/deploy-full-infrastructure.sh
```

### Infrastructure Components

- **EKS Cluster** - Amazon Linux 2023 nodes with Kata Containers support
- **Kata QEMU Runtime** - Hardware-level VM isolation
- **GitHub Container Registry** - Container image storage
- **ECS Backend** - Application Load Balancer with optional SSL
- **EFS Storage** - Persistent workspace storage

### Infrastructure Management

```bash
# Deploy only EKS cluster with Kata Containers
./scripts/deploy-remote-infrastructure.sh

# Deploy only ECS backend service
./scripts/deploy-backend-ecs.sh

# Deploy complete infrastructure (EKS + ECS)
./scripts/deploy-full-infrastructure.sh

# Clean up infrastructure
./scripts/cleanup-infrastructure.sh
```

## Production agent E2E (Convex)

Run an end-to-end agent/tool-calling smoke test against the production Convex deployment using real tasks from your existing task history.

This script:
- Selects recent, repo-backed tasks for a user (not scratchpads)
- Runs `streaming:streamChatWithTools` across a production model matrix
- Verifies tool execution via `toolCallTracking:byMessage` (flags schema/tool-call errors and stuck RUNNING calls)

### Run

From repo root:

```bash
E2E_USER_EMAIL="you@example.com" npm run e2e:prod-agent
```

Or, if you already know your Convex `users` table id:

```bash
E2E_USER_ID="<convex-users-id>" npm run e2e:prod-agent
```

### Environment variables

- `CONVEX_URL` (optional): defaults to `https://veracious-alligator-638.convex.cloud`
- `E2E_USER_EMAIL` (required if `E2E_USER_ID` is not set)
- `E2E_USER_ID` (optional): skips email lookup

### Optional knobs

- `E2E_TASK_LIMIT` (default: `3`)
- `E2E_ACTION_TIMEOUT_MS` (default: `120000`)
- `E2E_BETWEEN_RUNS_MS` (default: `200`)
- `E2E_MODELS` (comma-separated): override the model list

### Output

The script prints:
- A one-line status per `(task, model)` run
- A final summary (`failures=X/Y`)
- A full JSON report prefixed with `E2E_REPORT_JSON` (for copy/paste into issues/CI logs)
