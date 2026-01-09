import { handler } from "@/lib/auth/auth-server";

export const runtime = "nodejs";
// Force dynamic rendering to prevent build-time execution
export const dynamic = "force-dynamic";

// Proxy auth requests to Convex
export const { GET, POST } = handler;
