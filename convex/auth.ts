import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { v } from "convex/values";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL || "https://code.opulentia.ai";

// The component client has methods needed for integrating Convex with Better Auth
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        scope: ["repo", "read:user", "user:email"],
      },
    },
    secret: process.env.BETTER_AUTH_SECRET as string,
    trustedOrigins: [siteUrl, "https://code.opulentia.ai"],
    plugins: [
      convex({ authConfig }),
    ],
  });
};

// Get current authenticated user via Better Auth component
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});

export const currentUser = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    return ctx.db.get(args.userId);
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const getUserByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

export const upsertUser = mutation({
  args: {
    externalId: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
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

export const createSession = mutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
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

export const getSessionByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session) return null;
    if (session.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    return { session, user };
  },
});

export const deleteSession = mutation({
  args: { token: v.string() },
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

export const deleteUserSessions = mutation({
  args: { userId: v.id("users") },
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

export const createAccount = mutation({
  args: {
    userId: v.id("users"),
    accountId: v.string(),
    providerId: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    idToken: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.number()),
    refreshTokenExpiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
    githubInstallationId: v.optional(v.string()),
    githubAppConnected: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_provider", (q) =>
        q.eq("providerId", args.providerId).eq("accountId", args.accountId)
      )
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

export const getAccountByProvider = query({
  args: {
    userId: v.id("users"),
    providerId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("accounts")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("providerId", args.providerId)
      )
      .first();
  },
});

export const getGitHubAccount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("accounts")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("providerId", "github")
      )
      .first();
  },
});

export const updateGitHubInstallation = mutation({
  args: {
    userId: v.id("users"),
    githubInstallationId: v.optional(v.string()),
    githubAppConnected: v.boolean(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("providerId", "github")
      )
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

export const clearGitHubInstallation = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("providerId", "github")
      )
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

export const updateAccountTokens = mutation({
  args: {
    accountId: v.id("accounts"),
    accessToken: v.string(),
    refreshToken: v.string(),
    accessTokenExpiresAt: v.number(),
    refreshTokenExpiresAt: v.number(),
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

export const createVerification = mutation({
  args: {
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
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

export const getVerification = query({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const verification = await ctx.db
      .query("verification")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .first();
    if (!verification) return null;
    if (verification.expiresAt < Date.now()) return null;
    return verification;
  },
});

export const deleteVerification = mutation({
  args: { identifier: v.string() },
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
export const getSession = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If no token provided, return null
    if (!args.token) {
      return null;
    }

    // Look up session by token
    const tokenValue = args.token;
    if (!tokenValue) return null;
    
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
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", session.userId).eq("providerId", "github")
      )
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
export const getUserSettings = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});
