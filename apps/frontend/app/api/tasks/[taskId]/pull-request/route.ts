import { verifyTaskOwnership } from "@/lib/auth/verify-task-ownership";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    const { error, user } = await verifyTaskOwnership(taskId);
    if (error) return error;
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Pull request creation requires GitHub API integration
    // This should be handled via Convex action with GitHub token
    // For now, return a helpful message
    return NextResponse.json({
      success: false,
      error: "Pull request creation requires GitHub integration via Convex",
      note: "Use api.github.createPullRequest action with proper authentication",
      taskId,
      userId: user.id,
    });
  } catch (error) {
    console.error(`Error creating PR for task:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
