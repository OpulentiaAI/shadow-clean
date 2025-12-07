import { getUser } from "@/lib/auth/get-user";
import { getGitHubStatus } from "@/lib/github/github-api";
import { getGitHubAppInstallationUrl } from "@/lib/github/github-app";
import { NextRequest, NextResponse } from "next/server";

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

export async function GET(_request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In bypass mode, surface the installation URL so users can still connect if desired.
    if (BYPASS_AUTH) {
      let installationUrl: string | undefined;
      try {
        installationUrl = getGitHubAppInstallationUrl();
      } catch (error) {
        // GitHub App not configured, installation URL will be undefined
        console.warn("GitHub App not configured in bypass mode:", error);
      }

      return NextResponse.json({
        isConnected: false,
        isAppInstalled: false,
        installationUrl,
        message:
          "GitHub integration disabled in local dev mode. Use Local Repo instead or install the GitHub App.",
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
