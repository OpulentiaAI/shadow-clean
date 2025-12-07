import { ConvexHttpClient } from "convex/browser";

const address = process.env.NEXT_PUBLIC_CONVEX_URL;

export function getConvexClient() {
  if (!address) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL for Convex client.");
  }
  return new ConvexHttpClient(address);
}

