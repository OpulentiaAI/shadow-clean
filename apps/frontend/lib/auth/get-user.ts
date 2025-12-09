import { auth } from "@/lib/auth/auth";
import { upsertUser } from "@/lib/convex/actions";
import { headers } from "next/headers";

// Dev user for local development without auth
const DEV_USER_ID = "dev-local-user";
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

const DEV_USER = {
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

async function ensureConvexUser(user: typeof DEV_USER) {
  // Avoid re-sending upserts for the same user within the same runtime
  if (syncedConvexUsers.has(user.id)) return;
  try {
    await upsertUser({
      externalId: user.id,
      name: user.name || user.email || "Unknown User",
      email: user.email || `${user.id}@example.invalid`,
      image: user.image ?? undefined,
      emailVerified: Boolean(user.emailVerified),
    });
    syncedConvexUsers.add(user.id);
  } catch (error) {
    console.warn("[getUser] Failed to sync Convex user", error);
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
