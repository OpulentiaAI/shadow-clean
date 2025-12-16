# @convex-dev/workflow Integration

## Status: ✅ IMPLEMENTED

**Completed**: 2024-12-16

**Package**: @convex-dev/workflow@0.3.3

---

## Prerequisites

1. **Install package**:
   ```bash
   npm install @convex-dev/workflow
   ```

2. **Configure convex.config.ts**:
   ```typescript
   import { defineApp } from "convex/server";
   import workflow from "@convex-dev/workflow/convex.config";

   const app = defineApp();
   app.use(workflow);

   export default app;
   ```

3. **Run Convex push**:
   ```bash
   npx convex dev --once
   ```

---

## Implemented Files

| File | Purpose |
|------|--------|
| `convex/convex.config.ts` | App config with workflow component |
| `convex/workflows/index.ts` | WorkflowManager instance |
| `convex/workflows/agentWorkflow.ts` | Main durable agent workflow |
| `convex/workflows/workflowHelpers.ts` | Internal mutations for workflow steps |
| `convex/workflows/approvalWorkflow.ts` | Human-in-the-loop support |
| `convex/api/runAgent.ts` | Unified API with feature flag |

---

## Feature Flag

```bash
# Default: direct streaming (existing behavior)
ENABLE_WORKFLOW=false

# Enable durable workflow mode
ENABLE_WORKFLOW=true
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    runAgent API                         │
├─────────────────────────────────────────────────────────┤
│  ENABLE_WORKFLOW=false  │  ENABLE_WORKFLOW=true         │
│  ↓                      │  ↓                            │
│  Direct Streaming       │  Durable Workflow             │
│  (existing behavior)    │  (restart resilient)          │
└─────────────────────────────────────────────────────────┘

Workflow Steps (checkpointed):
1. startWorkflowTrace (mutation)
2. saveUserMessage (mutation) 
3. createAssistantPlaceholder (mutation)
4. executeStreaming (action)
5. completeWorkflowTrace (mutation)
```

---

## Implementation Details

### WorkflowManager Instance (`convex/workflows/index.ts`):

```typescript
import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "../_generated/api";

export const workflowManager = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    maxParallelism: parseInt(process.env.WORKFLOW_MAX_PARALLELISM || "10", 10),
  },
});
```

### Step 2: Define Durable Agent Workflow

Create `convex/workflows/agentWorkflow.ts`:

```typescript
import { v } from "convex/values";
import { workflowManager } from "./index";
import { internal } from "../_generated/api";

export const durableAgentRun = workflowManager.define({
  args: {
    taskId: v.id("tasks"),
    prompt: v.string(),
    model: v.string(),
    apiKeys: v.object({
      anthropic: v.optional(v.string()),
      openai: v.optional(v.string()),
      openrouter: v.optional(v.string()),
    }),
  },
  handler: async (step, args) => {
    // Step 1: Initialize observability trace
    const traceId = await step.runMutation(internal.observability.startTrace, {
      taskId: args.taskId,
      workflowType: "streamChatWithTools",
      model: args.model,
    });

    // Step 2: Save prompt message (BP012)
    const { messageId: promptMessageId } = await step.runMutation(
      internal.messages.savePromptMessage,
      {
        taskId: args.taskId,
        content: args.prompt,
      }
    );

    // Step 3: Create assistant message placeholder
    const { messageId } = await step.runMutation(
      internal.messages.createAssistantMessage,
      {
        taskId: args.taskId,
        promptMessageId,
        llmModel: args.model,
      }
    );

    // Step 4: Execute LLM streaming (checkpointed)
    const result = await step.runAction(internal.streaming.streamChatWithTools, {
      taskId: args.taskId,
      prompt: args.prompt,
      model: args.model,
      apiKeys: args.apiKeys,
    });

    // Step 5: Update trace with completion
    await step.runMutation(internal.observability.updateTrace, {
      traceId,
      status: "COMPLETED",
      totalTokens: result.usage?.totalTokens,
    });

    return {
      traceId,
      messageId,
      text: result.text,
      toolCallIds: result.toolCallIds,
    };
  },
});

// Export action to start workflow
export const startAgentWorkflow = workflowManager.start(durableAgentRun);
```

### Step 3: Add Human-in-the-Loop Support (Optional)

```typescript
import { defineEvent } from "@convex-dev/workflow";

const approvalEvent = defineEvent({
  name: "approval",
  validator: v.object({ approved: v.boolean(), reason: v.optional(v.string()) }),
});

export const durableAgentWithApproval = workflowManager.define({
  args: { taskId: v.id("tasks"), prompt: v.string() },
  handler: async (step, args) => {
    // ... initial steps ...

    // Wait for human approval before executing dangerous tools
    if (requiresApproval(result.toolCalls)) {
      const approval = await step.awaitEvent(approvalEvent);
      if (!approval.approved) {
        throw new Error(`Workflow rejected: ${approval.reason}`);
      }
    }

    // ... continue execution ...
  },
});

// Send approval from UI
export const approveWorkflow = action({
  args: { workflowId: v.string(), approved: v.boolean() },
  handler: async (ctx, args) => {
    await workflowManager.sendEvent(ctx, {
      ...approvalEvent,
      workflowId: args.workflowId,
      value: { approved: args.approved },
    });
  },
});
```

### Step 4: Update API Layer

Update task creation to use workflow:

```typescript
// In your task handler
import { api } from "./_generated/api";

export const runAgentWithWorkflow = action({
  args: {
    taskId: v.id("tasks"),
    prompt: v.string(),
    model: v.string(),
    apiKeys: v.object({ /* ... */ }),
  },
  handler: async (ctx, args) => {
    if (process.env.ENABLE_WORKFLOW === "true") {
      // Use durable workflow
      const workflowId = await ctx.runAction(
        api.workflows.agentWorkflow.startAgentWorkflow,
        args
      );
      return { workflowId, mode: "workflow" };
    } else {
      // Use direct streaming (existing behavior)
      const result = await ctx.runAction(
        api.streaming.streamChatWithTools,
        args
      );
      return { ...result, mode: "direct" };
    }
  },
});
```

---

## Feature Flag

Add to environment:
```
ENABLE_WORKFLOW=false
```

---

## Verification Checklist

- [ ] Package installed: `npm list @convex-dev/workflow`
- [ ] convex.config.ts updated
- [ ] `npx convex dev --once` passes
- [ ] WorkflowManager instance created
- [ ] durableAgentRun workflow defined
- [ ] startAgentWorkflow action exported
- [ ] Feature flag in environment
- [ ] Test workflow start: `npx convex run workflows/agentWorkflow:startAgentWorkflow '{"taskId":"...","prompt":"test","model":"gpt-4o","apiKeys":{}}'`
- [ ] Verify workflow status in Convex dashboard
- [ ] Test restart resilience (start workflow, restart Convex dev, verify completion)

---

## Risks

1. **Package Compatibility**: Ensure @convex-dev/workflow version is compatible with current Convex version
2. **Schema Migration**: Workflow component adds its own tables
3. **Complexity**: Significantly increases codebase complexity
4. **Cost**: Workflow steps count against function invocations

---

## Estimated Effort

- Installation & Config: 30 min
- Workflow Definition: 2 hours
- API Integration: 1 hour
- Testing: 2 hours
- **Total**: ~6 hours

---

## Recommendation

Implement after:
1. Current feature flags are tested in production
2. Observability shows need for restart resilience
3. Human-in-the-loop flows are required
