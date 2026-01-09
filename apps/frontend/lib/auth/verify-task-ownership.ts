import { getUser } from "@/lib/auth/get-user";
import { getConvexClient, api } from "@/lib/convex/client";
import { NextResponse } from "next/server";
import type { Id } from "../../../../convex/_generated/dataModel";

// Helper to delay for retry
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry task lookup with exponential backoff (handles eventual consistency edge cases)
async function getConvexTaskWithRetry(
  client: ReturnType<typeof getConvexClient>,
  taskId: string,
  maxRetries = 3
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const convexTask = await client.query(api.tasks.get, {
      taskId: taskId as Id<"tasks">,
    });

    if (convexTask) {
      return convexTask;
    }

    // Only retry if we haven't exhausted attempts
    if (attempt < maxRetries) {
      const waitMs = Math.min(100 * Math.pow(2, attempt), 500); // 100ms, 200ms, 400ms, max 500ms
      console.log(
        `[verifyTaskOwnership] Task ${taskId} not found, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`
      );
      await delay(waitMs);
    }
  }

  return null;
}

export async function verifyTaskOwnership(taskId: string) {
  // In local/dev we don't enforce ownership (avoid auth friction)
  if (
    process.env.NEXT_PUBLIC_BYPASS_AUTH === "true" ||
    process.env.NODE_ENV !== "production"
  ) {
    return { error: null, user: null };
  }

  // Check authentication
  const user = await getUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
      user: null,
    };
  }

  // Check Convex for task ownership (Prisma/Railway DB is deprecated)
  try {
    const client = getConvexClient();

    // Use retry logic to handle potential race conditions with task creation
    const convexTask = await getConvexTaskWithRetry(client, taskId);

    if (!convexTask) {
      console.error(
        `[verifyTaskOwnership] Task ${taskId} not found in Convex after retries.`
      );
      return {
        error: NextResponse.json(
          { success: false, error: "Task not found" },
          { status: 404 }
        ),
        user: null,
      };
    }

    // Verify ownership - user.id is now the Convex users table ID
    const taskUserId = (convexTask.userId ?? "").toString();
    const currentUserId = user.id;

    if (taskUserId !== currentUserId) {
      console.warn(
        `[verifyTaskOwnership] Ownership mismatch for task ${taskId}. ` +
          `Task userId: ${taskUserId}, Current userId: ${currentUserId}`
      );
      return {
        error: NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        ),
        user: null,
      };
    }

    console.log(
      `[verifyTaskOwnership] Task ${taskId} ownership verified for user ${user.id}`
    );
  } catch (err) {
    console.error("[verifyTaskOwnership] Convex lookup failed", err);
    return {
      error: NextResponse.json(
        { success: false, error: "Task lookup failed" },
        { status: 500 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}