# Get Started

Introducing Opulent Code

Opulent Code is Opulentia’s AI software engineer, built to help ambitious engineering teams ship faster and keep their backlogs clean.

Opulent Code is an autonomous AI engineer that can write, run, and test code inside real workspaces with a live terminal, file explorer, and embedded Monaco editor.

Opulent Code can refactor code, handle small bugs and user requests before they pile up, review PRs, write unit tests, reproduce bugs, build internal tools, and much more.

---

Already set up locally? Get started now:
- Start both frontend and backend: `npm run dev:app`
- Open the app: http://localhost:3000
- Connect your repo: use local repos (e.g., this monorepo) or configure GitHub credentials
- Review best practices below
- Explore featured workflows and examples

---

What are Opulent Code’s strengths?

Here are the types of tasks where Opulent Code excels:
- Tackling many small tasks in parallel before they land in your backlog
- Targeted refactors and small feature requests (frontend/backend)
- Improving test coverage and adding linters/static fixes
- Investigating and fixing CI failures
- Code migrations, framework upgrades, and modernization
- Extracting common code into libraries or shared packages
- PR review and codebase Q&A
- Reproducing & fixing bugs with real terminals and browsers
- Writing unit tests and maintaining documentation
- Building new integrations and working with unfamiliar APIs
- Creating customized demos and prototyping internal tools

The most successful Opulent Code tasks are typically:
- Quick for you to verify correctness (CI passing, tests green, deployment works)
- Junior-engineer complexity: tasks an intern could complete with clear instructions

Follow our best practices and pre-task checklist:
- Tag Opulent Code on small bugs and edge cases early
- Delegate a task via the web UI, then take over in the embedded IDE if needed
- Carve out tasks in the morning; return to draft PRs for review later
- Keep completion criteria explicit (what to change, how to verify)

Opulent Code is most effective when it’s part of your team and workflow.

---

Getting Access

Local (this repo):
- Install deps: `npm install`
- Run both services: `npm run dev:app` (frontend 3000, backend 4000)
- Bypass auth for local testing: set `NEXT_PUBLIC_BYPASS_AUTH=true` in `apps/frontend/.env`
- Provide model keys: `OPENAI_API_KEY` and/or `OPENROUTER_API_KEY`
- GitHub access (optional for remote repos): set `GITHUB_PERSONAL_ACCESS_TOKEN` or GitHub App creds

Hosted (Opulentia customers):
- Use your team’s configured environment (ask your Opulentia admin)
- Ensure model and repo credentials are set in the deployment environment

---

General Product Features

The Opulent Code Interface
- Conversational UI with embedded IDE (Monaco)
- Real-time terminal and file explorer backed by workspaces
- Browser panel for docs and webapp testing
- Live task status, chat streaming, and tool results via Convex

In Opulent Code’s workspace, you’ll find:
- Monaco Editor: Familiar editing experience; follow changes live and take over anytime
- Terminal & File Explorer: Run commands, inspect files, and view diffs
- Browser: Let Opulent Code browse docs or test built UIs; you can jump in interactively
- Chat: Delegate tasks, review plans, and guide the agent; streaming responses with tool traces

---

Limitations

Opulent Code is a fast learner but still has boundaries:
- Large, multi-repo or very broad changes: break into smaller, verifiable tasks
- Reliability: if the agent drifts, nudge it with clearer acceptance criteria or take over in the IDE
- UI polish: functional UIs are fine; design polish may need your guidance
- Mobile: can help, but device-specific testing is limited
- Security: never paste secrets in chat. Use environment variables or secret managers; limit scopes on tokens.

---

Feedback

We’re learning quickly and your input is crucial. Share feedback via:
- Email: support@opulentia.ai
- Slack Connect (for enterprise customers)
- “Feedback” button in the web app (if enabled in your deployment)

We log feedback and use it to prioritize fixes and features.

---

Demo

Want to learn more? Check out our blog and demos (request from your Opulentia contact).

---

About Opulentia

Opulentia is an applied AI lab building end-to-end software agents. We’re building AI software engineers that help ambitious teams ship faster and keep backlogs under control.

---

Your First Session
- Pull the repo and run `npm install`
- Start services: `npm run dev:app`
- Open http://localhost:3000
- Create or pick a task, describe the goal and acceptance criteria
- Let Opulent Code execute; review diffs, tests, and PRs; take over in the IDE when needed

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

