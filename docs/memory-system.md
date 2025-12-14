# AI Agent Memory System

A comprehensive persistent memory system for AI coding agents that enables knowledge retention across tasks within the same repository. This document provides complete implementation details for integrating a memory system into new AI agent projects.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema (Convex)](#database-schema-convex)
4. [API Functions](#api-functions)
5. [Tool Definitions](#tool-definitions)
6. [System Prompt Integration](#system-prompt-integration)
7. [Tool Prompt Files](#tool-prompt-files)
8. [Usage Examples](#usage-examples)
9. [Implementation Checklist](#implementation-checklist)

---

## Overview

### What is the Memory System?

The memory system allows AI coding agents to:
- **Store** important discoveries, patterns, and insights about a codebase
- **Recall** previously learned information when starting new tasks
- **Remove** outdated or incorrect memories
- **Persist** knowledge across multiple coding sessions

### Why Use It?

Without memory, AI agents:
- Re-discover the same patterns repeatedly
- Forget critical architectural decisions
- Miss known bugs and workarounds
- Waste time re-exploring familiar codebases

With memory, agents become progressively more effective on each repository.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Agent                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐        │
│  │ add_memory  │  │ list_memories │  │ remove_memory   │        │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘        │
└─────────┼────────────────┼───────────────────┼──────────────────┘
          │                │                   │
          ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Tool Execution Layer                          │
│  - Validates parameters (Zod schemas)                           │
│  - Enforces access control (user/repo scoping)                  │
│  - Logs operations                                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Convex Database                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  memories table                                          │   │
│  │  - content, category, repoFullName, userId, taskId      │   │
│  │  - Indexed by: user+repo, task, category                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Repository-Scoped**: Memories are tied to specific repositories (via `repoFullName`)
2. **User-Owned**: Each memory belongs to a user (via `userId`)
3. **Task-Linked**: Memories track which task created them (via `taskId`)
4. **Categorized**: 10 predefined categories for organization
5. **Indexed**: Efficient queries by user+repo, task, or category

---

## Database Schema (Convex)

### Memory Category Enum

```typescript
// convex/schema.ts
import { v } from "convex/values";

export const MemoryCategory = v.union(
  v.literal("INFRA"),        // Infrastructure, deployment, environment
  v.literal("SETUP"),        // Installation, configuration, dev setup
  v.literal("STYLES"),       // Code style, formatting, naming conventions
  v.literal("ARCHITECTURE"), // System design, tech stack, patterns
  v.literal("TESTING"),      // Test patterns, frameworks, requirements
  v.literal("PATTERNS"),     // Common code patterns, utilities
  v.literal("BUGS"),         // Known issues, debugging insights, workarounds
  v.literal("PERFORMANCE"),  // Optimization patterns, bottlenecks
  v.literal("CONFIG"),       // Configuration files, environment variables
  v.literal("GENERAL")       // Other important context
);
```

### Memories Table Definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";

export default defineSchema({
  // ... other tables ...
  
  memories: defineTable({
    content: v.string(),           // The actual memory content
    category: MemoryCategory,      // Category for organization
    repoFullName: v.string(),      // e.g., "owner/repo-name"
    repoUrl: v.string(),           // Full repository URL
    userId: v.id("users"),         // Owner of this memory
    taskId: v.id("tasks"),         // Task that created this memory
    createdAt: v.number(),         // Unix timestamp (ms)
    updatedAt: v.number(),         // Unix timestamp (ms)
  })
    .index("by_user_repo", ["userId", "repoFullName"])  // Primary query pattern
    .index("by_task", ["taskId"])                        // Find memories by task
    .index("by_category", ["category"]),                 // Filter by category
});
```

---

## API Functions

### Complete Convex Mutations & Queries

```typescript
// convex/memories.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MemoryCategory } from "./schema";

// ==================== MUTATIONS ====================

/**
 * Create a new memory
 */
export const create = mutation({
  args: {
    content: v.string(),
    category: MemoryCategory,
    repoFullName: v.string(),
    repoUrl: v.string(),
    userId: v.id("users"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const memoryId = await ctx.db.insert("memories", {
      content: args.content,
      category: args.category,
      repoFullName: args.repoFullName,
      repoUrl: args.repoUrl,
      userId: args.userId,
      taskId: args.taskId,
      createdAt: now,
      updatedAt: now,
    });
    return { memoryId };
  },
});

/**
 * Update an existing memory
 */
export const update = mutation({
  args: {
    memoryId: v.id("memories"),
    content: v.optional(v.string()),
    category: v.optional(MemoryCategory),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.memoryId);
    if (!existing) {
      throw new Error("Memory not found");
    }
    const patchData: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.content !== undefined) patchData.content = args.content;
    if (args.category !== undefined) patchData.category = args.category;
    await ctx.db.patch(args.memoryId, patchData);
    return { success: true };
  },
});

/**
 * Delete a memory permanently
 */
export const remove = mutation({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.memoryId);
    if (!existing) {
      throw new Error("Memory not found");
    }
    await ctx.db.delete(args.memoryId);
    return { success: true };
  },
});

/**
 * Bulk create memories (for imports/migrations)
 */
export const bulkCreate = mutation({
  args: {
    memories: v.array(
      v.object({
        content: v.string(),
        category: MemoryCategory,
        repoFullName: v.string(),
        repoUrl: v.string(),
        userId: v.id("users"),
        taskId: v.id("tasks"),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids: string[] = [];
    for (const memory of args.memories) {
      const memoryId = await ctx.db.insert("memories", {
        ...memory,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(memoryId);
    }
    return { memoryIds: ids };
  },
});

// ==================== QUERIES ====================

/**
 * Get a single memory by ID
 */
export const get = query({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.memoryId);
  },
});

/**
 * Get all memories for a specific task
 */
export const byTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("memories")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();
  },
});

/**
 * Get all memories for a user in a specific repository
 * This is the PRIMARY query pattern for the agent
 */
export const byUserAndRepo = query({
  args: {
    userId: v.id("users"),
    repoFullName: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("memories")
      .withIndex("by_user_repo", (q) =>
        q.eq("userId", args.userId).eq("repoFullName", args.repoFullName)
      )
      .order("desc")
      .collect();
  },
});

/**
 * Get memories by category (global)
 */
export const byCategory = query({
  args: { category: MemoryCategory },
  handler: async (ctx, args) => {
    return ctx.db
      .query("memories")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .order("desc")
      .collect();
  },
});

/**
 * Get memories for a user+repo filtered by category
 */
export const byUserRepoAndCategory = query({
  args: {
    userId: v.id("users"),
    repoFullName: v.string(),
    category: MemoryCategory,
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("memories")
      .withIndex("by_user_repo", (q) =>
        q.eq("userId", args.userId).eq("repoFullName", args.repoFullName)
      )
      .collect();
    return all.filter((m) => m.category === args.category);
  },
});

/**
 * Search memories by content (simple text search)
 */
export const search = query({
  args: {
    userId: v.id("users"),
    repoFullName: v.string(),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_user_repo", (q) =>
        q.eq("userId", args.userId).eq("repoFullName", args.repoFullName)
      )
      .order("desc")
      .collect();
    if (!args.searchTerm) {
      return memories;
    }
    const term = args.searchTerm.toLowerCase();
    return memories.filter((m) => m.content.toLowerCase().includes(term));
  },
});
```

---

## Tool Definitions

### Zod Schemas for Tool Parameters

```typescript
// Tool parameter schemas (using Zod)
import { z } from "zod";

const AddMemorySchema = z.object({
  content: z.string().describe("Concise memory content to store"),
  category: z
    .enum([
      "INFRA",
      "SETUP",
      "STYLES",
      "ARCHITECTURE",
      "TESTING",
      "PATTERNS",
      "BUGS",
      "PERFORMANCE",
      "CONFIG",
      "GENERAL",
    ])
    .describe("Category for organizing the memory"),
  explanation: z.string().describe("Why this memory is being added"),
});

const ListMemoriesSchema = z.object({
  category: z
    .enum([
      "INFRA",
      "SETUP",
      "STYLES",
      "ARCHITECTURE",
      "TESTING",
      "PATTERNS",
      "BUGS",
      "PERFORMANCE",
      "CONFIG",
      "GENERAL",
    ])
    .optional()
    .describe("Filter by category (optional)"),
  explanation: z.string().describe("Why memories are being listed"),
});

const RemoveMemorySchema = z.object({
  memoryId: z.string().describe("ID of the memory to remove"),
  explanation: z.string().describe("Why this memory is being removed"),
});
```

### Tool Implementations (AI SDK)

```typescript
// convex/agentTools.ts (or your tool definition file)
import { tool } from "ai";
import { api } from "./_generated/api";

export function createMemoryTools(ctx: ActionCtx, taskId: Id<"tasks">) {
  return {
    add_memory: tool({
      description: `Store important information about the repository for future reference. 
Use this to remember patterns, configurations, architectural decisions, or debugging insights 
that will be useful across tasks.`,
      parameters: AddMemorySchema,
      execute: async ({ content, category, explanation }) => {
        console.log(`[ADD_MEMORY] ${explanation}`);

        // Get task context for user/repo info
        const task = await ctx.runQuery(api.tasks.get, { taskId });
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }

        const result = await ctx.runMutation(api.memories.create, {
          content,
          category,
          repoFullName: task.repoFullName,
          repoUrl: task.repoUrl,
          userId: task.userId,
          taskId,
        });

        return {
          success: true,
          memoryId: result.memoryId,
          message: `Added memory: ${content}`,
        };
      },
    }),

    list_memories: tool({
      description: `Retrieve stored memories for the current repository. 
Use this to recall previous learnings, patterns, configurations, or insights.`,
      parameters: ListMemoriesSchema,
      execute: async ({ category, explanation }) => {
        console.log(`[LIST_MEMORIES] ${explanation}`);

        const task = await ctx.runQuery(api.tasks.get, { taskId });
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }

        const memories = await ctx.runQuery(api.memories.byUserAndRepo, {
          userId: task.userId,
          repoFullName: task.repoFullName,
        });

        // Filter by category if specified
        const filteredMemories = category
          ? memories.filter((m) => m.category === category)
          : memories;

        return {
          success: true,
          memories: filteredMemories,
          count: filteredMemories.length,
        };
      },
    }),

    remove_memory: tool({
      description: `Remove a previously stored memory that is no longer relevant or accurate.`,
      parameters: RemoveMemorySchema,
      execute: async ({ memoryId, explanation }) => {
        console.log(`[REMOVE_MEMORY] ${explanation}`);

        const task = await ctx.runQuery(api.tasks.get, { taskId });
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }

        // Access control: verify memory belongs to this user
        const memory = await ctx.runQuery(api.memories.get, {
          memoryId: memoryId as Id<"memories">,
        });

        if (!memory || memory.userId !== task.userId) {
          return {
            success: false,
            error: "Memory not found or access denied",
          };
        }

        await ctx.runMutation(api.memories.remove, {
          memoryId: memoryId as Id<"memories">,
        });

        return {
          success: true,
          message: `Removed memory: ${memory.content}`,
        };
      },
    }),
  };
}
```

---

## System Prompt Integration

Add this section to your agent's system prompt:

```typescript
const MEMORY_SYSTEM = `<memory_system>
REPOSITORY MEMORY TOOLS:
You have access to a persistent memory system that stores important information across tasks for the same repository.

AVAILABLE TOOLS:
- add_memory: Store important discoveries, patterns, or insights
- list_memories: Recall previously stored information
- remove_memory: Delete outdated or incorrect memories

MEMORY CATEGORIES:
- ARCHITECTURE: Tech stack decisions, database choices, framework patterns
- PATTERNS: Code conventions, recurring solutions, design patterns
- BUGS: Known issues, debugging insights, common error causes
- TESTING: Test strategies, coverage requirements, testing tools
- SETUP: Environment configuration, build steps, dependencies
- CONFIG: Configuration patterns, environment variables, secrets handling
- PERFORMANCE: Optimization insights, bottlenecks, caching strategies
- INFRA: Deployment, CI/CD, infrastructure details
- STYLES: Code style, formatting rules, naming conventions
- GENERAL: Other important information

WHEN TO ADD MEMORIES:
✅ Discovering the project uses Convex instead of Prisma → ARCHITECTURE memory
✅ Finding a tricky bug pattern (e.g., "CORS issues with Socket.IO") → BUGS memory
✅ Learning the project requires specific test setup → TESTING memory
✅ Discovering undocumented environment requirements → SETUP memory
✅ Finding performance-critical code paths → PERFORMANCE memory

WHEN TO LIST MEMORIES:
✅ Starting work on database changes → check ARCHITECTURE memories
✅ Debugging a new issue → check BUGS memories for similar patterns
✅ Setting up development environment → check SETUP memories
✅ Before making changes in a module → check relevant category

BEST PRACTICES:
1. At START of each task: list_memories to recall what you've learned about this repo
2. After DISCOVERING important info: add_memory immediately
3. After FIXING tricky bugs: add_memory with the root cause and solution
4. After COMPLETING major features: add_memory documenting architectural decisions
5. Keep memories CONCISE but ACTIONABLE - future you should understand them
6. Use SPECIFIC categories - don't default to GENERAL unless truly miscellaneous
</memory_system>`;
```

---

## Tool Prompt Files

### add_memory

**Description** (`add_memory/description.md`):
```markdown
Add a memory to remember important details about this repository. Memories are concise notes categorized by type (INFRA, SETUP, STYLES, ARCHITECTURE, TESTING, PATTERNS, BUGS, PERFORMANCE, CONFIG, GENERAL) that persist across tasks in this repository. Use this to capture important insights, patterns, or context discovered during coding work.
```

**Instructions** (`add_memory/instructions.md`):
```markdown
**Purpose**: Store repository-specific insights that persist across tasks

