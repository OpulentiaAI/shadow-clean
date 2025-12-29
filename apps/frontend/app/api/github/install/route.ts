import { getUser } from "@/lib/auth/get-user";
import { getGitHubAccount } from "@/lib/db-operations/get-github-account";
import { prisma } from "@repo/db";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

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
          httpOnly: false, // Needs to be readable by client JS
          secure: true,
          sameSite: "lax",
          maxAge: 300, // 5 minutes
        });
        if (setupAction) {
          response.cookies.set("github_install_action", setupAction, {
            httpOnly: false,
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
        httpOnly: false,
        secure: true,
        sameSite: "lax",
        maxAge: 300,
      });
      if (storedAction) {
        response.cookies.set("github_install_action", storedAction, {
          httpOnly: false,
          secure: true,
          sameSite: "lax",
          maxAge: 300,
        });
      }
      return response;
    }

    const githubAppConnected = storedAction === "install" || storedAction === "update";

    await prisma.account.update({
      where: {
        id: account.id,
      },
      data: {
        githubInstallationId: storedInstallId,
        githubAppConnected,
      },
    });

    // Also sync installation info to Convex
    if (convex) {
      try {
        // Use the user's externalId (Better Auth user.id) to find Convex user
        const convexUser = await convex.query(api.auth.getUserByExternalId, {
          externalId: user.id,
        });
        if (convexUser) {
          await convex.mutation(api.auth.updateGitHubInstallation, {
            userId: convexUser._id,
            githubInstallationId: storedInstallId,
            githubAppConnected,
          });
          console.log("[Install] Synced GitHub installation to Convex for user:", convexUser._id);
        } else {
          console.log("[Install] Convex user not found for externalId:", user.id);
        }
      } catch (err) {
        console.error("[Install] Failed syncing to Convex:", err);
      }
    }

    // Clear the install cookies
    const response = NextResponse.redirect(
      new URL("/?github_app_installed=true", request.url)
    );
    response.cookies.delete("github_install_id");
    response.cookies.delete("github_install_action");
    return response;
  } catch (error) {
    console.error("Error handling GitHub App installation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
