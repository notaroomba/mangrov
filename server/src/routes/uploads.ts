import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../auth-middleware.js";
import { buildKey, presignPut, publicUrlFor, type UploadKind } from "../storage.js";

const presignSchema = z.object({
  kind: z.enum(["post", "trade", "message", "avatar"]),
  contentType: z
    .string()
    .regex(/^[\w.-]+\/[\w.+-]+$/)
    .max(120),
});

export async function uploadsRoutes(app: FastifyInstance) {
  app.post("/api/uploads/presign", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = presignSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid payload", issues: parsed.error.issues });
    }
    const key = buildKey(parsed.data.kind as UploadKind, req.userId!, parsed.data.contentType);
    const url = await presignPut({ key, contentType: parsed.data.contentType });
    return { url, key, publicUrl: publicUrlFor(key) };
  });
}
