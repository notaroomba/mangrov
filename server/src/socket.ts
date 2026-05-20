import { Server as IOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { auth } from "./auth.js";

let io: IOServer | null = null;

const trustedOrigins =
  (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function getIO(): IOServer {
  if (!io) throw new Error("socket.io not initialized");
  return io;
}

export function initSocket(httpServer: HttpServer) {
  io = new IOServer(httpServer, {
    cors: { origin: trustedOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const cookie = socket.handshake.headers.cookie;
      const headers = new Headers();
      if (cookie) headers.set("cookie", cookie);
      const session = await auth.api.getSession({ headers });
      if (!session) return next(new Error("unauthenticated"));
      (socket.data as { userId: string }).userId = session.user.id;
      next();
    } catch (err) {
      next(err as Error);
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket.data as { userId: string }).userId;
    socket.join(`user:${userId}`);

    socket.on("chat:join", (chatId: string) => {
      if (typeof chatId === "string" && chatId.length > 0) {
        socket.join(`chat:${chatId}`);
      }
    });

    socket.on("chat:leave", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });
  });

  return io;
}

export function emitToChat(chatId: string, event: string, payload: unknown) {
  io?.to(`chat:${chatId}`).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}
