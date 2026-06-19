import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080";
    
    socketInstance = io(socketUrl, {
      autoConnect: false,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected successfully, ID:", socketInstance?.id);
    });

    socketInstance.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });
  }
  const socketName = typeof window !== "undefined" ? localStorage.getItem("fyp_username") || "Anonymous" : "Anonymous";
  socketInstance.io.opts.query = { name: socketName };
  return socketInstance;
};
