import { getUser } from "@/lib/auth/get-user";
import { getGitHubStatus } from "@/lib/github/github-api";
import { getGitHubAppInstallationUrl } from "@/lib/github/github-app";
import { NextRequest, NextResponse } from "next/server";

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

// Check if GitHub App is configured by presence of required env vars
function isGitHubAppConfigured(): boolean {
  return !!(
    process.env.GITHUB_APP_ID &&
    process.env.GITHUB_APP_SLUG &&
    process.env.GITHUB_PRIVATE_KEY
  );
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In bypass mode, compute status from env presence
    if (BYPASS_AUTH) {
      const appConfigured = isGitHubAppConfigured();
      let installationUrl: string | undefined;

      try {
        installationUrl = getGitHubAppInstallationUrl();
      } catch (error) {
        // GitHub App not configured, installation URL will be undefined
        console.warn("GitHub App not configured in bypass mode:", error);
      }

      return NextResponse.json({
        // In bypass mode with app configured, consider it connected for dev purposes
        isConnected: appConfigured,
        // Compute from env presence instead of hardcoding false
        isAppInstalled: appConfigured,
        installationUrl,
        message: appConfigured
          ? "GitHub App configured via environment variables."
          : "GitHub App not configured. Set GITHUB_APP_ID, GITHUB_APP_SLUG, and GITHUB_PRIVATE_KEY.",
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
