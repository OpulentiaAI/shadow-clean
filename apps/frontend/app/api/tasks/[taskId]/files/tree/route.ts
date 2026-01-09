import { NextResponse, type NextRequest } from "next/server";
import { verifyTaskOwnership } from "@/lib/auth/verify-task-ownership";
import { getConvexClient, api } from "@/lib/convex/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    const { error, user: _user } = await verifyTaskOwnership(taskId);
    if (error) return error;

    const convex = getConvexClient();
    const task = await convex.query(api.tasks.get, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      taskId: taskId as any,
    });

    if (!task) {
      return NextResponse.json({
        success: false,
        error: "Task not found",
        tree: [],
      });
    }

    // Use Convex query for file tree (works for both scratchpad and non-scratchpad)
    try {
      const result = await convex.query(api.files.getTree, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        taskId: taskId as any,
      });

      // For scratchpad with no files, provide default README
      if ((result.tree?.length ?? 0) === 0 && task.isScratchpad) {
        return NextResponse.json({
          success: true,
          tree: [
            {
              name: "README.md",
              path: "README.md",
              type: "file",
            },
          ],
          note: "Scratchpad default README",
        });
      }

      return NextResponse.json({
        success: result.success,
        tree: result.tree || [],
        note: result.note,
      });
    } catch (convexError) {
      console.log("[FILE_TREE] Convex query failed:", convexError);
      return NextResponse.json({
        success: true,
        tree: [],
        note: "File tree unavailable - Convex query failed",
      });
    }
  } catch (error: unknown) {
    console.error("[FILE_TREE_ERROR]", error);
    return NextResponse.json({
      success: true,
      tree: [],
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
