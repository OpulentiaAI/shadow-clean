import { createAuthClient } from "better-auth/react";

// Use window.location.origin at runtime; provide SSR fallbacks
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return "http://localhost:3000";
};

// Create client only in the browser to avoid SSR/localStorage issues
const createClient = (): ReturnType<typeof createAuthClient> =>
  typeof window !== "undefined"
    ? createAuthClient({
        baseURL: getBaseURL(),
        basePath: "/api/auth",
      })
    : ({} as ReturnType<typeof createAuthClient>);

export const authClient = createClient();

// This destructuring is necessary to avoid weird better-auth type errors
export const signIn: typeof authClient.signIn = authClient.signIn;
export const signOut: typeof authClient.signOut = authClient.signOut;
export const signUp: typeof authClient.signUp = authClient.signUp;
export const useSession: typeof authClient.useSession = authClient.useSession;
