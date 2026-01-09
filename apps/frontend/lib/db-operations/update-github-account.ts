import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export async function clearGitHubInstallation(userId: string) {
  try {
    const convexUserId = userId as Id<"users">;
    
    const result = await fetchMutation(api.auth.clearGitHubInstallation, {
      userId: convexUserId,
    });

    return result;
  } catch (error) {
    console.error("[clearGitHubInstallation] Error:", error);
    return null;
  }
}
