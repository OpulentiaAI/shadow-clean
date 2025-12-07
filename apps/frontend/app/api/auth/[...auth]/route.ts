import { auth } from "@/lib/auth/auth";
import { NextRequest } from "next/server";

// Force dynamic rendering to prevent build-time execution
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return auth.handler(req);
}

export async function POST(req: NextRequest) {
  return auth.handler(req);
}
