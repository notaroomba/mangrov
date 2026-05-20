import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { user } from "../db/schema.js";
import { requireAuth, attachSession } from "../auth-middleware.js";

const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_.]+$/);

const updateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  username: usernameSchema.optional(),
  country: z.string().max(80).optional().nullable(),
  language: z.string().max(20).optional().nullable(),
  interests: z.array(z.string().max(80)).max(50).optional(),
  avatar: z.string().url().optional().nullable(),
});

function publicUser(u: typeof user.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    avatar: u.avatar,
    country: u.country,
    language: u.language,
    interests: u.interests ?? [],
    createdAt: u.createdAt,
  };
}

export async function usersRoutes(app: FastifyInstance) {
  app.get("/api/users/me", { preHandler: requireAuth }, async (req, reply) => {
    const rows = await db.select().from(user).where(eq(user.id, req.userId!)).limit(1);
    const me = rows[0];
    if (!me) return reply.code(404).send({ error: "not found" });
    return { ...publicUser(me), email: me.email };
  });

  app.patch("/api/users/me", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid payload", issues: parsed.error.issues });
    }
    const updates: Partial<typeof user.$inferInsert> = {};
    for (const [k, v] of Object.entries(parsed.data)) {
      // @ts-expect-error dynamic assign
      updates[k] = v;
    }
    updates.updatedAt = new Date();
    const [updated] = await db
      .update(user)
      .set(updates)
      .where(eq(user.id, req.userId!))
      .returning();
    if (!updated) return reply.code(404).send({ error: "not found" });
    return { ...publicUser(updated), email: updated.email };
  });

  app.get("/api/users/check-username", async (req, reply) => {
    const u = (req.query as Record<string, string>).u;
    if (!u) return reply.code(400).send({ error: "missing username" });
    const validation = usernameSchema.safeParse(u);
    if (!validation.success) {
      return reply.code(400).send({ error: "invalid username", available: false });
    }
    const rows = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, u))
      .limit(1);
    return { available: rows.length === 0 };
  });

  app.get("/api/users/:id", { preHandler: attachSession }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const rows = await db.select().from(user).where(eq(user.id, id)).limit(1);
    const found = rows[0];
    if (!found) return reply.code(404).send({ error: "not found" });
    return publicUser(found);
  });
}
