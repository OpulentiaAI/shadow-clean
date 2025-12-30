import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const githubClientId = process.env.GITHUB_CLIENT_ID?.trim();
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  const databaseUrl = process.env.DATABASE_URL;
  const betterAuthUrl = process.env.BETTER_AUTH_URL;

  // Test GitHub API with client credentials
  let githubApiTest = "not tested";
  try {
    const response = await fetch("https://api.github.com/", {
      headers: {
        "User-Agent": "OpulentCode-Debug",
      },
    });
    githubApiTest = response.ok ? "OK" : `Failed: ${response.status}`;
  } catch (error) {
    githubApiTest = `Error: ${error instanceof Error ? error.message : "unknown"}`;
  }

  // Test database connection
  let dbTest = "not tested";
  try {
    const { prisma } = await import("@repo/db");
    await prisma.$queryRaw`SELECT 1`;
    dbTest = "OK";
  } catch (error) {
    dbTest = `Error: ${error instanceof Error ? error.message : "unknown"}`;
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    config: {
      clientIdPresent: !!githubClientId,
      clientIdPrefix: githubClientId?.substring(0, 8) || "MISSING",
      clientSecretLength: githubClientSecret?.length ?? 0,
      clientSecretHasNewline: githubClientSecret?.includes("\n") ?? false,
      clientSecretHasBackslashN: githubClientSecret?.includes("\\n") ?? false,
      betterAuthUrl,
      databaseUrlPresent: !!databaseUrl,
    },
    tests: {
      githubApi: githubApiTest,
      database: dbTest,
    },
  });
}
