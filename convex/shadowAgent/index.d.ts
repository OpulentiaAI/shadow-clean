/**
 * Shadow Agent - Canonical Agent Module
 *
 * This module provides the main Agent instance using @convex-dev/agent primitives.
 *
 * IMPORTANT: This file must NOT have "use node" directive because it's imported
 * by both action and non-action files. The Agent class itself works in both contexts.
 */
import { Agent } from "@convex-dev/agent";
/**
 * Shadow Agent Instance
 *
 * This is the canonical Agent used throughout the application.
 * It provides:
 * - Automatic thread/message persistence
 * - Conversation context from thread history
 * - Streaming with status lifecycle (pending → streaming → complete)
 * - Tool calling with step limits
 */
export declare const shadowAgent: Agent<object, any>;
export { Agent };
export type { Thread } from "@convex-dev/agent";
//# sourceMappingURL=index.d.ts.map