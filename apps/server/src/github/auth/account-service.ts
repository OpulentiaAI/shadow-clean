import { githubTokenManager } from "./token-manager";
import { getGitHubAccount as getGitHubAccountFromConvex, toConvexId } from "../../lib/convex-operations";

export async function getGitHubAccount(userId: string) {
  // Get GitHub account via Convex
  const account = await getGitHubAccountFromConvex(toConvexId<"users">(userId));
  return account;
}

/**
 * Get a valid GitHub access token for a user, refreshing if necessary
 * @param userId - The user ID
 * @returns A valid access token or null if authentication is needed
 */
export async function getGitHubAccessToken(
  userId: string
): Promise<string | null> {
  return await githubTokenManager.getValidAccessToken(userId);
}
