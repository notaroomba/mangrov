import type { FastifyInstance } from "fastify";
import { and, desc, eq, lt, or, sql as dsql, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { chats, messages, user } from "../db/schema.js";
import { requireAuth } from "../auth-middleware.js";
import { emitToChat, emitToUser } from "../socket.js";

const sendMessageSchema = z.object({
  chatId: z.string().uuid().optional(),
  recipientId: z.string().optional(),
  text: z.string().min(1).max(4000).optional(),
  imageUrl: z.string().url().optional(),
}).refine((v) => v.chatId || v.recipientId, {
  message: "chatId or recipientId required",
}).refine((v) => v.text || v.imageUrl, {
  message: "text or imageUrl required",
});

function canonicalPair(a: string, b: string) {
  return a < b ? { userA: a, userB: b } : { userA: b, userB: a };
}

async function getOrCreateChat(uid: string, otherId: string, isTradeMatch = false) {
  const pair = canonicalPair(uid, otherId);
  const existing = await db
    .select()
    .from(chats)
    .where(and(eq(chats.userA, pair.userA), eq(chats.userB, pair.userB)))
    .limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db
    .insert(chats)
    .values({ userA: pair.userA, userB: pair.userB, isTradeMatch })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  // Race: re-select
  const [again] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.userA, pair.userA), eq(chats.userB, pair.userB)))
    .limit(1);
  return again!;
}

export async function chatsRoutes(app: FastifyInstance) {
  app.get("/api/chats", { preHandler: requireAuth }, async (req) => {
    const uid = req.userId!;
    const partnerA = db.$with("partnerA").as(
      db
        .select({
          chatId: chats.id,
          partnerId: chats.userB,
          lastMessage: chats.lastMessage,
          lastMessageAt: chats.lastMessageAt,
          isTradeMatch: chats.isTradeMatch,
        })
        .from(chats)
        .where(eq(chats.userA, uid))
    );
    const rows = await db
      .select({
        chat: chats,
        partner: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
        },
        unreadCount: dsql<number>`(
          SELECT COUNT(*)::int FROM ${messages}
          WHERE ${messages.chatId} = ${chats.id}
            AND ${messages.senderId} <> ${uid}
            AND ${messages.readAt} IS NULL
        )`.as("unread_count"),
      })
      .from(chats)
      .leftJoin(
        user,
        dsql`${user.id} = CASE WHEN ${chats.userA} = ${uid} THEN ${chats.userB} ELSE ${chats.userA} END`
      )
      .where(or(eq(chats.userA, uid), eq(chats.userB, uid)))
      .orderBy(desc(chats.lastMessageAt));
    return rows.map((r) => ({
      ...r.chat,
      partner: r.partner,
      unreadCount: r.unreadCount ?? 0,
    }));
  });

  app.get("/api/chats/with/:userId", { preHandler: requireAuth }, async (req, reply) => {
    const otherId = (req.params as { userId: string }).userId;
    if (otherId === req.userId) {
      return reply.code(400).send({ error: "cannot chat with yourself" });
    }
    const chat = await getOrCreateChat(req.userId!, otherId);
    return chat;
  });

  app.get(
    "/api/chats/:chatId/messages",
    { preHandler: requireAuth },
    async (req, reply) => {
      const chatId = (req.params as { chatId: string }).chatId;
      // Verify membership
      const [c] = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
      if (!c) return reply.code(404).send({ error: "not found" });
      if (c.userA !== req.userId && c.userB !== req.userId) {
        return reply.code(403).send({ error: "forbidden" });
      }
      const q = req.query as Record<string, string | undefined>;
      const limit = Math.min(Number(q.limit ?? "50"), 100);
      const conds = [eq(messages.chatId, chatId)] as any[];
      if (q.cursor) conds.push(lt(messages.createdAt, new Date(q.cursor)));
      const rows = await db
        .select()
        .from(messages)
        .where(and(...conds))
        .orderBy(desc(messages.createdAt))
        .limit(limit);
      return rows.reverse();
    }
  );

  app.post("/api/messages", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid payload", issues: parsed.error.issues });
    }
    const { chatId, recipientId, text, imageUrl } = parsed.data;

    let chat;
    if (chatId) {
      const [c] = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
      if (!c) return reply.code(404).send({ error: "chat not found" });
      if (c.userA !== req.userId && c.userB !== req.userId) {
        return reply.code(403).send({ error: "forbidden" });
      }
      chat = c;
    } else {
      chat = await getOrCreateChat(req.userId!, recipientId!);
    }

    const [msg] = await db
      .insert(messages)
      .values({
        chatId: chat.id,
        senderId: req.userId!,
        text: text ?? null,
        imageUrl: imageUrl ?? null,
      })
      .returning();

    const summary = text ?? (imageUrl ? "[image]" : "");
    await db
      .update(chats)
      .set({ lastMessage: summary, lastMessageAt: msg!.createdAt })
      .where(eq(chats.id, chat.id));

    emitToChat(chat.id, "message:new", msg);
    const otherUserId = chat.userA === req.userId ? chat.userB : chat.userA;
    // Belt and suspenders: also push message:new to both users' personal rooms so clients
    // that haven't joined the chat:<id> room (e.g. inbox views) still receive the event.
    emitToUser(otherUserId, "message:new", msg);
    emitToUser(req.userId!, "message:new", msg);
    emitToUser(otherUserId, "chat:bump", { chatId: chat.id, lastMessage: summary, lastMessageAt: msg!.createdAt });

    return msg;
  });

  app.post(
    "/api/chats/:chatId/read",
    { preHandler: requireAuth },
    async (req, reply) => {
      const chatId = (req.params as { chatId: string }).chatId;
      const [c] = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
      if (!c) return reply.code(404).send({ error: "not found" });
      if (c.userA !== req.userId && c.userB !== req.userId) {
        return reply.code(403).send({ error: "forbidden" });
      }
      const now = new Date();
      const updated = await db
        .update(messages)
        .set({ readAt: now })
        .where(
          and(
            eq(messages.chatId, chatId),
            dsql`${messages.senderId} <> ${req.userId!}`,
            isNull(messages.readAt)
          )
        )
        .returning({ id: messages.id });
      if (updated.length > 0) {
        emitToChat(chatId, "message:read", { chatId, readerId: req.userId, ids: updated.map((u) => u.id), at: now });
      }
      return { ok: true, count: updated.length };
    }
  );

  app.get("/api/unread-count", { preHandler: requireAuth }, async (req) => {
    const rows = await db
      .select({ count: dsql<number>`COUNT(*)::int` })
      .from(messages)
      .leftJoin(chats, eq(chats.id, messages.chatId))
      .where(
        and(
          or(eq(chats.userA, req.userId!), eq(chats.userB, req.userId!)),
          dsql`${messages.senderId} <> ${req.userId!}`,
          isNull(messages.readAt)
        )
      );
    return { count: rows[0]?.count ?? 0 };
  });
}
