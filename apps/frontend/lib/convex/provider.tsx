"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    if (!convexUrl) {
      console.warn("NEXT_PUBLIC_CONVEX_URL not set, Convex features disabled");
      return null;
    }
    return new ConvexReactClient(convexUrl);
  }, []);

  if (!client) {
    return <>{children}</>;
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
