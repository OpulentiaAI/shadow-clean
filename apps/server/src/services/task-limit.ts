import { MAX_TASKS_PER_USER_PRODUCTION } from "@repo/types";
import config from "../config";
import { countActiveTasksByUser, toConvexId } from "../lib/convex-operations";

/**
 * Check if user has reached the maximum number of active tasks
 * Only applies in production environment
 */
export async function hasReachedTaskLimit(userId: string): Promise<boolean> {
  if (config.nodeEnv !== "production") {
    return false;
  }

  const activeTaskCount = await countActiveTasksByUser(
    toConvexId<"users">(userId)
  );
  return activeTaskCount >= MAX_TASKS_PER_USER_PRODUCTION;
}