**When to Use:**
- Important architectural patterns or conventions discovered
- Critical configuration or setup details
- Testing approaches and requirements
- Known issues and workarounds
- Performance considerations

**Categories:**
- INFRA: Infrastructure, deployment, environment
- SETUP: Installation, configuration, dev setup  
- STYLES: Code style, formatting, naming
- ARCHITECTURE: System design, patterns
- TESTING: Test patterns, frameworks
- PATTERNS: Common code patterns, utilities
- BUGS: Known issues, workarounds
- PERFORMANCE: Optimization patterns
- CONFIG: Configuration files, env vars
- GENERAL: Other important context

**Examples:**
```
add_memory({
  content: "Use validateRequest() middleware in API routes (src/middleware/validation.ts)",
  category: "PATTERNS",
  explanation: "Found consistent validation pattern across endpoints"
})
```

```
add_memory({
  content: "Tests need POSTGRES_URL=test_db, run via 'npm run test:integration'",
  category: "TESTING",
  explanation: "Discovered test database requirement"
})
```
```

### list_memories

**Description** (`list_memories/description.md`):
```markdown
List all memories for this repository. Shows repository-specific memories organized by category with creation dates. Use this to recall important context and patterns from previous work in this repository.
```

**Instructions** (`list_memories/instructions.md`):
```markdown
**Purpose**: Retrieve stored repository memories to recall important context

