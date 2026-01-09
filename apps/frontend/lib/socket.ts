"use client";

import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@repo/types";

// Reduced reconnection attempts for serverless backend (Socket.IO won't work)
const RECONNECTION_DELAY = 2000;
const RECONNECTION_DELAY_MAX = 30000;
const RECONNECTION_ATTEMPTS = 2;  // Minimal - serverless backend won't support Socket.IO
const TIMEOUT = 5000;

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Check if we should skip Socket.IO entirely (Convex-native mode)
const isConvexNativeMode = (): boolean => {
  // In production with Convex realtime, skip Socket.IO entirely
  if (process.env.NEXT_PUBLIC_USE_CONVEX_REALTIME === "true") {
    return true;
  }
  // Also skip if no server URL is configured (pure Convex mode)
  if (!process.env.NEXT_PUBLIC_SERVER_URL && typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return true;
  }
  return false;
};

// Use NEXT_PUBLIC_SERVER_URL if set, otherwise use a dummy URL that won't connect
const getSocketUrl = (): string => {
  // In Convex-native mode, don't try to connect anywhere
  if (isConvexNativeMode()) {
    return ""; // Empty URL prevents connection attempts
  }
  if (process.env.NEXT_PUBLIC_SERVER_URL) {
    return process.env.NEXT_PUBLIC_SERVER_URL;
  }
  return "http://localhost:4001";
};

const socketUrl = getSocketUrl();

// Create a no-op socket proxy for Convex-native mode
const createNoOpSocket = (): TypedSocket => {
  // Return a minimal socket-like object that does nothing
  const noOpHandler = () => {};
  const noOpSocket = {
    connected: false,
    disconnected: true,
    id: undefined,
    connect: noOpHandler,
    disconnect: noOpHandler,
    emit: noOpHandler,
    on: () => noOpSocket,
    off: () => noOpSocket,
    once: () => noOpSocket,
    removeAllListeners: () => noOpSocket,
    io: { opts: {} },
  } as unknown as TypedSocket;
  return noOpSocket;
};

// Only create real socket if not in Convex-native mode
export const socket: TypedSocket = isConvexNativeMode() 
  ? createNoOpSocket()
  : io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      reconnectionDelayMax: RECONNECTION_DELAY_MAX,
      timeout: TIMEOUT,
      forceNew: false,
      withCredentials: false,
      transports: ["polling", "websocket"],
      upgrade: true,
      rememberUpgrade: false,
    });

// Log mode for debugging (only in browser, only once)
if (typeof window !== "undefined" && isConvexNativeMode()) {
  console.log("[SOCKET] Convex-native mode - Socket.IO disabled");
}
