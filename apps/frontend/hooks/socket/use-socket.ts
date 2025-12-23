"use client";

import { socket } from "@/lib/socket";
import { useEffect, useState } from "react";

// Check if Convex-native streaming is enabled (skip Socket.IO in that case)
const USE_CONVEX_NATIVE =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_CONVEX_REALTIME === "true";

interface ConnectionInfo {
  connectionId: string;
  reconnectCount: number;
  timestamp: number;
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);

  useEffect(() => {
    // Skip Socket.IO when Convex-native streaming is enabled
    if (USE_CONVEX_NATIVE) {
      console.log('[SOCKET] Skipping Socket.IO - using Convex-native streaming');
      return;
    }

    const handleConnect = () => {
      setIsConnected(true);
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
    };
    
    const handleConnectionInfo = (info: ConnectionInfo) => {
      setConnectionInfo(info);
    };

    const handleError = (error: Error) => {
      console.error('[SOCKET] Connection error:', error);
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connection-info', handleConnectionInfo);
    socket.on('connect_error', handleError);

    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connection-info', handleConnectionInfo);
      socket.off('connect_error', handleError);
    };
  }, []);

  return { 
    socket: USE_CONVEX_NATIVE ? null : socket, 
    isConnected: USE_CONVEX_NATIVE ? false : isConnected, 
    connectionInfo,
    isConvexNative: USE_CONVEX_NATIVE,
  };
}