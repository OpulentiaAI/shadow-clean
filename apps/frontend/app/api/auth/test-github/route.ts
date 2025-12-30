import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Test the GitHub OAuth token exchange manually
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  
  if (!code) {
    return NextResponse.json({
      error: "No code provided",
      usage: "Call this endpoint with ?code=<github_oauth_code> from callback",
    });
  }

  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();

  // Step 1: Exchange code for token
  let tokenResponse: Response;
  let tokenData: Record<string, unknown>;
  try {
    tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    tokenData = await tokenResponse.json();
  } catch (error) {
    return NextResponse.json({
      step: "token_exchange",
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  if (tokenData.error) {
    return NextResponse.json({
      step: "token_exchange",
      error: tokenData.error,
      error_description: tokenData.error_description,
    });
  }

  const accessToken = tokenData.access_token as string;
  if (!accessToken) {
    return NextResponse.json({
      step: "token_exchange",
      error: "No access token in response",
      tokenData,
    });
  }

  // Step 2: Fetch user info
  let userResponse: Response;
  let userData: Record<string, unknown>;
  try {
    userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "User-Agent": "OpulentCode",
      },
    });
    userData = await userResponse.json();
  } catch (error) {
    return NextResponse.json({
      step: "user_info",
      error: error instanceof Error ? error.message : "unknown",
      tokenReceived: true,
    });
  }

  if (!userResponse.ok) {
    return NextResponse.json({
      step: "user_info",
      error: `HTTP ${userResponse.status}`,
      userData,
      tokenReceived: true,
    });
  }

  // Step 3: Fetch user emails
  let emailsResponse: Response;
  let emailsData: unknown[];
  try {
    emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "User-Agent": "OpulentCode",
      },
    });
    emailsData = await emailsResponse.json();
  } catch (error) {
    emailsData = [{ error: error instanceof Error ? error.message : "unknown" }];
  }

  return NextResponse.json({
    success: true,
    user: {
      id: userData.id,
      login: userData.login,
      name: userData.name,
      email: userData.email,
    },
    emails: emailsData,
    tokenType: tokenData.token_type,
    scope: tokenData.scope,
  });
}