**When to Use:**
- Start of new tasks to understand repository context
- Before making architectural decisions
- When debugging to recall known issues
- To check testing approaches before writing tests
- Before refactoring to understand conventions

**Parameters:**
- category: Optional filter (INFRA, SETUP, STYLES, ARCHITECTURE, TESTING, PATTERNS, BUGS, PERFORMANCE, CONFIG, GENERAL)
- explanation: Why you're retrieving memories

**Examples:**
```
list_memories({
  explanation: "Starting new feature, need repository context"
})
```

```
list_memories({
  category: "TESTING",
  explanation: "Understanding test setup before adding tests"
})
```
```

### remove_memory

**Description** (`remove_memory/description.md`):
```markdown
Remove a specific memory by its ID from this repository. Use this to delete outdated, incorrect, or no longer relevant memories. Once removed, memories cannot be recovered, so use with caution.
```

**Instructions** (`remove_memory/instructions.md`):
```markdown
**Purpose**: Delete outdated or incorrect repository memories

**When to Use:**
- Memory contains outdated information
- Architectural patterns have changed
- Duplicate or redundant memories
- After major refactoring makes patterns obsolete

**⚠️ Warning: Deletion is permanent**

**Parameters:**
- memoryId: Exact ID from list_memories
- explanation: Why removing this memory

