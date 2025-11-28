"use client";

import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@repo/types";

const RECONNECTION_DELAY = 1000;
const RECONNECTION_DELAY_MAX = 5000;
const RECONNECTION_ATTEMPTS = 5;
const TIMEOUT = 20000;

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Use NEXT_PUBLIC_SERVER_URL if set, otherwise derive from window location in production
const getSocketUrl = (): string => {
  if (process.env.NEXT_PUBLIC_SERVER_URL) {
    return process.env.NEXT_PUBLIC_SERVER_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    // In production, assume backend is at a different subdomain or use the same origin
    // Check for NEXT_PUBLIC_BACKEND_URL pattern or default to same origin with /api proxy
    return process.env.NEXT_PUBLIC_BACKEND_URL || window.location.origin;
  }
  return "http://localhost:4001";
};

const socketUrl = getSocketUrl();

export const socket: TypedSocket = io(socketUrl, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: RECONNECTION_ATTEMPTS,
  reconnectionDelay: RECONNECTION_DELAY,
  reconnectionDelayMax: RECONNECTION_DELAY_MAX,
  timeout: TIMEOUT,
  forceNew: false,
  withCredentials: true,
});
