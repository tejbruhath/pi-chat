import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export const useSocket = (userId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Clean up existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Initialize socket connection with better configuration
    socketRef.current = io({
      path: "/socket.io",
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to WebSocket");
      setIsConnected(true);

      // Authenticate the user
      if (userId) {
        socketRef.current?.emit("authenticate", userId);
      }
    });

    socketRef.current.on("disconnect", (reason) => {
      console.log("Disconnected from WebSocket:", reason);
      setIsConnected(false);

      // Only attempt reconnection if it wasn't intentional
      if (reason !== "io client disconnect") {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (socketRef.current && !socketRef.current.connected) {
            console.log("Attempting to reconnect...");
            socketRef.current.connect();
          }
        }, 2000);
      }
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      setIsConnected(false);
    });

    socketRef.current.on("reconnect", (attemptNumber) => {
      console.log("Reconnected after", attemptNumber, "attempts");
      setIsConnected(true);
    });

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userId]);

  const joinConversation = (conversationId: string) => {
    socketRef.current?.emit("join_conversation", conversationId);
  };

  const leaveConversation = (conversationId: string) => {
    socketRef.current?.emit("leave_conversation", conversationId);
  };

  const sendMessage = (conversationId: string, message: any) => {
    socketRef.current?.emit("send_message", { conversationId, message });
  };

  const onNewMessage = (callback: (message: any) => void) => {
    socketRef.current?.on("new_message", callback);
  };

  const offNewMessage = (callback: (message: any) => void) => {
    socketRef.current?.off("new_message", callback);
  };

  const sendTyping = (conversationId: string, userName: string) => {
    socketRef.current?.emit("typing", { conversationId, userName });
  };

  const stopTyping = (conversationId: string) => {
    socketRef.current?.emit("stop_typing", { conversationId });
  };

  const onUserTyping = (
    callback: (data: { userName: string; conversationId: string }) => void
  ) => {
    socketRef.current?.on("user_typing", callback);
  };

  const onUserStopTyping = (
    callback: (data: { conversationId: string }) => void
  ) => {
    socketRef.current?.on("user_stop_typing", callback);
  };

  return {
    socket: socketRef.current,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    onNewMessage,
    offNewMessage,
    sendTyping,
    stopTyping,
    onUserTyping,
    onUserStopTyping,
  };
};
