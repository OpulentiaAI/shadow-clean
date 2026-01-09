import { NextResponse, type NextRequest } from "next/server";
import { verifyTaskOwnership } from "@/lib/auth/verify-task-ownership";
import { getConvexClient, api } from "@/lib/convex/client";
import { getGitHubFileContent } from "@/lib/github/github-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  const { searchParams } = new URL(request.url);
  const rawFilePath = searchParams.get("path");

  if (!rawFilePath) {
    return NextResponse.json(
      { success: false, error: "File path is required" },
      { status: 400 }
    );
  }

  // Normalize path: remove leading slash and ./ prefix
  const filePath = rawFilePath.replace(/^\/+/, "").replace(/^\.\//, "");

  try {
    const { error, user } = await verifyTaskOwnership(taskId);
    if (error) return error;

    const convex = getConvexClient();
    const task = await convex.query(api.tasks.get, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      taskId: taskId as any,
    });

    // Try to get content from Convex first
    const result = await convex.query((api as any).files.getContent, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      taskId: taskId as any,
      path: filePath,
    });

    // If Convex has content, return it
    if (result?.success && result.content) {
      return NextResponse.json(result);
    }

    // For scratchpad default README
    if (task?.isScratchpad && filePath === "README.md") {
      const defaultReadme =
        "# Scratchpad\n\nThis scratchpad starts with a default README.\n";
      return NextResponse.json({
        success: true,
        content: defaultReadme,
        path: filePath,
        size: defaultReadme.length,
        truncated: false,
      });
    }

    // For non-scratchpad tasks, fetch content from GitHub on-demand
    if (!task?.isScratchpad && task?.repoFullName && task?.baseBranch && user?.id) {
      console.log(`[FILE_CONTENT] Fetching from GitHub: ${task.repoFullName}/${task.baseBranch}/${filePath}`);
      
      const githubResult = await getGitHubFileContent(
        task.repoFullName,
        task.baseBranch,
        filePath,
        user.id
      );

      if (githubResult.success && githubResult.content) {
        return NextResponse.json({
          success: true,
          content: githubResult.content,
          path: filePath,
          size: githubResult.content.length,
          truncated: false,
        });
      }

      // GitHub fetch failed
      console.log(`[FILE_CONTENT] GitHub fetch failed: ${githubResult.error}`);
    }

    if (result?.errorType === "FILE_NOT_FOUND") {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(
      {
        success: false,
        error: result?.error || "Failed to fetch file content",
        errorType: result?.errorType || "UNKNOWN",
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("[FILE_CONTENT_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
