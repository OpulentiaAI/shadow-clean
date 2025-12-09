import { getUser } from "@/lib/auth/get-user";
import { getConvexClient, api } from "@/lib/convex/client";
import { db } from "@repo/db";
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

  // Try Prisma first (legacy tasks)
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { userId: true },
  });

  if (task) {
    if (task.userId !== user.id) {
      return {
        error: NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        ),
        user: null,
      };
    }
    return { error: null, user };
  }

  // Fallback: check Convex tasks (Convex IDs are not in Prisma)
  try {
    const client = getConvexClient();

    // Log Convex URL for debugging production issues
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    console.log(
      `[verifyTaskOwnership] Checking task ${taskId} in Convex (URL: ${convexUrl?.substring(0, 50)}...)`
    );

    const convexUser = await client.query(api.auth.getUserByExternalId, {
      externalId: user.id,
    });

    if (!convexUser) {
      console.warn(
        `[verifyTaskOwnership] Convex user not found for externalId: ${user.id}`
      );
    }

    // Use retry logic to handle potential race conditions with task creation
    const convexTask = await getConvexTaskWithRetry(client, taskId);

    if (!convexTask) {
      console.error(
        `[verifyTaskOwnership] Task ${taskId} not found in Convex after retries. ` +
          `User externalId: ${user.id}, Convex user found: ${!!convexUser}`
      );
      return {
        error: NextResponse.json(
          { success: false, error: "Task not found" },
          { status: 404 }
        ),
        user: null,
      };
    }

    // Verify ownership
    const taskUserId = (convexTask.userId ?? "").toString();
    const convexUserId = convexUser?._id?.toString() ?? "";

    if (!convexUser || taskUserId !== convexUserId) {
      console.warn(
        `[verifyTaskOwnership] Ownership mismatch for task ${taskId}. ` +
          `Task userId: ${taskUserId}, Convex userId: ${convexUserId}`
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