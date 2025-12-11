# Get Started

## Introducing Opulent Code

Opulent Code is Opulentia’s AI software engineer, built to help ambitious engineering teams crush their backlogs and ship faster.

Opulent Code is an autonomous AI engineer that can write, run, and test code inside real workspaces with a live terminal, file explorer, and embedded Monaco editor.

Opulent Code can refactor code, handle small bugs and user requests before they pile up, review PRs, write unit tests, reproduce bugs, build internal tools, and a lot more.

## Already set up? Get started now

- Start frontend + backend: `npm run dev:app`
- Open the app: `http://localhost:3000`
- Create/pick a task, then describe:
  - What to change
  - What “done” looks like (tests, CI, UX, logs, deploy)
  - Any constraints (files to avoid, safe commands only, time budget)

## What are Opulent Code’s strengths?

Here are the types of tasks where Opulent Code excels:

- Tackling many small tasks in parallel before they land in your backlog
- Targeted refactors
- Small user feature requests, frontend tasks, bug fixes, and edge cases
- Improving test coverage
- Investigating and fixing CI failures
- Addressing lint/static analysis errors
- Code migrations, refactors, and modernization
- Framework upgrades (e.g. major Next.js / React migrations)
- Extracting common code into libraries and shared packages
- PR review, codebase Q&A, and documentation maintenance
- Building new integrations and working with unfamiliar APIs
- Prototyping solutions and internal tools

The most successful Opulent Code tasks are typically:

- Quick for you to verify correctness (CI passing, tests green, deployment works)
- Junior-engineer level complexity (think: what an intern could do with clear instructions)

The most successful workflows include:

- Tagging Opulent Code early on a small bug / edge case so it doesn’t become backlog debt
- Delegating a focused task via the web UI and taking over in the embedded IDE once there’s a solid first draft
- Delegating from your IDE to avoid context switching
- Carving out tasks from your todo list at the start of the day and returning to draft PRs waiting for review

Opulent Code is most effective when it’s part of your team and your existing workflow.

## Getting Access

### Local (this repo)

- Install deps: `npm install`
- Run services: `npm run dev:app` (frontend `3000`, backend `4000`)
- Optional bypass auth (local only): set `NEXT_PUBLIC_BYPASS_AUTH=true` in `apps/frontend/.env`
- Provide model keys (choose one):
  - `OPENROUTER_API_KEY` (recommended)
  - `OPENAI_API_KEY`
- Optional GitHub access (remote repos): set `GITHUB_PERSONAL_ACCESS_TOKEN` or GitHub App credentials

### Hosted (Opulentia customers)

- Use your team’s configured environment (ask your Opulentia admin)
- Ensure model and repo credentials are set in the deployment environment

## General Product Features

### The Opulent Code Interface

Opulent Code is designed as a conversational interface with an embedded IDE you can watch in real time and take over at any point.

In Opulent Code’s workspace, you’ll find:

- **Monaco Editor**: Follow changes live and take over to edit files
- **Terminal & File Explorer**: Run commands, inspect files, and view diffs
- **Browser panel**: Browse docs and test UIs; jump in interactively
- **Chat**: Delegate tasks, review plans, and guide execution; streaming responses with tool traces

## Limitations

Opulent Code is a junior engineer and has lots to learn. Keep in mind tasks that will be harder to execute successfully:

- Large-scale challenges: Opulent Code performs best on smaller, clearly scoped tasks. Break big changes into isolated sessions with clear acceptance criteria.
- Reliability: sometimes it gets off-track. Nudge with clearer completion criteria, or take over in the IDE.
- UI aesthetics: it can build functional UIs, but may need guidance for polish.
- Mobile: can help, but device-specific testing is limited.

## Security

- Never paste secrets in chat.
- Use environment variables / secret managers and limit token scopes.
- Prefer SAFE commands; assume tools run in constrained sandboxes.

## Feedback

We’re learning quickly and your input is crucial. Share feedback via:

- Email: `support@opulentia.ai`
- Slack Connect (for enterprise customers)
- “Feedback” button in the web app (if enabled in your deployment)

We log feedback and use it to prioritize fixes and product improvements.

## Demo

Want to learn more? Ask your Opulentia contact for demos and featured tutorials.

## About Opulentia

Opulentia is an applied AI lab building end-to-end software agents. We’re building AI software engineers that help ambitious teams ship faster and keep backlogs under control.

## Your First Session

- Pull the repo and run `npm install`
- Start services: `npm run dev:app`
- Open `http://localhost:3000`
- Create or pick a task, describe the goal and acceptance criteria
- Let Opulent Code execute; review diffs/tests; take over in the IDE when needed

---

## Tool-calling & streaming verification (recommended)

When validating tool execution end-to-end, the most reliable/affordable path is:

- Use `moonshotai/kimi-k2-thinking` on OpenRouter (cheap + strong tool-use)
- Verify tool results landed in Convex `agentTools`
- Use a deterministic workspace on the tool server when you’re testing via CLI:
  - Create a scratch task and set its `workspacePath` to `/app` (present in the Railway tool container)
  - Run file/terminal tools against that task id

---

## Railway Deployment Configuration

### Frontend Service (`shadow-frontend`)

The frontend uses config-as-code via `railway-frontend.toml`:

**Required Settings:**
- **Config File Path:** `railway-frontend.toml`
- **Dockerfile Path:** `Dockerfile.frontend`
- **Start Command:** `node apps/frontend/server.js`
- **Target Port:** `3000`
- **Healthcheck Path:** `/`

**In Railway Dashboard:**
1. Go to `shadow-frontend` service → Settings
2. Scroll to "Config-as-code" section
3. Add File Path: `railway-frontend.toml`
4. Railway will use the config file to override build/deploy settings

**Environment Variables (set in Railway):**

- `NEXT_PUBLIC_SERVER_URL` - Backend URL (e.g., `https://shadow-clean-production.up.railway.app`)
- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL
- `NEXT_PUBLIC_APP_URL` - Frontend URL (e.g., `https://shadow-frontend-production-373f.up.railway.app`)
- `NEXT_PUBLIC_BYPASS_AUTH` - Set to `false` for production
- `BETTER_AUTH_SECRET` - Auth secret (32+ chars)
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Same as `NEXT_PUBLIC_APP_URL`
- `SHADOW_API_KEY` - API key for frontend-to-backend authentication (required for message submission)

### Backend Service (`shadow-clean`)

Uses default `railway.toml` for sidecar configuration or configure via dashboard.

### Sidecar Service (`shadow-sidecar`)

**Required Settings:**
- **Dockerfile Path:** `Dockerfile.sidecar`
- **Start Command:** `node /app/apps/sidecar/dist/server.js`
- **Target Port:** `8080`
- **Healthcheck Path:** `/health`

### Known Issues

**Convex Task ID Conversion:** The "Convex task id missing" warning occurs when task IDs can't be converted to Convex format. This affects optimistic UI updates but doesn't block message submission to the backend.

**SHADOW_API_KEY Required:** Ensure `SHADOW_API_KEY` is set in the frontend Railway environment. Without it, message submission will fail with 401 Unauthorized.

