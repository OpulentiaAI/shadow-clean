import { prisma } from "@repo/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

async function syncGithubAccountToConvex(account: {
  userId: string;
  providerId: string;
  accountId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  refreshTokenExpiresAt?: Date | null;
  scope?: string | null;
}) {
  if (account.providerId !== "github") return;
  if (!convex) {
    console.log("[Auth] Convex client not configured, skipping sync");
    return;
  }

  try {
    const result = await convex.mutation(api.auth.upsertGithubAccountByExternalId, {
      betterAuthUserId: account.userId,
      accountId: account.accountId,
      accessToken: account.accessToken ?? undefined,
      refreshToken: account.refreshToken ?? undefined,
      accessTokenExpiresAt: account.accessTokenExpiresAt
        ? account.accessTokenExpiresAt.getTime()
        : undefined,
      refreshTokenExpiresAt: account.refreshTokenExpiresAt
        ? account.refreshTokenExpiresAt.getTime()
        : undefined,
      scope: account.scope ?? undefined,
    });
    console.log("[Auth] Synced GitHub account to Convex:", result);
  } catch (err) {
    console.error("[Auth] Failed syncing GitHub account to Convex:", err);
  }
}

// Determine the base URL for OAuth redirects - order of precedence:
// 1. BETTER_AUTH_URL (explicit override)
// 2. NEXT_PUBLIC_APP_URL (app's public URL)
// 3. NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL (Vercel auto-set)
// 4. RAILWAY_PUBLIC_DOMAIN (Railway auto-set, without protocol)
// 5. localhost fallback for development
const getBaseURL = (): string => {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  // Development fallback
  return "http://localhost:3000";
};

const baseURL = getBaseURL();

// Log the resolved baseURL in development for debugging
if (process.env.NODE_ENV === "development") {
  console.log("[Auth] Resolved baseURL:", baseURL);
}

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  baseURL, // Explicitly set the base URL for OAuth redirects
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      scope: ["repo", "read:user", "user:email"], // Request full repo access for cloning and pushing
      // Store access token for API calls
      accessType: "offline", // Request refresh token
    },
  },
  account: {
    // Ensure tokens are stored in the account table
    accountLinking: {
      enabled: true,
      trustedProviders: ["github"],
    },
  },
  secret: process.env.BETTER_AUTH_SECRET as string,
  trustedOrigins: [baseURL, "https://code.opulentia.ai", "https://shadow-frontend-production-373f.up.railway.app"],
  callbacks: {
    redirect: {
      signInRedirect: "/",
      signUpRedirect: "/",
    },
  },
  // Hook to capture and log token storage
  databaseHooks: {
    account: {
      create: {
        before: async (account) => {
          console.log("[Auth] Account CREATE before hook - raw data:", {
            providerId: account.providerId,
            accountId: account.accountId,
            hasAccessToken: !!account.accessToken,
            hasRefreshToken: !!account.refreshToken,
            accessToken: account.accessToken ? `${account.accessToken.substring(0, 10)}...` : null,
            refreshToken: account.refreshToken ? `${account.refreshToken.substring(0, 10)}...` : null,
            accessTokenExpiresAt: account.accessTokenExpiresAt,
            refreshTokenExpiresAt: account.refreshTokenExpiresAt,
            scope: account.scope,
          });
          // Ensure tokens are preserved
          return { data: account };
        },
        after: async (account) => {
          console.log("[Auth] Account CREATE after hook:", {
            id: account.id,
            providerId: account.providerId,
            hasAccessToken: !!account.accessToken,
            hasRefreshToken: !!account.refreshToken,
          });
          await syncGithubAccountToConvex(account);
        },
      },
      update: {
        before: async (account) => {
          console.log("[Auth] Account UPDATE before hook - raw data:", {
            providerId: account.providerId,
            hasAccessToken: !!account.accessToken,
            hasRefreshToken: !!account.refreshToken,
            accessToken: account.accessToken ? `${account.accessToken.substring(0, 10)}...` : null,
          });
          return { data: account };
        },
        after: async (account) => {
          console.log("[Auth] Account UPDATE after hook:", {
            id: account.id,
            providerId: account.providerId,
            hasAccessToken: !!account.accessToken,
            hasRefreshToken: !!account.refreshToken,
          });
          await syncGithubAccountToConvex(account);
        },
      },
    },
  },
});
