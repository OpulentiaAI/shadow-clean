# Convex Migration Plan (Milestones & References)

This doc tracks the migration from the current Prisma/Express/socket stack to Convex-native data, realtime, streaming, and agents. No new pages will be added; existing UI will be rewired to Convex.

## Milestone 0 — Baseline (done)
- [x] Scaffold Convex (`convex/convex.config.ts`, `convex/schema.ts`) and run `npx convex dev` for codegen.
- [x] Seed initial actions for tasks/messages/auth placeholder (`convex/tasks.ts`, `convex/messages.ts`, `convex/auth.ts`).
- [x] Add agent stub (`convex/agent.ts`) using `@convex-dev/agent`.
- [x] Minimal frontend call path wired to Convex actions (`apps/frontend/lib/convex/*`, `apps/frontend/app/convex-demo/page.tsx`).

## Milestone 1 — Data Model Parity
- [ ] Translate remaining Prisma models to Convex tables/indexes:
  - Sessions/Accounts/Verification/UserSettings/TaskSessions/RepositoryIndex/PullRequestSnapshot.
  - Re-create necessary indexes removed during `npx convex dev` (see CLI output).
- [ ] Add `convex/schema.ts` indexes to match query patterns (e.g., by_user, by_repo, by_task_status).
- [ ] Run `npx convex dev` to regen `_generated` bindings and fix type usages.

## Milestone 2 — Auth & Users
- [ ] Replace better-auth/REST with Convex mutations/queries:
  - `auth.upsertUser`, session create/validate, account linking.
  - Expose `currentUser` query and session lookups.
- [ ] Frontend: swap auth client calls to Convex functions; ensure SSR-safe patterns (`use client` where needed).

## Milestone 3 — Tasks, Todos, Memories
- [ ] Move task CRUD, status transitions, cleanup flags to Convex mutations.
- [ ] Move todos CRUD and ordering to Convex (live via queries).
- [ ] Move memories CRUD and retrieval by repo/user/task; preserve categories.
- [ ] Frontend: refactor Task/Todo/Memories hooks to `convex/react` or `ConvexHttpClient` queries/mutations.

## Milestone 4 — Chat & Streaming
- [ ] Port message append/list to Convex (done basic append/list; extend with streaming tokens if needed).
- [ ] Replace socket.io flows with Convex live queries for chat threads.
- [ ] Implement streaming action that mirrors existing server streaming handler; update UI consumer.

## Milestone 5 — Agents & Tools
- [ ] Promote agent stub to full agent: tools, thread management, workflows, RAG hooks.
- [ ] Expose actions: `agent.generateText`, `agent.streamText`, `agent.createThreadMutation`, etc.
- [ ] Integrate task context (repo, models, auth) into agent tools.

## Milestone 6 — Indexing / RAG
- [ ] Decide Pinecone usage from Convex actions vs. moving indexes into Convex tables.
- [ ] Add ingestion actions, chunk metadata tables, and search queries (hybrid/vector via Convex components if used).
- [ ] Wire UI search to Convex endpoints.

## Milestone 7 — Sidecar/Socket Replacement
- [ ] Replace sidecar socket handlers with Convex actions / HTTP actions where needed.
- [ ] Remove or gate old Express/socket code paths after parity.

## Milestone 8 — Cleanup & Hardening
- [ ] Remove unused Prisma/Express/socket code, env vars, scripts once parity confirmed.
- [ ] Add lint/tests for Convex functions; ensure type validators cover returns.
- [ ] Secrets: rotate exposed tokens and set Convex env vars (`CONVEX_DEPLOY_KEY`, LLM keys, GitHub token, Morph key).

## Key File References
- Convex config: `convex/convex.config.ts`
- Convex schema: `convex/schema.ts`
- Actions (initial): `convex/tasks.ts`, `convex/messages.ts`, `convex/auth.ts`, `convex/agent.ts`
- Frontend Convex client helpers: `apps/frontend/lib/convex/client.ts`, `apps/frontend/lib/convex/actions.ts`
- Demo wiring (no new page required long-term): `apps/frontend/app/convex-demo/page.tsx` (temporary)
- Legacy data model source (Prisma): `packages/db/prisma/schema.prisma`
- Existing server logic to port: `apps/server/src/**` (tasks, chat, agents, streaming, sockets)

## Next Actions (recommendation)
1) Implement Milestone 1 schema/index parity in `convex/schema.ts` and regenerate codegen.
2) Swap auth/session flows to Convex (Milestone 2) and wire frontend auth calls.
3) Port task/todo/memory flows and replace socket.io chat with Convex live queries (Milestones 3–4).

