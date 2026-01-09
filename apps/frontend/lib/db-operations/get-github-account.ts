import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export async function getGitHubAccount(userId: string) {
  try {
    // Convert string userId to Convex Id if needed
    const convexUserId = userId as Id<"users">;
    
    const account = await fetchQuery(api.auth.getGitHubAccount, {
      userId: convexUserId,
    });

    return account;
  } catch (error) {
    console.error("[getGitHubAccount] Error fetching from Convex:", error);
    return null;
  }
}
