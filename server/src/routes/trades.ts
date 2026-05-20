import type { FastifyInstance } from "fastify";
import { and, desc, eq, lt, ne, sql as dsql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { trades, tradeSwipes, tradeMatches, user, chats } from "../db/schema.js";
import { requireAuth, attachSession } from "../auth-middleware.js";
import { emitToUser } from "../socket.js";

const createTradeSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
  images: z.array(z.string().url()).max(5).default([]),
  keywords: z.array(z.string().max(40)).max(20).default([]),
  niche: z.string().max(80).optional().nullable(),
  quantity: z.number().int().nonnegative().default(1),
  isAvailable: z.boolean().default(true),
});

const swipeSchema = z.object({ decision: z.enum(["like", "pass"]) });

function canonicalPair(a: string, b: string) {
  return a < b ? { userA: a, userB: b } : { userA: b, userB: a };
}

export async function tradesRoutes(app: FastifyInstance) {
  app.post("/api/trades", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createTradeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid payload", issues: parsed.error.issues });
    }
    const [row] = await db
      .insert(trades)
      .values({
        userId: req.userId!,
        title: parsed.data.title,
        description: parsed.data.description,
        images: parsed.data.images,
        keywords: parsed.data.keywords,
        niche: parsed.data.niche ?? null,
        quantity: parsed.data.quantity,
        isAvailable: parsed.data.isAvailable,
      })
      .returning();
    return row;
  });

  app.get("/api/trades", { preHandler: attachSession }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const limit = Math.min(Number(q.limit ?? "20"), 50);
    const cursor = q.cursor;

    const conds = [eq(trades.isAvailable, true)] as any[];
    if (cursor) conds.push(lt(trades.createdAt, new Date(cursor)));
    if (q.userId === "me" && req.userId) {
      conds.push(eq(trades.userId, req.userId));
    } else if (q.userId) {
      conds.push(eq(trades.userId, q.userId));
    }
    if (q.excludeOwn === "true" && req.userId) {
      conds.push(ne(trades.userId, req.userId));
    }
    if (q.niche) conds.push(eq(trades.niche, q.niche));
    if (q.excludeSwiped === "true" && req.userId) {
      conds.push(
        dsql`NOT EXISTS (SELECT 1 FROM ${tradeSwipes} WHERE ${tradeSwipes.userId} = ${req.userId} AND ${tradeSwipes.tradeId} = ${trades.id})`
      );
    }

    const rows = await db
      .select({
        trade: trades,
        owner: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
        },
      })
      .from(trades)
      .leftJoin(user, eq(trades.userId, user.id))
      .where(and(...conds))
      .orderBy(desc(trades.createdAt))
      .limit(limit);

    return rows.map((r) => ({ ...r.trade, owner: r.owner }));
  });

  app.get("/api/trades/:id", { preHandler: attachSession }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const rows = await db
      .select({
        trade: trades,
        owner: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
        },
      })
      .from(trades)
      .leftJoin(user, eq(trades.userId, user.id))
      .where(eq(trades.id, id))
      .limit(1);
    if (!rows[0]) return reply.code(404).send({ error: "not found" });
    return { ...rows[0].trade, owner: rows[0].owner };
  });

  app.delete("/api/trades/:id", { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const result = await db
      .delete(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, req.userId!)))
      .returning({ id: trades.id });
    if (result.length === 0) return reply.code(404).send({ error: "not found" });
    return { ok: true };
  });

  const patchTradeSchema = z.object({
    title: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional(),
    quantity: z.number().int().nonnegative().optional(),
    isAvailable: z.boolean().optional(),
    images: z.array(z.string().url()).max(5).optional(),
    keywords: z.array(z.string().max(40)).max(20).optional(),
    niche: z.string().max(80).optional().nullable(),
  });

  app.patch("/api/trades/:id", { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const parsed = patchTradeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid payload", issues: parsed.error.issues });
    }
    const [row] = await db
      .update(trades)
      .set(parsed.data)
      .where(and(eq(trades.id, id), eq(trades.userId, req.userId!)))
      .returning();
    if (!row) return reply.code(404).send({ error: "not found" });
    return row;
  });

  app.post("/api/trades/:id/swipe", { preHandler: requireAuth }, async (req, reply) => {
    const tradeId = (req.params as { id: string }).id;
    const parsed = swipeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid payload", issues: parsed.error.issues });
    }

    // Find owner of the trade
    const [t] = await db.select().from(trades).where(eq(trades.id, tradeId)).limit(1);
    if (!t) return reply.code(404).send({ error: "trade not found" });
    if (t.userId === req.userId) {
      return reply.code(400).send({ error: "cannot swipe own trade" });
    }

    await db
      .insert(tradeSwipes)
      .values({ userId: req.userId!, tradeId, decision: parsed.data.decision })
      .onConflictDoUpdate({
        target: [tradeSwipes.userId, tradeSwipes.tradeId],
        set: { decision: parsed.data.decision, createdAt: new Date() },
      });

    if (parsed.data.decision !== "like") return { matched: false };

    // Upsert a tradeMatch where the canonical pair is (fromUser, toUser) = (currentUser, ownerOfTrade)
    const fromUser = req.userId!;
    const toUser = t.userId;

    // Look for existing match in either direction
    const existing = await db
      .select()
      .from(tradeMatches)
      .where(
        dsql`(${tradeMatches.fromUser} = ${fromUser} AND ${tradeMatches.toUser} = ${toUser}) OR (${tradeMatches.fromUser} = ${toUser} AND ${tradeMatches.toUser} = ${fromUser})`
      )
      .limit(1);

    let match;
    if (existing[0]) {
      const e = existing[0];
      const isOriginalFrom = e.fromUser === fromUser;
      const [updated] = await db
        .update(tradeMatches)
        .set(
          isOriginalFrom
            ? { fromLiked: true, fromItem: tradeId }
            : { toLiked: true, toItem: tradeId }
        )
        .where(eq(tradeMatches.id, e.id))
        .returning();
      match = updated;
    } else {
      const [created] = await db
        .insert(tradeMatches)
        .values({
          fromUser,
          toUser,
          fromItem: tradeId,
          fromLiked: true,
        })
        .returning();
      match = created;
    }

    const matched = match!.fromLiked && match!.toLiked;
    if (matched) {
      // Ensure a chat exists for the pair
      const pair = canonicalPair(fromUser, toUser);
      await db
        .insert(chats)
        .values({ userA: pair.userA, userB: pair.userB, isTradeMatch: true })
        .onConflictDoNothing();
      emitToUser(fromUser, "match:new", match);
      emitToUser(toUser, "match:new", match);
    }
    return { matched, match };
  });

  app.get("/api/matches", { preHandler: requireAuth }, async (req) => {
    const uid = req.userId!;
    const rows = await db
      .select()
      .from(tradeMatches)
      .where(
        dsql`(${tradeMatches.fromUser} = ${uid} OR ${tradeMatches.toUser} = ${uid}) AND ${tradeMatches.fromLiked} = true AND ${tradeMatches.toLiked} = true`
      )
      .orderBy(desc(tradeMatches.createdAt));

    if (rows.length === 0) return [];

    const userIds = new Set<string>();
    const tradeIds = new Set<string>();
    for (const m of rows) {
      userIds.add(m.fromUser);
      userIds.add(m.toUser);
      if (m.fromItem) tradeIds.add(m.fromItem);
      if (m.toItem) tradeIds.add(m.toItem);
    }

    const { user, trades } = await import("../db/schema.js");
    const { inArray } = await import("drizzle-orm");

    const [userRows, tradeRows] = await Promise.all([
      userIds.size > 0
        ? db
            .select({ id: user.id, name: user.name, username: user.username, avatar: user.avatar })
            .from(user)
            .where(inArray(user.id, Array.from(userIds)))
        : Promise.resolve([] as Array<{ id: string; name: string; username: string | null; avatar: string | null }>),
      tradeIds.size > 0
        ? db
            .select({ id: trades.id, title: trades.title, images: trades.images })
            .from(trades)
            .where(inArray(trades.id, Array.from(tradeIds)))
        : Promise.resolve([] as Array<{ id: string; title: string; images: string[] }>),
    ]);

    const userMap = new Map(userRows.map((u) => [u.id, u]));
    const tradeMap = new Map(tradeRows.map((t) => [t.id, t]));

    return rows.map((m) => ({
      ...m,
      fromUserName: userMap.get(m.fromUser)?.name ?? null,
      toUserName: userMap.get(m.toUser)?.name ?? null,
      fromItemTitle: m.fromItem ? tradeMap.get(m.fromItem)?.title ?? null : null,
      toItemTitle: m.toItem ? tradeMap.get(m.toItem)?.title ?? null : null,
    }));
  });
}
