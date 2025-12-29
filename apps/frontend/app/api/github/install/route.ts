import { getUser } from "@/lib/auth/get-user";
import { getGitHubAccount } from "@/lib/db-operations/get-github-account";
import { prisma } from "@repo/db";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    const { searchParams } = new URL(request.url);
    const installationId = searchParams.get("installation_id");
    const setupAction = searchParams.get("setup_action");

    if (!user) {
      // Not authenticated - set cookie with install params and redirect to auth
      const response = NextResponse.redirect(new URL("/auth", request.url));
      if (installationId) {
        response.cookies.set("github_install_id", installationId, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 300, // 5 minutes
        });
        if (setupAction) {
          response.cookies.set("github_install_action", setupAction, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: 300,
          });
        }
      }
      return response;
    }

    // Check for stored install params from cookie if not in URL
    const cookieStore = await cookies();
    const storedInstallId = installationId || cookieStore.get("github_install_id")?.value;
    const storedAction = setupAction || cookieStore.get("github_install_action")?.value;

    if (!storedInstallId) {
      return NextResponse.json(
        { error: "Installation ID is required" },
        { status: 400 }
      );
    }

    const account = await getGitHubAccount(user.id);

    if (!account) {
      // No GitHub account linked - set cookie and redirect to auth
      const response = NextResponse.redirect(new URL("/auth", request.url));
      response.cookies.set("github_install_id", storedInstallId, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 300,
      });
      if (storedAction) {
        response.cookies.set("github_install_action", storedAction, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 300,
        });
      }
      return response;
    }

    await prisma.account.update({
      where: {
        id: account.id,
      },
      data: {
        githubInstallationId: storedInstallId,
        githubAppConnected:
          storedAction === "install" || storedAction === "update",
      },
    });

    // Redirect to the frontend with success message
    return NextResponse.redirect(
      new URL("/?github_app_installed=true", request.url)
    );
  } catch (error) {
    console.error("Error handling GitHub App installation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
