import { auth } from "@/lib/auth/auth";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
// Force dynamic rendering to prevent build-time execution
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return auth.handler(req);
}

export async function POST(req: NextRequest) {
  return auth.handler(req);
}
