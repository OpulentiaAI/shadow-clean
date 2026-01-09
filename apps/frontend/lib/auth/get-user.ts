import { fetchAuthQuery, fetchAuthMutation } from "@/lib/auth/auth-server";
import { api } from "../../../../convex/_generated/api";

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

export async function getUser() {
  // Return dev user when bypass auth is enabled
  if (BYPASS_AUTH) {
    return DEV_USER;
  }

  try {
    // Get the authenticated user from Convex Better Auth component
    // fetchAuthQuery automatically passes the auth token to Convex
    const authUser = await fetchAuthQuery(api.auth.getCurrentUser, {});

    if (!authUser) {
      console.log("[getUser] No authenticated user found");
      return null;
    }

    // Better Auth uses "user" table (singular), but our app uses "users" table (plural)
    // We need to upsert to our users table and return that ID for compatibility
    const usersTableId = await fetchAuthMutation(api.auth.upsertUser, {
      externalId: authUser._id, // Store Better Auth user ID as external reference
      name: authUser.name ?? "Unknown User",
      email: authUser.email,
      image: authUser.image ?? undefined,
      emailVerified: authUser.emailVerified ?? false,
    });

    // Return user with our users table ID
    const user: UserLike = {
      id: usersTableId,
      name: authUser.name ?? null,
      email: authUser.email ?? null,
      emailVerified: authUser.emailVerified ?? false,
      image: authUser.image ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return user;
  } catch (error) {
    console.error("[getUser] Error fetching auth user:", error);
    return null;
  }
}
