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

// Debug: Log OAuth credentials at startup (redacted)
const githubClientId = process.env.GITHUB_CLIENT_ID?.trim();
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
console.log("[Auth] GitHub OAuth config:", {
  clientId: githubClientId ? `${githubClientId.substring(0, 8)}...` : "MISSING",
  clientSecretLength: githubClientSecret?.length ?? 0,
  clientSecretHasNewline: githubClientSecret?.includes("\n") ?? false,
  baseURL,
});

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  baseURL, // Explicitly set the base URL for OAuth redirects
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  logger: {
    level: "debug",
  },
  socialProviders: {
    github: {
      clientId: githubClientId as string,
      clientSecret: githubClientSecret as string,
      scope: ["repo", "read:user", "user:email"], // Request full repo access for cloning and pushing
      // Store access token for API calls
      accessType: "offline", // Request refresh token
      // Custom getUserInfo to debug the actual error
      getUserInfo: async (token) => {
        console.log("[Auth] getUserInfo called with token type:", typeof token.accessToken);
        console.log("[Auth] Token length:", token.accessToken?.length);
        
        try {
          const userRes = await fetch("https://api.github.com/user", {
            headers: {
              "Authorization": `Bearer ${token.accessToken}`,
              "Accept": "application/json",
              "User-Agent": "OpulentCode",
            },
          });
          
          console.log("[Auth] GitHub user API status:", userRes.status);
          
          if (!userRes.ok) {
            const errorText = await userRes.text();
            console.error("[Auth] GitHub user API error:", errorText);
            return null;
          }
          
          const profile = await userRes.json();
          console.log("[Auth] GitHub user fetched:", profile.login, profile.id);
          
          // Fetch emails
          const emailsRes = await fetch("https://api.github.com/user/emails", {
            headers: {
              "Authorization": `Bearer ${token.accessToken}`,
              "Accept": "application/json", 
              "User-Agent": "OpulentCode",
            },
          });
          
          let emails: { email: string; primary: boolean; verified: boolean }[] = [];
          if (emailsRes.ok) {
            emails = await emailsRes.json();
          } else {
            console.error("[Auth] GitHub emails API error:", await emailsRes.text());
          }
          
          const primaryEmail = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? profile.email;
          const emailVerified = emails.find((e) => e.email === primaryEmail)?.verified ?? false;
          
          return {
            user: {
              id: String(profile.id),
              name: profile.name || profile.login,
              email: primaryEmail,
              image: profile.avatar_url,
              emailVerified,
            },
            data: profile,
          };
        } catch (error) {
          console.error("[Auth] getUserInfo error:", error);
          return null;
        }
      },
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
