import { NextRequest, NextResponse } from "next/server";

// GitHub App installation callback - using Convex-native auth
export async function GET(request: NextRequest) {
  // Redirect to frontend - GitHub App installation is handled via Convex
  const { searchParams } = new URL(request.url);
  const setupAction = searchParams.get("setup_action");
  
  if (setupAction === "install" || setupAction === "update") {
    return NextResponse.redirect(
      new URL("/?github_app_installed=true", request.url)
    );
  }
  
  return NextResponse.redirect(new URL("/", request.url));
}
