import type { FastifyInstance } from "fastify";
import { and, desc, eq, lt, sql as dsql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { posts, postLikes, postComments, postSaves, user } from "../db/schema.js";
import { requireAuth, attachSession } from "../auth-middleware.js";

const createPostSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
  images: z.array(z.string().url()).max(10).default([]),
  keywords: z.array(z.string().max(40)).max(20).default([]),
  niche: z.array(z.string().max(80)).max(20).default([]),
  price: z.number().nonnegative().optional().nullable(),
  quantity: z.number().int().nonnegative().optional().nullable(),
  url: z.string().url().optional().nullable(),
  isAvailable: z.boolean().default(true),
});

const commentSchema = z.object({ text: z.string().min(1).max(2000) });

export async function postsRoutes(app: FastifyInstance) {
  app.post("/api/posts", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid payload", issues: parsed.error.issues });
    }
    const [row] = await db
      .insert(posts)
      .values({
        userId: req.userId!,
        title: parsed.data.title,
        description: parsed.data.description,
        images: parsed.data.images,
        keywords: parsed.data.keywords,
        niche: parsed.data.niche,
        price: parsed.data.price != null ? parsed.data.price.toString() : null,
        quantity: parsed.data.quantity ?? null,
        url: parsed.data.url ?? null,
        isAvailable: parsed.data.isAvailable,
      })
      .returning();
    return row;
  });

  app.get("/api/posts", { preHandler: attachSession }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const limit = Math.min(Number(q.limit ?? "20"), 50);
    const cursor = q.cursor; // ISO date

    const conds = [] as any[];
    if (cursor) conds.push(lt(posts.createdAt, new Date(cursor)));
    if (q.userId) conds.push(eq(posts.userId, q.userId));
    if (q.niche) {
      conds.push(dsql`${posts.niche} && ARRAY[${q.niche}]::text[]`);
    }
    if (q.keyword) {
      conds.push(dsql`${posts.keywords} && ARRAY[${q.keyword}]::text[]`);
    }

    const where = conds.length ? and(...conds) : undefined;

    const rows = await db
      .select({
        post: posts,
        author: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
        },
      })
      .from(posts)
      .leftJoin(user, eq(posts.userId, user.id))
      .where(where)
      .orderBy(desc(posts.createdAt))
      .limit(limit);

    return rows.map((r) => ({ ...r.post, author: r.author }));
  });

  app.get("/api/posts/:id", { preHandler: attachSession }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const rows = await db
      .select({
        post: posts,
        author: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
        },
      })
      .from(posts)
      .leftJoin(user, eq(posts.userId, user.id))
      .where(eq(posts.id, id))
      .limit(1);
    const found = rows[0];
    if (!found) return reply.code(404).send({ error: "not found" });
    return { ...found.post, author: found.author };
  });

  app.delete("/api/posts/:id", { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const result = await db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, req.userId!)))
      .returning({ id: posts.id });
    if (result.length === 0) return reply.code(404).send({ error: "not found" });
    return { ok: true };
  });

  app.post("/api/posts/:id/like", { preHandler: requireAuth }, async (req) => {
    const id = (req.params as { id: string }).id;
    await db
      .insert(postLikes)
      .values({ postId: id, userId: req.userId! })
      .onConflictDoNothing();
    return { ok: true };
  });

  app.delete("/api/posts/:id/like", { preHandler: requireAuth }, async (req) => {
    const id = (req.params as { id: string }).id;
    await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, id), eq(postLikes.userId, req.userId!)));
    return { ok: true };
  });

  app.get("/api/posts/:id/likes", async (req) => {
    const id = (req.params as { id: string }).id;
    const rows = await db
      .select({ count: dsql<number>`count(*)::int` })
      .from(postLikes)
      .where(eq(postLikes.postId, id));
    return { count: rows[0]?.count ?? 0 };
  });

  app.get("/api/posts/:id/comments", async (req) => {
    const id = (req.params as { id: string }).id;
    const rows = await db
      .select({
        comment: postComments,
        author: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
        },
      })
      .from(postComments)
      .leftJoin(user, eq(postComments.userId, user.id))
      .where(eq(postComments.postId, id))
      .orderBy(desc(postComments.createdAt));
    return rows.map((r) => ({ ...r.comment, author: r.author }));
  });

  app.post("/api/posts/:id/comments", { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid payload", issues: parsed.error.issues });
    }
    const [row] = await db
      .insert(postComments)
      .values({ postId: id, userId: req.userId!, text: parsed.data.text })
      .returning();
    return row;
  });

  app.post("/api/posts/:id/save", { preHandler: requireAuth }, async (req) => {
    const id = (req.params as { id: string }).id;
    await db
      .insert(postSaves)
      .values({ postId: id, userId: req.userId! })
      .onConflictDoNothing();
    return { ok: true };
  });

  app.delete("/api/posts/:id/save", { preHandler: requireAuth }, async (req) => {
    const id = (req.params as { id: string }).id;
    await db
      .delete(postSaves)
      .where(and(eq(postSaves.postId, id), eq(postSaves.userId, req.userId!)));
    return { ok: true };
  });

  app.get("/api/users/me/saves", { preHandler: requireAuth }, async (req) => {
    const rows = await db
      .select({ post: posts })
      .from(postSaves)
      .innerJoin(posts, eq(postSaves.postId, posts.id))
      .where(eq(postSaves.userId, req.userId!))
      .orderBy(desc(postSaves.createdAt));
    return rows.map((r) => r.post);
  });
}
