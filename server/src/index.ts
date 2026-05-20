import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { auth } from "./auth.js";
import { initSocket } from "./socket.js";
import { usersRoutes } from "./routes/users.js";
import { postsRoutes } from "./routes/posts.js";
import { tradesRoutes } from "./routes/trades.js";
import { chatsRoutes } from "./routes/chats.js";
import { uploadsRoutes } from "./routes/uploads.js";

async function runMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[boot] DATABASE_URL not set; skipping migrations");
    return;
  }
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    console.log("[boot] running migrations");
    await migrate(drizzle(sql), { migrationsFolder: "./migrations" });
    console.log("[boot] migrations done");
  } finally {
    await sql.end({ timeout: 1 });
  }
}

const trustedOrigins =
  (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

await runMigrations();

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? "info" },
  bodyLimit: 10 * 1024 * 1024,
});

await app.register(cookie);
await app.register(cors, {
  origin: trustedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
});

app.get("/health", async () => ({ ok: true, time: new Date().toISOString() }));

// Mount Better Auth — wildcard route forwards to auth.handler
app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(req, reply) {
    try {
      const proto = (req.headers["x-forwarded-proto"] as string) || "http";
      const host = req.headers.host || "localhost";
      const url = new URL(req.url, `${proto}://${host}`);

      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v == null) continue;
        if (Array.isArray(v)) v.forEach((vv) => headers.append(k, vv));
        else headers.set(k, String(v));
      }

      const init: RequestInit = { method: req.method, headers };
      if (req.method !== "GET" && req.method !== "HEAD" && req.body != null) {
        init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        if (!headers.has("content-type")) headers.set("content-type", "application/json");
      }

      const webReq = new Request(url.toString(), init);
      const res = await auth.handler(webReq);
      reply.status(res.status);
      res.headers.forEach((value, key) => {
        // Avoid clobbering set-cookie (which Fastify wants as separate calls)
        if (key.toLowerCase() === "set-cookie") {
          reply.header("set-cookie", value);
        } else {
          reply.header(key, value);
        }
      });
      const text = await res.text();
      reply.send(text || null);
    } catch (err) {
      req.log.error({ err }, "auth handler failed");
      reply.code(500).send({ error: "auth error" });
    }
  },
});

await app.register(usersRoutes);
await app.register(postsRoutes);
await app.register(tradesRoutes);
await app.register(chatsRoutes);
await app.register(uploadsRoutes);

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? "0.0.0.0";

console.log(`[boot] listening on ${host}:${port}`);
await app.listen({ port, host });
initSocket(app.server);
app.log.info({ port, host, trustedOrigins }, "mangrov server up");
console.log(`[boot] ready, trusted origins:`, trustedOrigins);
