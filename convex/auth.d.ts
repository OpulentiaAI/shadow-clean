import { type GenericCtx } from "@convex-dev/better-auth";
import { DataModel } from "./_generated/dataModel";
export declare const authComponent: any;
export declare const createAuth: (ctx: GenericCtx<DataModel>) => import("better-auth", { with: { "resolution-mode": "import" } }).Auth<{
    baseURL: string;
    database: any;
    socialProviders: {
        github: {
            clientId: string;
            clientSecret: string;
            scope: string[];
        };
    };
    secret: string;
    trustedOrigins: string[];
    plugins: [any];
}>;
export declare const getCurrentUser: import("convex/server").RegisteredQuery<"public", {}, Promise<any>>;
export declare const currentUser: import("convex/server").RegisteredQuery<"public", {
    userId?: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"users">;
    _creationTime: number;
    externalId?: string;
    image?: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: number;
    updatedAt: number;
}>>;
export declare const getUserByEmail: import("convex/server").RegisteredQuery<"public", {
    email: string;
}, Promise<{
    _id: import("convex/values").GenericId<"users">;
    _creationTime: number;
    externalId?: string;
    image?: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: number;
    updatedAt: number;
}>>;
export declare const getUserByExternalId: import("convex/server").RegisteredQuery<"public", {
    externalId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"users">;
    _creationTime: number;
    externalId?: string;
    image?: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: number;
    updatedAt: number;
}>>;
export declare const upsertUser: import("convex/server").RegisteredMutation<"public", {
    emailVerified?: boolean;
    image?: string;
    externalId: string;
    name: string;
    email: string;
}, Promise<import("convex/values").GenericId<"users">>>;
export declare const createSession: import("convex/server").RegisteredMutation<"public", {
    ipAddress?: string;
    userAgent?: string;
    token: string;
    expiresAt: number;
    userId: import("convex/values").GenericId<"users">;
}, Promise<import("convex/values").GenericId<"sessions">>>;
export declare const getSessionByToken: import("convex/server").RegisteredQuery<"public", {
    token: string;
}, Promise<{
    session: {
        _id: import("convex/values").GenericId<"sessions">;
        _creationTime: number;
        ipAddress?: string;
        userAgent?: string;
        createdAt: number;
        updatedAt: number;
        token: string;
        expiresAt: number;
        userId: import("convex/values").GenericId<"users">;
    };
    user: {
        _id: import("convex/values").GenericId<"users">;
        _creationTime: number;
        externalId?: string;
        image?: string;
        name: string;
        email: string;
        emailVerified: boolean;
        createdAt: number;
        updatedAt: number;
    };
}>>;
export declare const deleteSession: import("convex/server").RegisteredMutation<"public", {
    token: string;
}, Promise<{
    success: boolean;
}>>;
export declare const deleteUserSessions: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    deleted: number;
}>>;
export declare const createAccount: import("convex/server").RegisteredMutation<"public", {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    accessTokenExpiresAt?: number;
    refreshTokenExpiresAt?: number;
    scope?: string;
    githubInstallationId?: string;
    githubAppConnected?: boolean;
    userId: import("convex/values").GenericId<"users">;
    accountId: string;
    providerId: string;
}, Promise<import("convex/values").GenericId<"accounts">>>;
export declare const getAccountByProvider: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
    providerId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"accounts">;
    _creationTime: number;
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    accessTokenExpiresAt?: number;
    refreshTokenExpiresAt?: number;
    scope?: string;
    password?: string;
    githubInstallationId?: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    accountId: string;
    providerId: string;
    githubAppConnected: boolean;
}>>;
export declare const getGitHubAccount: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"accounts">;
    _creationTime: number;
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    accessTokenExpiresAt?: number;
    refreshTokenExpiresAt?: number;
    scope?: string;
    password?: string;
    githubInstallationId?: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    accountId: string;
    providerId: string;
    githubAppConnected: boolean;
}>>;
export declare const updateGitHubInstallation: import("convex/server").RegisteredMutation<"public", {
    githubInstallationId?: string;
    userId: import("convex/values").GenericId<"users">;
    githubAppConnected: boolean;
}, Promise<import("convex/values").GenericId<"accounts">>>;
export declare const clearGitHubInstallation: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<import("convex/values").GenericId<"accounts">>>;
export declare const updateAccountTokens: import("convex/server").RegisteredMutation<"public", {
    accountId: import("convex/values").GenericId<"accounts">;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
    refreshTokenExpiresAt: number;
}, Promise<{
    success: boolean;
}>>;
export declare const createVerification: import("convex/server").RegisteredMutation<"public", {
    value: string;
    expiresAt: number;
    identifier: string;
}, Promise<import("convex/values").GenericId<"verification">>>;
export declare const getVerification: import("convex/server").RegisteredQuery<"public", {
    identifier: string;
}, Promise<{
    _id: import("convex/values").GenericId<"verification">;
    _creationTime: number;
    createdAt?: number;
    updatedAt?: number;
    value: string;
    expiresAt: number;
    identifier: string;
}>>;
export declare const deleteVerification: import("convex/server").RegisteredMutation<"public", {
    identifier: string;
}, Promise<{
    success: boolean;
}>>;
/**
 * Get current session - Convex-native replacement for /api/get-session
 * This query should be used with useQuery(api.auth.getSession)
 */
export declare const getSession: import("convex/server").RegisteredQuery<"public", {
    token?: string;
}, Promise<{
    user: {
        id: import("convex/values").GenericId<"users">;
        name: string;
        email: string;
        image: string;
        emailVerified: boolean;
    };
    session: {
        id: import("convex/values").GenericId<"sessions">;
        expiresAt: number;
    };
    github: {
        connected: boolean;
        installationId: string;
    };
}>>;
/**
 * Get user settings - Convex-native
 */
export declare const getUserSettings: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"userSettings">;
    _creationTime: number;
    rules?: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    memoriesEnabled: boolean;
    autoPullRequest: boolean;
    enableShadowWiki: boolean;
    enableIndexing: boolean;
    selectedModels: string[];
}>>;
//# sourceMappingURL=auth.d.ts.map