import { getUser } from "@/lib/auth/get-user";
import { getConvexClient, api } from "@/lib/convex/client";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ repoFullName: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repoFullName } = await params;
    const decodedRepoFullName = decodeURIComponent(repoFullName);

    // Use Convex query for indexing status (no backend dependency)
    try {
      const convex = getConvexClient();
      const result = await convex.query(api.repositoryIndex.get, {
        repoFullName: decodedRepoFullName,
      });

      if (!result) {
        return NextResponse.json({
          indexed: false,
          repoFullName: decodedRepoFullName,
          message: "Repository not indexed",
        });
      }

      return NextResponse.json({
        indexed: true,
        repoFullName: decodedRepoFullName,
        lastIndexedAt: result.lastIndexedAt,
        lastCommitSha: result.lastCommitSha,
      });
    } catch (convexError) {
      console.error("Convex indexing status query failed:", convexError);
      return NextResponse.json({
        indexed: false,
        repoFullName: decodedRepoFullName,
        error: "Failed to query indexing status",
      });
    }
  } catch (error) {
    console.error("Error fetching indexing status:", error);
    return NextResponse.json(
      { error: "Failed to fetch indexing status" },
      { status: 500 }
    );
  }
}
