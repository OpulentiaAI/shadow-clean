import { action } from "./_generated/server";
export declare const createThread: import("convex/server").RegisteredAction<"public", {
    metadata?: any;
    userId?: string;
    taskId?: string;
}, Promise<{
    threadId: string;
}>>;
export declare const generateTextWithOpenRouter: import("convex/server").RegisteredAction<"public", {
    model?: string;
    systemPrompt?: string;
    maxTokens?: number;
    prompt: string;
}, Promise<{
    text: any;
    usage: {
        promptTokens: any;
        completionTokens: any;
        totalTokens: any;
    };
    model: string;
}>>;
export declare const generateText: import("convex/server").RegisteredAction<"public", {
    threadId?: string;
    model?: string;
    systemPrompt?: string;
    maxTokens?: number;
    prompt: string;
}, Promise<{
    threadId: string;
    text: any;
    usage: {
        promptTokens: any;
        completionTokens: any;
        totalTokens: any;
    };
}>>;
export declare const continueThread: import("convex/server").RegisteredAction<"public", {
    model?: string;
    threadId: string;
    prompt: string;
}, Promise<{
    threadId: string;
    text: any;
    usage: {
        promptTokens: any;
        completionTokens: any;
        totalTokens: any;
    };
}>>;
export declare const analyzeCode: import("convex/server").RegisteredAction<"public", {
    language?: string;
    question?: string;
    code: string;
}, Promise<{
    analysis: any;
    threadId: string;
}>>;
export declare const generateCode: import("convex/server").RegisteredAction<"public", {
    context?: string;
    description: string;
    language: string;
}, Promise<{
    code: any;
    threadId: string;
}>>;
export declare const explainError: import("convex/server").RegisteredAction<"public", {
    code?: string;
    language?: string;
    error: string;
}, Promise<{
    explanation: any;
    threadId: string;
}>>;
export declare const agentStreamText: ReturnType<typeof action>;
export declare const chat: ReturnType<typeof action>;
export declare const executeTaskWithTools: ReturnType<typeof action>;
export declare const streamTaskWithTools: ReturnType<typeof action>;
//# sourceMappingURL=agent.d.ts.map