import { NextResponse, NextRequest } from "next/server";
import { verifyTaskOwnership } from "@/lib/auth/verify-task-ownership";
import { makeBackendRequest } from "@/lib/make-backend-request";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    const { error, user: _user } = await verifyTaskOwnership(taskId);
    if (error) return error;

    // Proxy request to backend server
    const backendUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";
    console.log(`[FILE_TREE] Proxying to backend: ${backendUrl}/api/tasks/${taskId}/files/tree`);
    
    const response = await makeBackendRequest(
      `/api/tasks/${taskId}/files/tree`
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "no body");
      console.error(
        "[BACKEND_FILE_TREE_ERROR]",
        response.status,
        response.statusText,
        "Backend URL:",
        backendUrl,
        "Body:",
        errorBody
      );
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch file tree from backend",
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("[FILE_TREE_PROXY_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
