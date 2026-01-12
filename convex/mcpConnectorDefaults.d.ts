/**
 * Default MCP connectors available to all users
 * These are "global" connectors with userId: undefined
 */
export declare const DEFAULT_MCP_CONNECTORS: {
    name: string;
    nameId: string;
    description: string;
    url: string;
    type: "HTTP";
    category: string;
    icon: string;
    repo: string;
    requiredEnvVars: {
        name: string;
        description: string;
    }[];
    features: string[];
}[];
/**
 * Get all available default connector templates
 */
export declare const listDefaultTemplates: import("convex/server").RegisteredMutation<"public", {}, Promise<{
    name: string;
    nameId: string;
    description: string;
    category: string;
    icon: string;
    repo: string;
    requiredEnvVars: {
        name: string;
        description: string;
    }[];
    features: string[];
}[]>>;
/**
 * Seed global MCP connectors (admin only - run once)
 * Creates connectors with userId: undefined so they appear for all users
 */
export declare const seedGlobalConnectors: import("convex/server").RegisteredMutation<"internal", {
    connectors: {
        type: "HTTP" | "SSE";
        url: string;
        name: string;
        nameId: string;
    }[];
}, Promise<any[]>>;
/**
 * Create a user's instance of a default connector template
 * This allows users to configure their own credentials for a default connector
 */
export declare const createFromTemplate: import("convex/server").RegisteredMutation<"public", {
    oauthClientId?: string;
    oauthClientSecret?: string;
    url: string;
    userId: import("convex/values").GenericId<"users">;
    templateNameId: string;
}, Promise<{
    connectorId: import("convex/values").GenericId<"mcpConnectors">;
    name: string;
}>>;
//# sourceMappingURL=mcpConnectorDefaults.d.ts.map