# Shadow System Flow Diagnostic

This document provides a comprehensive overview of the message streaming, task initialization, workspace setup, and repository cloning flow in the Shadow platform.

## Table of Contents

1. [Message Flow Architecture](#message-flow-architecture)
2. [Task Initialization Flow](#task-initialization-flow)
3. [Workspace & Repository Setup](#workspace--repository-setup)
4. [Testing Guide](#testing-guide)
5. [Troubleshooting](#troubleshooting)

---

## Message Flow Architecture

### Overview
Messages flow from the frontend through multiple layers before reaching the AI processing engine, with real-time streaming back via WebSocket.

### Frontend → Backend Message Path

```
User Types Message
    ↓
apps/frontend/components/task/task-content.tsx
    ↓ POST /api/tasks/{taskId}/messages
apps/frontend/app/api/tasks/[taskId]/messages/route.ts (Proxy with auth)
    ↓ POST /api/tasks/{taskId}/messages (with SHADOW_API_KEY)
apps/server/src/app.ts (line 301-365)
    ↓
chatService.processUserMessage()
    ↓
AI SDK Streaming → WebSocket Emission
    ↓
Frontend receives stream chunks via Socket.IO
```

### Key Files

- **Frontend Message Component**: `apps/frontend/components/task/task-content.tsx`
- **Frontend API Route (Proxy)**: `apps/frontend/app/api/tasks/[taskId]/messages/route.ts`
- **Backend Express Route**: `apps/server/src/app.ts` (line 301-365)
- **Chat Service**: `apps/server/src/agent/chat.ts`
- **WebSocket Handler**: `apps/server/src/socket.ts` (line 386-449 for `user-message` event)

### Authentication Flow

1. Frontend stores API keys in cookies (Anthropic, OpenAI, OpenRouter)
2. Frontend API route uses `SHADOW_API_KEY` to authenticate with backend
3. Backend validates `SHADOW_API_KEY` via `apiKeyAuth` middleware (apps/server/src/middleware/api-key-auth.ts)
4. Backend creates `TaskModelContext` with user's AI provider API keys

---

## Task Initialization Flow

### Overview
Task initialization prepares the workspace, clones the repository, installs dependencies, and optionally indexes the codebase.

### Initialization Path

```
User Creates Task
    ↓ POST /api/tasks/{taskId}/initiate
apps/server/src/app.ts (line 121-287)
    ↓
TaskInitializationEngine.initializeTask()
    ↓
Execute steps sequentially based on agent mode
```

### Initialization Steps

#### Local Mode (`AGENT_MODE=local`)
1. **PREPARE_WORKSPACE** - Create workspace directory and clone repository
2. **START_BACKGROUND_SERVICES** - Start Shadow Wiki generation and indexing
3. **INSTALL_DEPENDENCIES** - Install npm/pip/etc. dependencies
4. **COMPLETE_SHADOW_WIKI** - Wait for background services to complete
5. **ACTIVE** - Task ready for user messages

#### Remote Mode (`AGENT_MODE=remote`)
1. **CREATE_VM** - Create Kubernetes pod with Kata Containers
2. **WAIT_VM_READY** - Wait for sidecar API to be healthy and repo cloned
3. **VERIFY_VM_WORKSPACE** - Verify workspace contains repository
4. **START_BACKGROUND_SERVICES** - Start Shadow Wiki generation and indexing
5. **INSTALL_DEPENDENCIES** - Install dependencies inside VM
6. **COMPLETE_SHADOW_WIKI** - Wait for background services to complete
7. **ACTIVE** - Task ready for user messages

### Key Files

- **Initialization Engine**: `apps/server/src/initialization/index.ts`
- **Workspace Manager Interface**: `apps/server/src/execution/interfaces/workspace-manager.ts`
- **Local Workspace Manager**: `apps/server/src/execution/local/local-workspace-manager.ts`
- **Remote Workspace Manager**: `apps/server/src/execution/remote/remote-workspace-manager.ts`

---

## Workspace & Repository Setup

### Local Mode Repository Cloning

```
TaskInitializationEngine.executePrepareWorkspace()
    ↓
LocalWorkspaceManager.prepareWorkspace()
    ↓
RepositoryService.cloneRepository()
    ↓
[GitHub Repo] → cloneGitHubRepository() → git clone --depth 1 --branch {branch}
[Local Repo]  → setupLocalRepository()  → git clone {local_path}
    ↓
LocalWorkspaceManager.setupGitForTask()
    ↓
GitManager.createShadowBranch()
```

### Key Implementation Details

#### GitHub Repository Cloning (apps/server/src/github/repositories.ts:141-277)
- Uses shallow clone (`--depth 1`) for performance
- Requires valid GitHub access token from `githubTokenManager`
- Validates branch exists before cloning
- Enforces maximum repository size limit (`MAX_REPO_SIZE_MB`)
- 5 minute timeout for clone operation

#### Local Repository Setup (apps/server/src/github/repositories.ts:40-136)
- Supports `~` for home directory expansion
- Verifies source path is a valid git repository
- Clones with full history (not shallow)
- Falls back to default branch if specified branch doesn't exist

#### Git Configuration (apps/server/src/execution/local/local-workspace-manager.ts:220-274)
- Configures git user as "Shadow" (noreply@shadowrealm.ai)
- Creates shadow branch from base branch
- Records base commit SHA in database
- For scratchpad tasks, skips push to remote

### Workspace Directory Structure

```
{WORKSPACE_DIR}/
└── tasks/
    └── {taskId}/
        ├── .git/              # Git repository
        ├── {repository files}
        └── ...
```

---

## Testing Guide

### Prerequisites

#### Environment Variables

**Backend (apps/server/.env):**
```bash
# Core Configuration
NODE_ENV=development
AGENT_MODE=local
PORT=3001

# Database
DATABASE_URL=postgresql://...

# Workspace Configuration
WORKSPACE_DIR=/path/to/workspace  # Absolute path
MAX_REPO_SIZE_MB=500

# API Keys (for backend validation)
SHADOW_API_KEY=your-secret-key-here

# GitHub (if cloning GitHub repos)
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=...
GITHUB_APP_SLUG=opulent-code
```

**Frontend (apps/frontend/.env.local):**
```bash
# Backend Connection
NEXT_PUBLIC_SERVER_URL=http://localhost:3001

# Frontend-to-Backend Auth
SHADOW_API_KEY=your-secret-key-here  # Same as backend

# Convex
NEXT_PUBLIC_CONVEX_URL=https://...
CONVEX_DEPLOYMENT=...

# Better Auth
BETTER_AUTH_SECRET=...
DATABASE_URL=postgresql://...

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### Local Testing Steps

#### 1. Start Backend
```bash
cd apps/server
npm install
npm run dev
```

Verify:
- Server starts on port 3001
- Workspace directory is created
- Database connection established

#### 2. Start Frontend
```bash
cd apps/frontend
npm install
npm run dev
```

Verify:
- Frontend starts on port 3000
- Can access http://localhost:3000

#### 3. Monitor with Convex CLI
```bash
# In a separate terminal
npx convex dev

# Or if already configured
npx convex dev --admin
```

Verify:
- Connected to Convex deployment
- Can see real-time database updates

#### 4. Create a Test Task

**Using the UI:**
1. Sign in with GitHub
2. Click "New Task"
3. Select a small repository (e.g., a demo repo < 10MB)
4. Enter a simple message: "Add a README section explaining setup"
5. Monitor the initialization steps

**Using API (cURL):**
```bash
# Get your user ID from the database first
USER_ID="your-user-id"
TASK_ID="$(uuidgen)"

# Create task in database
# (Use Prisma Studio or SQL to insert task record)

# Initiate task
curl -X POST http://localhost:3001/api/tasks/${TASK_ID}/initiate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key-here" \
  -d '{
    "message": "Add a README section explaining setup",
    "model": "claude-sonnet-4-5",
    "userId": "'${USER_ID}'"
  }'
```

#### 5. Verify Task Initialization

Monitor the backend logs for:
```
[TASK_INIT] {taskId}: Starting initialization
[LOCAL_WORKSPACE] Preparing workspace for task {taskId} at {path}
[REPOSITORY_SERVICE] Cloning {repo}:{branch} to {workspacePath}
[REPOSITORY_SERVICE] Successfully cloned {repo}:{branch}
[LOCAL_WORKSPACE] Successfully prepared workspace for task {taskId}
[TASK_INIT] {taskId}: Ready for RUNNING status
✅ [TASK_INIT] {taskId}: Ready for RUNNING status
```

Check the workspace directory:
```bash
ls -la $WORKSPACE_DIR/tasks/{taskId}
# Should show cloned repository files
```

#### 6. Send a Message

**Via WebSocket (from browser dev tools):**
```javascript
// In browser console
socket.emit('user-message', {
  taskId: 'your-task-id',
  message: 'What files are in this repository?',
  llmModel: 'claude-sonnet-4-5',
  queue: false
});
```

**Via REST API:**
```bash
curl -X POST http://localhost:3000/api/tasks/${TASK_ID}/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What files are in this repository?",
    "model": "claude-sonnet-4-5"
  }'
```

#### 7. Monitor Streaming

Watch for:
- Backend logs showing AI streaming
- Frontend receiving stream chunks via WebSocket
- Convex database updates in real-time

---

## Troubleshooting

### Common Issues

#### 1. "405 Method Not Allowed" on message submission
**Cause:** Frontend trying to POST to route without POST handler

**Solution:** Ensure POST handler exists in `apps/frontend/app/api/tasks/[taskId]/messages/route.ts`

#### 2. "401 Unauthorized" when backend receives message
**Cause:** Missing or incorrect `SHADOW_API_KEY`

**Solution:**
- Set `SHADOW_API_KEY` in both frontend and backend `.env` files
- Ensure they match exactly
- Restart both services after changing

#### 3. "Task not found" during initialization
**Cause:** Task record not created in database before calling `/initiate`

**Solution:** Ensure task is created in Convex/PostgreSQL before calling initiate endpoint

#### 4. Clone fails with "authentication failed"
**Cause:** Invalid or expired GitHub access token

**Solution:**
- Verify GitHub App is installed for the user
- Check `githubTokenManager.getValidAccessToken()` returns valid token
- Ensure user has access to the repository

#### 5. Workspace directory not created
**Cause:** `WORKSPACE_DIR` not configured or invalid path

**Solution:**
- Set `WORKSPACE_DIR` in backend `.env`
- Ensure the path is absolute (not relative)
- Ensure Node.js process has write permissions

#### 6. Streaming stops unexpectedly
**Cause:** AI API key invalid or quota exceeded

**Solution:**
- Verify API keys are set in cookies (Anthropic, OpenAI, or OpenRouter)
- Check API provider dashboard for quota/billing
- Review backend logs for API errors

#### 7. Convex task ID conversion warnings
**Cause:** Convex expects `Id<"tasks">` format, but receives plain string

**Solution:**
- This is a known issue when using PostgreSQL as primary DB
- Won't block message submission to backend
- Consider using Convex ID format or handling conversion gracefully

### Debugging Tips

#### Enable Verbose Logging

**Backend:**
```typescript
// apps/server/src/config/dev.ts
export default {
  logLevel: 'debug',
  // ...
};
```

**Frontend:**
```typescript
// Add to socket initialization
const socket = io(NEXT_PUBLIC_SERVER_URL, {
  transports: ['websocket'],
  logger: true,
});
```

#### Inspect Database State

```bash
# Prisma Studio
npx prisma studio

# Or direct SQL
psql $DATABASE_URL

# Check task status
SELECT id, status, "initStatus", "errorMessage" FROM "Task" WHERE id = 'your-task-id';
```

#### Monitor File System

```bash
# Watch workspace directory
watch -n 1 "ls -lh $WORKSPACE_DIR/tasks"

# Check specific task workspace
ls -laR $WORKSPACE_DIR/tasks/your-task-id
```

#### Test WebSocket Connection

```javascript
// In browser dev tools console
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connection-info', (data) => {
  console.log('Connection info:', data);
});

// Join a task room
socket.emit('join-task', { taskId: 'your-task-id' });

// Listen for stream chunks
socket.on('stream-chunk', (chunk) => {
  console.log('Stream chunk:', chunk);
});
```

---

## Architecture Diagrams

### Message Flow
```
┌─────────────┐     POST /api/tasks/{id}/messages     ┌─────────────────┐
│   Frontend  │────────────────────────────────────────→│ Frontend Route  │
│  Component  │                                         │  (Proxy + Auth) │
└─────────────┘                                         └────────┬────────┘
                                                                 │
                                                   POST (SHADOW_API_KEY)
                                                                 │
                                                                 ↓
                 ┌───────────────────────────────────────────────────┐
                 │         Backend Express Server                    │
                 │  apps/server/src/app.ts (line 301-365)           │
                 └───────────────────┬───────────────────────────────┘
                                     │
                                     ↓
                 ┌───────────────────────────────────────────────────┐
                 │         ChatService.processUserMessage()          │
                 │  apps/server/src/agent/chat.ts                    │
                 └───────────────────┬───────────────────────────────┘
                                     │
                         ┌───────────┴──────────┐
                         ↓                      ↓
              ┌────────────────────┐  ┌──────────────────┐
              │  AI SDK Streaming  │  │  WebSocket Emit  │
              │  (Anthropic, etc.) │  │  Socket.IO       │
              └────────────────────┘  └────────┬─────────┘
                                               │
                                               ↓
                                      ┌─────────────────┐
                                      │  Frontend via   │
                                      │  Socket.IO      │
                                      └─────────────────┘
```

### Task Initialization (Local Mode)
```
POST /api/tasks/{id}/initiate
         ↓
┌─────────────────────────────────────────┐
│ TaskInitializationEngine.initializeTask │
└───────────────┬─────────────────────────┘
                │
        For each step...
                │
    ┌───────────┴────────────┐
    ↓                        ↓
PREPARE_WORKSPACE    START_BACKGROUND_SERVICES
    │                        │
    ↓                        ↓
LocalWorkspaceManager   BackgroundServiceManager
    │                        │
    ↓                        ↓
prepareWorkspace()      - Shadow Wiki Generation
    │                   - Codebase Indexing (optional)
    ↓
RepositoryService
    │
    ├─→ cloneGitHubRepository()   (GitHub repos)
    │   └─→ git clone --depth 1
    │
    └─→ setupLocalRepository()    (Local repos)
        └─→ git clone {path}
```

---

## Performance Characteristics

### Clone Times (Approximate)

| Repository Size | Shallow Clone | Full Clone |
|----------------|---------------|------------|
| < 10 MB        | 2-5 seconds   | 3-10 seconds |
| 10-50 MB       | 5-15 seconds  | 10-30 seconds |
| 50-100 MB      | 15-30 seconds | 30-60 seconds |
| 100-500 MB     | 30-120 seconds | 60-300 seconds |

### Initialization Times

| Step | Duration |
|------|----------|
| PREPARE_WORKSPACE | 2-120 seconds (depends on repo size) |
| START_BACKGROUND_SERVICES | 1-2 seconds (async) |
| INSTALL_DEPENDENCIES | 10-180 seconds (depends on project) |
| COMPLETE_SHADOW_WIKI | 30-600 seconds (depends on codebase) |

### Memory Usage

| Mode | Per Task |
|------|----------|
| Local | ~50-200 MB (workspace + Node.js process) |
| Remote | ~512 MB - 2 GB (VM with isolated environment) |

---

## Security Considerations

### Authentication & Authorization

1. **SHADOW_API_KEY** - Shared secret between frontend and backend
   - Should be a strong random string (32+ characters)
   - Must match in both environments
   - Used to authenticate frontend-to-backend API calls

2. **AI Provider API Keys** - Stored in cookies, never in database
   - Validated per-request by `TaskModelContext`
   - Supports: Anthropic, OpenAI, OpenRouter, Groq

3. **GitHub Tokens** - Managed by `githubTokenManager`
   - Automatically refreshed when expired
   - Stored in database (encrypted recommended)
   - Used only for repository cloning

### Command Security

All terminal commands executed through:
- `apps/server/src/execution/local/local-tool-executor.ts` (local)
- `apps/server/src/execution/remote/remote-tool-executor.ts` (remote)

Security validations in `packages/command-security/`:
- Command parsing and analysis
- Security level assessment
- Path traversal protection
- Workspace boundary enforcement

### Workspace Isolation

**Local Mode:**
- Each task has isolated directory in `$WORKSPACE_DIR/tasks/{taskId}`
- Git operations scoped to workspace
- File operations validated against workspace boundaries

**Remote Mode:**
- Hardware-level VM isolation via Kata Containers
- QEMU-based microVMs with independent kernel
- Network policies restrict inter-VM communication

---

## Related Documentation

- [GET_STARTED.md](./GET_STARTED.md) - Deployment guide
- [CLAUDE.md](./CLAUDE.md) - Project overview for AI assistants
- [Convex Schema](./packages/db/convex/schema.ts) - Database schema
- [Prisma Schema](./packages/db/prisma/schema.prisma) - PostgreSQL schema

---

*Last Updated: 2025-12-08*
