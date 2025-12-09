import { getUser } from "@/lib/auth/get-user";
import { getConvexClient, api } from "@/lib/convex/client";
import { db } from "@repo/db";
import { NextResponse } from "next/server";
import type { Id } from "../../../../convex/_generated/dataModel";

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
    const convexUser = await client.query(api.auth.getUserByExternalId, {
      externalId: user.id,
    });

    const convexTask = await client.query(api.tasks.get, {
      // best effort cast; Convex will return null if invalid
      taskId: taskId as Id<"tasks">,
    });

    if (!convexTask) {
      return {
        error: NextResponse.json(
          { success: false, error: "Task not found" },
          { status: 404 }
        ),
        user: null,
      };
    }

    if (
      !convexUser ||
      (convexTask.userId ?? "").toString() !== convexUser._id.toString()
    ) {
      return {
        error: NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        ),
        user: null,
      };
    }
  } catch (err) {
    console.warn("[verifyTaskOwnership] Convex lookup failed", err);
    // Fall through to allow with auth if Convex unreachable? Safer to deny.
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