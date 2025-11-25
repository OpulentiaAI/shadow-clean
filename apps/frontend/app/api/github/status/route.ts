import { getUser } from "@/lib/auth/get-user";
import { getGitHubStatus } from "@/lib/github/github-api";
import { NextRequest, NextResponse } from "next/server";

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

export async function GET(_request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In bypass mode, return a status indicating GitHub is not connected
    // This allows users to focus on local repos without GitHub setup
    if (BYPASS_AUTH) {
      return NextResponse.json({
        isConnected: false,
        isAppInstalled: false,
        message: "GitHub integration disabled in local dev mode. Use Local Repo instead.",
      });
    }

    const status = await getGitHubStatus(user.id);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error checking GitHub status:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
