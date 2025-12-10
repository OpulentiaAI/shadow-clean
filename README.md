# Opulent Code

An open-source background coding agent. Designed to understand, reason about, and contribute to existing codebases.

Sets up isolated execution environments for AI agents to work on GitHub repositories with tools to understand code, edit files, and much more.

## Features

### Authentication & GitHub Integration
- GitHub OAuth sign-in via Better Auth
- GitHub App integration for repository access and installations
- Secure token management with automatic refresh
- Support for both personal access tokens (dev) and GitHub App (production)

### Agent Environment
- GitHub repository integration with branch management
- Pull request generation with AI-authored commits
- Real-time task status tracking and progress updates
- Automatic workspace setup and cleanup on Micro-VMs
- Kata QEMU containers for hardware-level isolation

### Code Generation & Understanding
- Multi-provider LLM support (Anthropic, OpenAI, OpenRouter)
  - OpenRouter models: Grok Code Fast, Kimi K2, Codestral, **Devstral 2 (FREE)**, DeepSeek R1, Qwen3 Coder
- Streaming chat interface with real-time responses
- Tool execution with file operations, terminal commands, and code search
- Memory system for repository-specific knowledge retention
- Semantic code search via Pinecone
- Morph SDK integration for fast code editing
- Custom rules for code generation

### Convex-native status (current)
- Convex is the primary datastore for tasks/messages/todos/memories/tool calls.
- Phase 2 added Convex-native chat streaming (`streamChat`, `streamChatWithTools`) plus presence/activity + tool-call tracking tables; hooks are available via `useConvexChatStreaming` and `usePresence`. The task UI now calls `startStreamWithTools` when Convex streaming is enabled.
- Sidecar supports Convex-native mode (file changes, tool logs, terminal output, workspace status) via `USE_CONVEX_NATIVE=true` and `CONVEX_URL`.
- Hybrid fallback remains: legacy Socket.IO sidecar events and REST are still available while UI wiring catches up. Use `NEXT_PUBLIC_USE_CONVEX_REALTIME=true` (frontend) to opt into Convex streaming.
- Provider routing now prefers OpenRouter (first-party), with Anthropic/OpenAI fallbacks and abortable cancellation; presence cleanup runs via `convex/crons.ts`.
- Known gaps before full nativity: streaming tool execution is explicitly disabled in `streamChatWithTools` (status is recorded) until real tool runners are wired; some Phase 1 hooks still carry implicit `any` types.

### Convex streaming quick test (local)
- Set frontend env: `NEXT_PUBLIC_CONVEX_URL=<your convex>`, `NEXT_PUBLIC_USE_CONVEX_REALTIME=true`, `NEXT_PUBLIC_API_URL=http://localhost:4000`.
- Start services: `npx convex dev`, `npm run dev --filter=server`, then restart frontend `npm run dev --filter=frontend` (or `npm run dev:app`).
- Create a **new task** in the UI (ensures Prisma + Convex rows), send a message, and watch the stream.
- If you see “Could not find public function…”, run `npx convex dev --until-success --once` to regenerate/deploy functions.

## Execution Modes

Opulent Code supports two execution modes through an abstraction layer:

### Local Mode
- Direct filesystem execution on the host machine

### Remote Mode (For Deployment)
- Hardware-isolated execution in Kata QEMU containers
- True VM isolation via QEMU hypervisor
- Kubernetes orchestration with bare metal nodes

Mode selection is controlled by `NODE_ENV` and `AGENT_MODE` environment variables.

## Deployment

### Railway + Vercel Deployment

Opulent Code is deployed with:
- **Backend**: Railway (Node.js server + PostgreSQL)
- **Frontend**: Railway or Vercel (Next.js)

#### Production URLs
- Frontend: `https://shadow-frontend-production-373f.up.railway.app`
- Backend: `https://shadow-clean-production.up.railway.app`

#### Quick Deploy
```bash
# Login to Railway
railway login

# Deploy backend
railway up

# Or use automated script
./auto-deploy.sh
```

**Prerequisites:**
- Railway CLI: `npm install -g @railway/cli`
- Vercel CLI: `npm install -g vercel`

## Development Setup

### Repository Structure

- **Frontend** (`apps/frontend/`) - Next.js application with real-time chat interface, terminal emulator, file explorer, and task management
- **Server** (`apps/server/`) - Node.js orchestrator handling LLM integration, WebSocket communication, task initialization, and API endpoints
- **Sidecar** (`apps/sidecar/`) - Express.js service providing REST APIs for file operations within isolated containers
- **Website** (`apps/website/`) - Marketing and landing page
- **Database** (`packages/db/`) - Prisma schema and PostgreSQL client with comprehensive data models
- **Types** (`packages/types/`) - Shared TypeScript type definitions for the entire platform
- **Command Security** (`packages/command-security/`) - Security utilities for command validation and sanitization
- **ESLint Config** (`packages/eslint-config/`) - Shared linting rules
- **TypeScript Config** (`packages/typescript-config/`) - Shared TypeScript configurations


