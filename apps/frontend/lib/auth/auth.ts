import { prisma } from "@repo/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

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
});
