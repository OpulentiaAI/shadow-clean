import { auth } from "@/lib/auth/auth";
import { upsertUser, syncGitHubAccount } from "@/lib/convex/actions";
import { db } from "@repo/db";
import { headers } from "next/headers";

// Dev user for local development without auth
const DEV_USER_ID = "dev-local-user";
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

type UserLike = {
  id: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  image?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const DEV_USER: UserLike = {
  id: DEV_USER_ID,
  name: "Local Dev User",
  email: "dev@localhost",
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export type AuthUser = Awaited<ReturnType<typeof getUser>>;

const syncedConvexUsers = new Set<string>();

async function ensureConvexUser(user: UserLike) {
  // Avoid re-sending upserts for the same user within the same runtime
  if (syncedConvexUsers.has(user.id)) return;
  try {
    // First upsert the user
    const convexUserId = await upsertUser({
      externalId: user.id,
      name: user.name || user.email || "Unknown User",
      email: user.email || `${user.id}@example.invalid`,
      image: user.image ?? undefined,
      emailVerified: Boolean(user.emailVerified),
    });

    // Then sync their GitHub account from Prisma to Convex
    // This ensures OAuth tokens are available in Convex for the backend
    const prismaAccount = await db.account.findFirst({
      where: {
        userId: user.id,
        providerId: "github",
      },
    });

    if (prismaAccount && prismaAccount.accessToken) {
      await syncGitHubAccount({
        userId: convexUserId,
        accountId: prismaAccount.accountId,
        providerId: prismaAccount.providerId,
        accessToken: prismaAccount.accessToken,
        refreshToken: prismaAccount.refreshToken ?? undefined,
        accessTokenExpiresAt: prismaAccount.accessTokenExpiresAt?.getTime(),
        refreshTokenExpiresAt: prismaAccount.refreshTokenExpiresAt?.getTime(),
        scope: prismaAccount.scope ?? undefined,
        githubInstallationId: prismaAccount.githubInstallationId ?? undefined,
        githubAppConnected: prismaAccount.githubAppConnected,
      });
      console.log(
        `[getUser] Synced GitHub account to Convex for user ${user.id}`
      );
    }

    syncedConvexUsers.add(user.id);
  } catch (error) {
    console.warn("[getUser] Failed to sync Convex user/account", error);
    // Allow request to continue; Convex may be temporarily unavailable
  }
}

export async function getUser() {
  // Return dev user when bypass auth is enabled
  if (BYPASS_AUTH) {
    await ensureConvexUser(DEV_USER);
    return DEV_USER;
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  await ensureConvexUser(session.user);

  return session.user;
}
