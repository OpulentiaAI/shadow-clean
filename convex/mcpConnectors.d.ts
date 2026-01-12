type McpDiscoveryResult = {
    tools: Array<{
        name: string;
        description?: string;
    }>;
    resources: Array<{
        name: string;
        uri: string;
        description?: string;
        mimeType?: string;
    }>;
    prompts: Array<{
        name: string;
        description?: string;
        arguments?: Array<{
            name: string;
            description?: string;
            required?: boolean;
        }>;
    }>;
};
/**
 * List all MCP connectors for a user (including global connectors)
 * Note: oauthClientSecret and configJson are redacted for security
 */
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    oauthClientSecret: string;
    configJson: string;
    _id: import("convex/values").GenericId<"mcpConnectors">;
    _creationTime: number;
    userId?: import("convex/values").GenericId<"users">;
    templateId?: string;
    oauthClientId?: string;
    type: "HTTP" | "SSE";
    url: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    nameId: string;
    enabled: boolean;
}[]>>;
/**
 * Get a single MCP connector by ID (public - secrets redacted)
 */
export declare const get: import("convex/server").RegisteredQuery<"public", {
    connectorId: import("convex/values").GenericId<"mcpConnectors">;
}, Promise<{
    oauthClientSecret: string;
    _id: import("convex/values").GenericId<"mcpConnectors">;
    _creationTime: number;
    userId?: import("convex/values").GenericId<"users">;
    templateId?: string;
    configJson?: string;
    oauthClientId?: string;
    type: "HTTP" | "SSE";
    url: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    nameId: string;
    enabled: boolean;
}>>;
/**
 * Get a single MCP connector by ID with secrets (internal use only for discover action)
 */
export declare const getWithSecrets: import("convex/server").RegisteredQuery<"internal", {
    connectorId: import("convex/values").GenericId<"mcpConnectors">;
}, Promise<{
    _id: import("convex/values").GenericId<"mcpConnectors">;
    _creationTime: number;
    userId?: import("convex/values").GenericId<"users">;
    templateId?: string;
    configJson?: string;
    oauthClientId?: string;
    oauthClientSecret?: string;
    type: "HTTP" | "SSE";
    url: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    nameId: string;
    enabled: boolean;
}>>;
/**
 * Check if a nameId already exists for a user
 */
export declare const getByNameId: import("convex/server").RegisteredQuery<"public", {
    userId?: import("convex/values").GenericId<"users">;
    nameId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"mcpConnectors">;
    _creationTime: number;
    userId?: import("convex/values").GenericId<"users">;
    templateId?: string;
    configJson?: string;
    oauthClientId?: string;
    oauthClientSecret?: string;
    type: "HTTP" | "SSE";
    url: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    nameId: string;
    enabled: boolean;
}>>;
/**
 * Create a new MCP connector
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    templateId?: string;
    configJson?: string;
    oauthClientId?: string;
    oauthClientSecret?: string;
    type: "HTTP" | "SSE";
    url: string;
    name: string;
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    connectorId: import("convex/values").GenericId<"mcpConnectors">;
}>>;
/**
 * Update an MCP connector
 */
export declare const update: import("convex/server").RegisteredMutation<"public", {
    type?: "HTTP" | "SSE";
    url?: string;
    name?: string;
    templateId?: string;
    configJson?: string;
    oauthClientId?: string;
    oauthClientSecret?: string;
    enabled?: boolean;
    userId: import("convex/values").GenericId<"users">;
    connectorId: import("convex/values").GenericId<"mcpConnectors">;
}, Promise<{
    success: boolean;
}>>;
/**
 * Toggle connector enabled state
 */
export declare const toggleEnabled: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
    enabled: boolean;
    connectorId: import("convex/values").GenericId<"mcpConnectors">;
}, Promise<{
    success: boolean;
}>>;
/**
 * Delete an MCP connector
 */
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
    connectorId: import("convex/values").GenericId<"mcpConnectors">;
}, Promise<{
    success: boolean;
}>>;
/**
 * List all enabled connectors for a user (for agent use)
 */
export declare const listEnabledByUser: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"mcpConnectors">;
    _creationTime: number;
    userId?: import("convex/values").GenericId<"users">;
    templateId?: string;
    configJson?: string;
    oauthClientId?: string;
    oauthClientSecret?: string;
    type: "HTTP" | "SSE";
    url: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    nameId: string;
    enabled: boolean;
}[]>>;
/**
 * Discover tools, resources, and prompts from an MCP connector
 */
export declare const discover: import("convex/server").RegisteredAction<"public", {
    userId: import("convex/values").GenericId<"users">;
    connectorId: import("convex/values").GenericId<"mcpConnectors">;
}, Promise<McpDiscoveryResult>>;
export {};
//# sourceMappingURL=mcpConnectors.d.ts.map