**Workflow:**
1. Use list_memories to find memory ID
2. Use remove_memory with exact ID

**Examples:**
```
remove_memory({
  memoryId: "cm1abc123def456",
  explanation: "Test setup changed from Jest to Vitest"
})
```

```
remove_memory({
  memoryId: "cm1xyz789abc123",
  explanation: "API refactored, validation pattern no longer used"
})
```
```

---

## Usage Examples

### Example 1: Agent Discovers Architecture

```
User: "Add a new API endpoint for user profiles"

Agent (thinking): I should check if there are any memories about this repo's architecture.

Agent calls: list_memories({ 
  category: "ARCHITECTURE", 
  explanation: "Understanding API architecture before adding endpoint" 
})

Result: No memories found

Agent explores codebase, discovers: 
- Uses Express.js with TypeScript
- Routes in src/routes/
- Controllers in src/controllers/
- Uses Zod for validation

Agent calls: add_memory({
  content: "Express.js + TypeScript API. Routes: src/routes/, Controllers: src/controllers/, Validation: Zod schemas in src/schemas/",
  category: "ARCHITECTURE",
  explanation: "Captured API structure for future reference"
})
```

### Example 2: Agent Recalls Previous Learning

```
User: "Fix the authentication bug"

Agent calls: list_memories({ 
  category: "BUGS", 
  explanation: "Checking for known auth-related issues" 
})

