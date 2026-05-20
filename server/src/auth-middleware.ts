import type { FastifyReply, FastifyRequest } from "fastify";
import { auth, type AuthSession } from "./auth.js";

declare module "fastify" {
  interface FastifyRequest {
    session?: AuthSession;
    userId?: string;
  }
}

function toWebHeaders(req: FastifyRequest): Headers {
  const h = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) h.append(key, v);
    } else {
      h.set(key, value as string);
    }
  }
  return h;
}

export async function attachSession(req: FastifyRequest, _reply: FastifyReply) {
  const session = await auth.api.getSession({ headers: toWebHeaders(req) });
  if (session) {
    req.session = session;
    req.userId = session.user.id;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  await attachSession(req, reply);
  if (!req.userId) {
    return reply.code(401).send({ error: "unauthenticated" });
  }
}
