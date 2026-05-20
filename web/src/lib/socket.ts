import { io, type Socket } from "socket.io-client";

const baseURL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "http://localhost:8080";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(baseURL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