Result: [
  {
    content: "JWT tokens must include 'iat' claim - middleware rejects tokens without it",
    category: "BUGS",
    createdAt: 1699900000000
  }
]

Agent: "I found a previous note about JWT requirements. Let me check if this is related..."
```

### Example 3: Agent Updates Outdated Memory

```
Agent calls: list_memories({ explanation: "Reviewing testing memories" })

Result: [
  {
    _id: "cm1old123",
    content: "Tests use Jest with ts-jest",
    category: "TESTING"
  }
]

Agent notices project now uses Vitest...

Agent calls: remove_memory({
  memoryId: "cm1old123",
  explanation: "Project migrated from Jest to Vitest"
})

Agent calls: add_memory({
  content: "Tests use Vitest. Config: vitest.config.ts. Run: npm test",
  category: "TESTING",
  explanation: "Updated testing framework information"
})
```

---

## Implementation Checklist

### Database Setup (Convex)

- [ ] Add `MemoryCategory` enum to `schema.ts`
- [ ] Add `memories` table definition to `schema.ts`
- [ ] Create indexes: `by_user_repo`, `by_task`, `by_category`
- [ ] Create `memories.ts` with mutations and queries
- [ ] Run `npx convex deploy` to apply schema

### Tool Implementation

- [ ] Create Zod schemas for tool parameters
- [ ] Implement `add_memory` tool with proper access control
- [ ] Implement `list_memories` tool with category filtering
- [ ] Implement `remove_memory` tool with ownership verification
- [ ] Register tools in agent's tool set

### System Prompt

- [ ] Add `MEMORY_SYSTEM` section to system prompt
- [ ] Include category descriptions
- [ ] Add "when to use" guidance
- [ ] Add best practices

### Tool Prompts (Optional)

- [ ] Create `add_memory/description.md`
- [ ] Create `add_memory/instructions.md`
- [ ] Create `list_memories/description.md`
- [ ] Create `list_memories/instructions.md`
- [ ] Create `remove_memory/description.md`
- [ ] Create `remove_memory/instructions.md`

### Testing

- [ ] Test adding a memory
- [ ] Test listing memories (all and filtered)
- [ ] Test removing a memory
- [ ] Test access control (user can't access other user's memories)
- [ ] Test category filtering

---

## TypeScript Types

```typescript
// types/memory.ts

