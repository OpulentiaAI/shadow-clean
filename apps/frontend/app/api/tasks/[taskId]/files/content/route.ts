import { NextResponse, NextRequest } from "next/server";
import { makeBackendRequest } from "@/lib/make-backend-request";
import { verifyTaskOwnership } from "@/lib/auth/verify-task-ownership";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json(
      { success: false, error: "File path is required" },
      { status: 400 }
    );
  }

  try {
    const { error } = await verifyTaskOwnership(taskId);
    if (error) return error;

    // Proxy request to backend server
    const params = new URLSearchParams({ path: filePath });
    const response = await makeBackendRequest(
      `/api/tasks/${taskId}/files/content?${params}`
    );

    if (!response.ok) {
      const data = await response.json();
      
      // Handle file not found errors more gracefully
      if (response.status === 404 && data.errorType === "FILE_NOT_FOUND") {
        return NextResponse.json(
          {
            success: false,
            error: data.error,
            errorType: "FILE_NOT_FOUND",
          },
          { status: 404 }
        );
      }
      
      console.error(
        "[BACKEND_FILE_CONTENT_ERROR]",
        response.status,
        response.statusText,
        data.error
      );
      return NextResponse.json(
        {
          success: false,
          error: data.error || "Failed to fetch file content from backend",
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("[FILE_CONTENT_PROXY_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
