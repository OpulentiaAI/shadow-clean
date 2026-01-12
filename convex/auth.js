"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserSettings = exports.getSession = exports.deleteVerification = exports.getVerification = exports.createVerification = exports.updateAccountTokens = exports.clearGitHubInstallation = exports.updateGitHubInstallation = exports.getGitHubAccount = exports.getAccountByProvider = exports.createAccount = exports.deleteUserSessions = exports.deleteSession = exports.getSessionByToken = exports.createSession = exports.upsertUser = exports.getUserByExternalId = exports.getUserByEmail = exports.currentUser = exports.getCurrentUser = exports.createAuth = exports.authComponent = void 0;
const better_auth_1 = require("@convex-dev/better-auth");
const plugins_1 = require("@convex-dev/better-auth/plugins");
const better_auth_2 = require("better-auth");
const server_1 = require("./_generated/server");
const api_1 = require("./_generated/api");
const values_1 = require("convex/values");
const auth_config_1 = __importDefault(require("./auth.config"));
const siteUrl = process.env.SITE_URL || "https://code.opulentia.ai";
// The component client has methods needed for integrating Convex with Better Auth
exports.authComponent = (0, better_auth_1.createClient)(api_1.components.betterAuth);
const createAuth = (ctx) => {
    return (0, better_auth_2.betterAuth)({
        baseURL: siteUrl,
        database: exports.authComponent.adapter(ctx),
        socialProviders: {
            github: {
                clientId: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                scope: ["repo", "read:user", "user:email"],
            },
        },
        secret: process.env.BETTER_AUTH_SECRET,
        trustedOrigins: [siteUrl, "https://code.opulentia.ai"],
        plugins: [
            (0, plugins_1.convex)({ authConfig: auth_config_1.default }),
        ],
    });
};
exports.createAuth = createAuth;
// Get current authenticated user via Better Auth component
exports.getCurrentUser = (0, server_1.query)({
    args: {},
    handler: async (ctx) => {
        return exports.authComponent.getAuthUser(ctx);
    },
});
exports.currentUser = (0, server_1.query)({
    args: { userId: values_1.v.optional(values_1.v.id("users")) },
    handler: async (ctx, args) => {
        if (!args.userId)
            return null;
        return ctx.db.get(args.userId);
    },
});
exports.getUserByEmail = (0, server_1.query)({
    args: { email: values_1.v.string() },
    handler: async (ctx, args) => {
        return ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
    },
});
exports.getUserByExternalId = (0, server_1.query)({
    args: { externalId: values_1.v.string() },
    handler: async (ctx, args) => {
        return ctx.db
            .query("users")
            .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
            .first();
    },
});
exports.upsertUser = (0, server_1.mutation)({
    args: {
        externalId: values_1.v.string(),
        name: values_1.v.string(),
        email: values_1.v.string(),
        image: values_1.v.optional(values_1.v.string()),
        emailVerified: values_1.v.optional(values_1.v.boolean()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
        if (existing) {
            await ctx.db.patch(existing._id, {
                name: args.name,
                image: args.image,
                emailVerified: args.emailVerified ?? existing.emailVerified,
                updatedAt: now,
                externalId: args.externalId,
            });
            return existing._id;
        }
        return ctx.db.insert("users", {
            externalId: args.externalId,
            name: args.name,
            email: args.email,
            emailVerified: args.emailVerified ?? false,
            image: args.image,
            createdAt: now,
            updatedAt: now,
        });
    },
});
exports.createSession = (0, server_1.mutation)({
    args: {
        userId: values_1.v.id("users"),
        token: values_1.v.string(),
        expiresAt: values_1.v.number(),
        ipAddress: values_1.v.optional(values_1.v.string()),
        userAgent: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const sessionId = await ctx.db.insert("sessions", {
            userId: args.userId,
            token: args.token,
            expiresAt: args.expiresAt,
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
            createdAt: now,
            updatedAt: now,
        });
        return sessionId;
    },
});
exports.getSessionByToken = (0, server_1.query)({
    args: { token: values_1.v.string() },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();
        if (!session)
            return null;
        if (session.expiresAt < Date.now())
            return null;
        const user = await ctx.db.get(session.userId);
        return { session, user };
    },
});
exports.deleteSession = (0, server_1.mutation)({
    args: { token: values_1.v.string() },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();
        if (session) {
            await ctx.db.delete(session._id);
        }
        return { success: true };
    },
});
exports.deleteUserSessions = (0, server_1.mutation)({
    args: { userId: values_1.v.id("users") },
    handler: async (ctx, args) => {
        const sessions = await ctx.db
            .query("sessions")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        for (const session of sessions) {
            await ctx.db.delete(session._id);
        }
        return { deleted: sessions.length };
    },
});
exports.createAccount = (0, server_1.mutation)({
    args: {
        userId: values_1.v.id("users"),
        accountId: values_1.v.string(),
        providerId: values_1.v.string(),
        accessToken: values_1.v.optional(values_1.v.string()),
        refreshToken: values_1.v.optional(values_1.v.string()),
        idToken: values_1.v.optional(values_1.v.string()),
        accessTokenExpiresAt: values_1.v.optional(values_1.v.number()),
        refreshTokenExpiresAt: values_1.v.optional(values_1.v.number()),
        scope: values_1.v.optional(values_1.v.string()),
        githubInstallationId: values_1.v.optional(values_1.v.string()),
        githubAppConnected: values_1.v.optional(values_1.v.boolean()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const existing = await ctx.db
            .query("accounts")
            .withIndex("by_provider", (q) => q.eq("providerId", args.providerId).eq("accountId", args.accountId))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                accessToken: args.accessToken,
                refreshToken: args.refreshToken,
                idToken: args.idToken,
                accessTokenExpiresAt: args.accessTokenExpiresAt,
                refreshTokenExpiresAt: args.refreshTokenExpiresAt,
                scope: args.scope,
                githubInstallationId: args.githubInstallationId,
                githubAppConnected: args.githubAppConnected ?? existing.githubAppConnected,
                updatedAt: now,
            });
            return existing._id;
        }
        return ctx.db.insert("accounts", {
            userId: args.userId,
            accountId: args.accountId,
            providerId: args.providerId,
            accessToken: args.accessToken,
            refreshToken: args.refreshToken,
            idToken: args.idToken,
            accessTokenExpiresAt: args.accessTokenExpiresAt,
            refreshTokenExpiresAt: args.refreshTokenExpiresAt,
            scope: args.scope,
            password: undefined,
            githubInstallationId: args.githubInstallationId,
            githubAppConnected: args.githubAppConnected ?? false,
            createdAt: now,
            updatedAt: now,
        });
    },
});
exports.getAccountByProvider = (0, server_1.query)({
    args: {
        userId: values_1.v.id("users"),
        providerId: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        return ctx.db
            .query("accounts")
            .withIndex("by_user_provider", (q) => q.eq("userId", args.userId).eq("providerId", args.providerId))
            .first();
    },
});
exports.getGitHubAccount = (0, server_1.query)({
    args: { userId: values_1.v.id("users") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("accounts")
            .withIndex("by_user_provider", (q) => q.eq("userId", args.userId).eq("providerId", "github"))
            .first();
    },
});
exports.updateGitHubInstallation = (0, server_1.mutation)({
    args: {
        userId: values_1.v.id("users"),
        githubInstallationId: values_1.v.optional(values_1.v.string()),
        githubAppConnected: values_1.v.boolean(),
    },
    handler: async (ctx, args) => {
        const account = await ctx.db
            .query("accounts")
            .withIndex("by_user_provider", (q) => q.eq("userId", args.userId).eq("providerId", "github"))
            .first();
        if (!account) {
            return null;
        }
        await ctx.db.patch(account._id, {
            githubInstallationId: args.githubInstallationId,
            githubAppConnected: args.githubAppConnected,
            updatedAt: Date.now(),
        });
        return account._id;
    },
});
exports.clearGitHubInstallation = (0, server_1.mutation)({
    args: { userId: values_1.v.id("users") },
    handler: async (ctx, args) => {
        const account = await ctx.db
            .query("accounts")
            .withIndex("by_user_provider", (q) => q.eq("userId", args.userId).eq("providerId", "github"))
            .first();
        if (!account) {
            return null;
        }
        await ctx.db.patch(account._id, {
            githubInstallationId: undefined,
            githubAppConnected: false,
            updatedAt: Date.now(),
        });
        return account._id;
    },
});
exports.updateAccountTokens = (0, server_1.mutation)({
    args: {
        accountId: values_1.v.id("accounts"),
        accessToken: values_1.v.string(),
        refreshToken: values_1.v.string(),
        accessTokenExpiresAt: values_1.v.number(),
        refreshTokenExpiresAt: values_1.v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.accountId);
        if (!existing) {
            throw new Error("Account not found");
        }
        await ctx.db.patch(args.accountId, {
            accessToken: args.accessToken,
            refreshToken: args.refreshToken,
            accessTokenExpiresAt: args.accessTokenExpiresAt,
            refreshTokenExpiresAt: args.refreshTokenExpiresAt,
            updatedAt: Date.now(),
        });
        return { success: true };
    },
});
exports.createVerification = (0, server_1.mutation)({
    args: {
        identifier: values_1.v.string(),
        value: values_1.v.string(),
        expiresAt: values_1.v.number(),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const existing = await ctx.db
            .query("verification")
            .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                value: args.value,
                expiresAt: args.expiresAt,
                updatedAt: now,
            });
            return existing._id;
        }
        return ctx.db.insert("verification", {
            identifier: args.identifier,
            value: args.value,
            expiresAt: args.expiresAt,
            createdAt: now,
            updatedAt: now,
        });
    },
});
exports.getVerification = (0, server_1.query)({
    args: { identifier: values_1.v.string() },
    handler: async (ctx, args) => {
        const verification = await ctx.db
            .query("verification")
            .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
            .first();
        if (!verification)
            return null;
        if (verification.expiresAt < Date.now())
            return null;
        return verification;
    },
});
exports.deleteVerification = (0, server_1.mutation)({
    args: { identifier: values_1.v.string() },
    handler: async (ctx, args) => {
        const verification = await ctx.db
            .query("verification")
            .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
            .first();
        if (verification) {
            await ctx.db.delete(verification._id);
        }
        return { success: true };
    },
});
/**
 * Get current session - Convex-native replacement for /api/get-session
 * This query should be used with useQuery(api.auth.getSession)
 */
exports.getSession = (0, server_1.query)({
    args: {
        token: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        // If no token provided, return null
        if (!args.token) {
            return null;
        }
        // Look up session by token
        const tokenValue = args.token;
        if (!tokenValue)
            return null;
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", tokenValue))
            .first();
        if (!session) {
            return null;
        }
        // Check if session is expired
        if (session.expiresAt < Date.now()) {
            return null;
        }
        // Get associated user
        const user = await ctx.db.get(session.userId);
        if (!user) {
            return null;
        }
        // Get GitHub account if exists
        const githubAccount = await ctx.db
            .query("accounts")
            .withIndex("by_user_provider", (q) => q.eq("userId", session.userId).eq("providerId", "github"))
            .first();
        return {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                emailVerified: user.emailVerified,
            },
            session: {
                id: session._id,
                expiresAt: session.expiresAt,
            },
            github: githubAccount
                ? {
                    connected: githubAccount.githubAppConnected,
                    installationId: githubAccount.githubInstallationId,
                }
                : null,
        };
    },
});
/**
 * Get user settings - Convex-native
 */
exports.getUserSettings = (0, server_1.query)({
    args: {
        userId: values_1.v.id("users"),
    },
    handler: async (ctx, args) => {
        return ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();
    },
});
