import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const address = process.env.NEXT_PUBLIC_CONVEX_URL;

let clientInstance: ConvexHttpClient | null = null;

export function getConvexClient() {
  if (!address) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL for Convex client.");
  }
  if (!clientInstance) {
    clientInstance = new ConvexHttpClient(address);
  }
  return clientInstance;
}

export { api };
