"use client";

import { useSession } from "@/lib/auth/auth-client";
import { createContext, ReactNode, useContext } from "react";

// Dev user for local development without auth
const DEV_USER_ID = "dev-local-user";
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

const DEV_SESSION = {
  user: {
    id: DEV_USER_ID,
    name: "Local Dev User",
    email: "dev@localhost",
    image: null,
  },
};

type Session = {
  user: {
    id: string;
    name?: string;
    email: string;
    image?: string | null;
  };
} | null;

type SessionContextType = {
  session: Session;
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextType>({
  session: null,
  isLoading: true,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  // Handle case where useSession might not be available during SSR
  const sessionData = typeof useSession === 'function' ? useSession() : { data: null, isPending: true };
  const { data: session, isPending: isLoading } = sessionData;

  // Use dev session when bypass auth is enabled
  const effectiveSession = BYPASS_AUTH ? DEV_SESSION : session;
  const effectiveLoading = BYPASS_AUTH ? false : isLoading;

  return (
    <SessionContext.Provider value={{ session: effectiveSession, isLoading: effectiveLoading }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useAuthSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used within SessionProvider");
  }
  return context;
};