export type MemoryCategory =
  | "INFRA"
  | "SETUP"
  | "STYLES"
  | "ARCHITECTURE"
  | "TESTING"
  | "PATTERNS"
  | "BUGS"
  | "PERFORMANCE"
  | "CONFIG"
  | "GENERAL";

export interface Memory {
  _id: string;
  content: string;
  category: MemoryCategory;
  repoFullName: string;
  repoUrl: string;
  userId: string;
  taskId: string;
  createdAt: number;
  updatedAt: number;
}

export interface AddMemoryInput {
  content: string;
  category: MemoryCategory;
  explanation: string;
}

export interface ListMemoriesInput {
  category?: MemoryCategory;
  explanation: string;
}

export interface RemoveMemoryInput {
  memoryId: string;
  explanation: string;
}

export interface AddMemoryResult {
  success: boolean;
  memoryId?: string;
  message: string;
  error?: string;
}

export interface ListMemoriesResult {
  success: boolean;
  memories: Memory[];
  count: number;
}

export interface RemoveMemoryResult {
  success: boolean;
  message?: string;
  error?: string;
}
```

---

## Alternative Implementations

### PostgreSQL/Prisma

```prisma
// schema.prisma
enum MemoryCategory {
  INFRA
  SETUP
  STYLES
  ARCHITECTURE
  TESTING
  PATTERNS
  BUGS
  PERFORMANCE
  CONFIG
  GENERAL
}

model Memory {
  id          String         @id @default(cuid())
  content     String
  category    MemoryCategory
  repoFullName String
  repoUrl     String
  userId      String
  taskId      String
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  user        User           @relation(fields: [userId], references: [id])
  task        Task           @relation(fields: [taskId], references: [id])

  @@index([userId, repoFullName])
  @@index([taskId])
  @@index([category])
}
```

### MongoDB

```typescript
// models/Memory.ts
import mongoose from 'mongoose';

const MemorySchema = new mongoose.Schema({
  content: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['INFRA', 'SETUP', 'STYLES', 'ARCHITECTURE', 'TESTING', 
           'PATTERNS', 'BUGS', 'PERFORMANCE', 'CONFIG', 'GENERAL'],
    required: true 
  },
  repoFullName: { type: String, required: true, index: true },
  repoUrl: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
}, { timestamps: true });

MemorySchema.index({ userId: 1, repoFullName: 1 });
MemorySchema.index({ taskId: 1 });
MemorySchema.index({ category: 1 });

export const Memory = mongoose.model('Memory', MemorySchema);
```

---

## Best Practices Summary

### For Agents

1. **Always check memories at task start** - `list_memories` before diving into code
2. **Store immediately after discovery** - Don't wait until task end
3. **Be specific with categories** - Helps future retrieval
4. **Keep content concise** - One key insight per memory
5. **Include file paths** - Makes memories actionable
6. **Remove outdated info** - Keep memory store accurate

### For Developers

1. **Index appropriately** - Primary access pattern is user+repo
2. **Validate access** - Users should only see their own memories
3. **Log operations** - Helps debugging and auditing
4. **Handle missing tasks gracefully** - Tasks may be deleted
5. **Consider soft deletes** - For audit trails if needed

---

*Last updated: December 2024*
*Version: 1.0*
