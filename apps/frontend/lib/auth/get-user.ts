import { auth } from "@/lib/auth/auth";
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

export async function getUser() {
  // Return dev user when bypass auth is enabled
  if (BYPASS_AUTH) {
    return DEV_USER;
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  return session.user;
}
