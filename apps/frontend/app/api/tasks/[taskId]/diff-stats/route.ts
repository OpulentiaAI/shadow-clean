import { verifyTaskOwnership } from "@/lib/auth/verify-task-ownership";
import { NextRequest, NextResponse } from "next/server";
import { getConvexClient, api } from "@/lib/convex/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    const { error, user: _user } = await verifyTaskOwnership(taskId);
    if (error) return error;

    // Use Convex query for diff stats (no backend dependency)
    try {
      const convex = getConvexClient();
      const result = await convex.query(api.files.getDiffStats, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        taskId: taskId as any,
      });

      return NextResponse.json({
        success: result.success,
        filesChanged: result.filesChanged || 0,
        additions: result.additions || 0,
        deletions: result.deletions || 0,
        changes: result.changes || [],
      });
    } catch (convexError) {
      console.log("[DIFF_STATS] Convex query failed:", convexError);
      // Return empty stats on error
      return NextResponse.json({
        success: true,
        filesChanged: 0,
        additions: 0,
        deletions: 0,
        changes: [],
        note: "Diff stats unavailable - Convex query failed",
      });
    }
  } catch (error) {
    console.error("Error fetching diff stats:", error);
    return NextResponse.json({
      success: true,
      filesChanged: 0,
      additions: 0,
      deletions: 0,
      changes: [],
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
