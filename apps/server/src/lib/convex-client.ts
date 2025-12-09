import { ConvexHttpClient } from "convex/browser";

let convexClient: ConvexHttpClient | null = null;

/**
 * Get singleton Convex HTTP client for backend operations
 *
 * Uses CONVEX_URL or NEXT_PUBLIC_CONVEX_URL from environment
 */
export function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
      throw new Error(
        "CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable must be set"
      );
    }

    console.log(`[CONVEX_CLIENT] Initializing with URL: ${convexUrl}`);
    convexClient = new ConvexHttpClient(convexUrl);
  }

  return convexClient;
}

/**
 * Reset the client (useful for testing)
 */
export function resetConvexClient() {
  convexClient = null;
}
