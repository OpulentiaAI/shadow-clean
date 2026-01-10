/**
 * Shadow Agent Tests
 *
 * Test harness for verifying Agent primitives work correctly.
 * These are action-based tests that can be called from the dashboard or API.
 */
/**
 * Test 1: Conversation History Retention
 *
 * Creates a thread, sends two messages, verifies the agent can reference
 * the first message when responding to the second.
 */
export declare const testConversationHistory: import("convex/server").RegisteredAction<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    threadId: any;
    conversationRetained: any;
    firstResponse: any;
    secondResponse: any;
    test: string;
    result: string;
}>>;
/**
 * Test 2: Abort/Resume - Single Message Restart
 *
 * Verifies that after stopping a task, a single new message
 * triggers a response immediately.
 */
export declare const testAbortResume: any;
/**
 * Test 3: Tool Calling
 *
 * Verifies that tools can be called and results are persisted.
 */
export declare const testToolCalling: any;
/**
 * Run all tests
 */
export declare const runAllTests: import("convex/server").RegisteredAction<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    summary: {
        total: number;
        passed: number;
        failed: number;
        errors: number;
        allPassed: boolean;
    };
    results: {
        test: string;
        result: string;
        details?: any;
    }[];
}>>;
//# sourceMappingURL=tests.d.ts.map