### Prerequisites
- Node.js 22
- PostgreSQL

### Installation

1. Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd shadow
npm install
```

2. Set up environment variables:
```bash
# Copy example environment files
cp apps/server/.env.template apps/server/.env
cp apps/frontend/.env.template apps/frontend/.env
cp packages/db/.env.template packages/db/.env
```

3. Configure the database:
```bash
# Create local PostgreSQL database
psql -U postgres -c "CREATE DATABASE shadow_dev;"

# Update packages/db/.env with your database URL
DATABASE_URL="postgres://postgres:@127.0.0.1:5432/shadow_dev"

# Generate Prisma client and push schema
npm run generate
npm run db:push
```

4. Start development servers:
```bash
# Start frontend + backend together (recommended for local dev)
npm run dev:app

# Or start specific services
npm run dev --filter=frontend
npm run dev --filter=server
npm run dev --filter=sidecar
```

### Environment Configuration

Set variables in the following files:
- Frontend: `apps/frontend/.env.local`
- Server: `apps/server/.env`
- Database: `packages/db/.env`

#### Environment Variables

##### Frontend (`apps/frontend/.env.local`)
```bash
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_BYPASS_AUTH=false

# Better Auth
BETTER_AUTH_SECRET=<generate-with-openssl-rand-hex-32>

# GitHub OAuth App (create at github.com/settings/developers)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# GitHub App (for repo installations)
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=<base64-encoded-pem>
GITHUB_APP_SLUG=opulent-code

# Database
DATABASE_URL=postgresql://...
```

##### Server (`apps/server/.env`)
```bash
DATABASE_URL=postgresql://...
NODE_ENV=development
AGENT_MODE=local
API_PORT=4000
WORKSPACE_DIR=/path/to/workspace

# GitHub credentials (must match frontend)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=
GITHUB_APP_SLUG=opulent-code

# Optional integrations
PINECONE_API_KEY=
PINECONE_INDEX_NAME=opulentcode
MORPH_API_KEY=
```

##### Database (`packages/db/.env`)
```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

#### Development Mode (bypass auth)
Set `NEXT_PUBLIC_BYPASS_AUTH=true` in frontend to skip GitHub OAuth during local development.

## Development Commands

### Linting and Formatting

```bash
# Lint all packages and apps
npm run lint

# Format code with Prettier
npm run format

# Type checking
npm run check-types
```

## Agent & Convex Internals

See `agents.md` for the current agent flow, Convex chat integration, workspace initialization, and requirements for the real-time terminal/file editor.

### Database Operations

```bash
# Generate Prisma client from schema
npm run generate

# Push schema changes to database (for development)
npm run db:push

# Reset database and push schema (destructive)
npm run db:push:reset

# Open Prisma Studio GUI
npm run db:studio

# Run migrations in development
npm run db:migrate:dev
```

### Building and Deployment

```bash
# Build all packages and apps
npm run build

# Build specific app
npm run build --filter=frontend
npm run build --filter=server
npm run build --filter=sidecar
```

## Tool System

Shadow provides a comprehensive set of tools for AI agents:

### File Operations
- `read_file` - Read file contents with line range support
- `edit_file` - Write and modify files
- `search_replace` - Precise string replacement
- `delete_file` - Safe file deletion
- `list_dir` - Directory exploration

### Code Search
- `grep_search` - Pattern matching with regex
- `file_search` - Fuzzy filename search
- `semantic_search` - AI-powered semantic code search

### Terminal & Execution
- `run_terminal_cmd` - Command execution with real-time output
- Command validation and security checks

### Task Management
- `todo_write` - Structured task management
- `add_memory` - Repository-specific knowledge storage
- `list_memories` - Retrieve stored knowledge

## Development Guidelines

### Code Organization
- TypeScript throughout with strict type checking
- Shared configurations via packages
- Clean separation between execution modes
- WebSocket event compatibility across frontend/backend

### Security
- Command validation in all execution modes
- Path traversal protection
- Workspace boundary enforcement
- Container isolation in remote mode

### Important Notes
- Always test both local and remote modes for production features
- Keep initialization steps mode-aware and properly abstracted
- Maintain WebSocket event compatibility across frontend/backend changes
- **Remote mode requires Amazon Linux 2023 nodes** for Kata Containers compatibility

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types
4. Test in both local and remote modes
5. Submit a pull request
   
We're excited to see what you've built with Shadow!


---

[Ishaan Dey](https://ishaand.com) — [X](https://x.com/ishaandey_)

[Rajan Agarwal](https://www.rajan.sh/) — [X](https://x.com/_rajanagarwal)

[Elijah Kurien](https://www.elijahkurien.com/) — [X](https://x.com/ElijahKurien)
