import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { logger } from "./lib/logger";
import { verifyToken } from "./lib/auth";
import { db, messagesTable, roomsTable, reactionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

type Reaction = { userId: string; emoji: string };
type VoiceMeta = { duration: number; peaks: number[] };

export type StoredMessage = {
  id: string;
  roomKey: string;
  senderUsername: string;
  type: "text" | "image" | "video" | "voice" | "like";
  content: string;
  createdAt: string;
  replyToId?: string;
  reactions: Reaction[];
  voice?: VoiceMeta;
  isUnsent?: boolean;
};

const sockets = new Map<string, Set<WebSocket>>();

function rKey(a: string, b: string): string {
  return [a.toLowerCase(), b.toLowerCase()].sort().join("__");
}

function send(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function broadcastTo(username: string, data: unknown) {
  const set = sockets.get(username.toLowerCase());
  if (!set) return;
  for (const ws of set) send(ws, data);
}

// ─── DB helpers ────────────────────────────────────────────────────────────

async function ensureRoom(userA: string, userB: string): Promise<string> {
  const key = rKey(userA, userB);
  const existing = await db.select().from(roomsTable).where(eq(roomsTable.key, key)).limit(1);
  if (existing.length === 0) {
    await db.insert(roomsTable).values({ key, userA: userA.toLowerCase(), userB: userB.toLowerCase() }).onConflictDoNothing();
  }
  return key;
}

async function getConversationsForUser(username: string) {
  const u = username.toLowerCase();
  const rooms = await db.select().from(roomsTable).where(
    // user is either userA or userB
    eq(roomsTable.userA, u),
  );
  const rooms2 = await db.select().from(roomsTable).where(eq(roomsTable.userB, u));
  const allRooms = [...rooms, ...rooms2];

  const result: Array<{ peer: string; lastMessage: StoredMessage | null; key: string }> = [];
  for (const room of allRooms) {
    const peer = room.userA === u ? room.userB : room.userA;
    const lastMsgs = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.roomKey, room.key))
      .orderBy(messagesTable.createdAt)
      .limit(1);

    // Get last message with reactions
    let lastMessage: StoredMessage | null = null;
    if (lastMsgs.length > 0) {
      const m = lastMsgs[0];
      const rxns = await db.select().from(reactionsTable).where(eq(reactionsTable.messageId, m.id));
      lastMessage = {
        id: m.id,
        roomKey: m.roomKey,
        senderUsername: m.senderUsername,
        type: m.type as StoredMessage["type"],
        content: m.isUnsent ? "" : m.content,
        createdAt: m.createdAt.toISOString(),
        replyToId: m.replyToId ?? undefined,
        reactions: rxns.map((r) => ({ userId: r.userId, emoji: r.emoji })),
        voice: (m.voiceMeta as VoiceMeta | null) ?? undefined,
        isUnsent: m.isUnsent,
      };
    }
    result.push({ peer, lastMessage, key: room.key });
  }
  return result;
}

async function getHistoryMessages(userA: string, userB: string): Promise<StoredMessage[]> {
  const key = rKey(userA, userB);
  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.roomKey, key))
    .orderBy(messagesTable.createdAt);

  const result: StoredMessage[] = [];
  for (const m of msgs) {
    const rxns = await db.select().from(reactionsTable).where(eq(reactionsTable.messageId, m.id));
    result.push({
      id: m.id,
      roomKey: m.roomKey,
      senderUsername: m.senderUsername,
      type: m.type as StoredMessage["type"],
      content: m.isUnsent ? "" : m.content,
      createdAt: m.createdAt.toISOString(),
      replyToId: m.replyToId ?? undefined,
      reactions: rxns.map((r) => ({ userId: r.userId, emoji: r.emoji })),
      voice: (m.voiceMeta as VoiceMeta | null) ?? undefined,
      isUnsent: m.isUnsent,
    });
  }
  return result;
}

async function saveMessage(stored: StoredMessage): Promise<void> {
  await db.insert(messagesTable).values({
    id: stored.id,
    roomKey: stored.roomKey,
    senderUsername: stored.senderUsername,
    type: stored.type,
    content: stored.content,
    replyToId: stored.replyToId ?? null,
    voiceMeta: stored.voice ?? null,
    isUnsent: false,
  }).onConflictDoNothing();
}

async function saveReaction(messageId: string, userId: string, emoji: string): Promise<Reaction[]> {
  // Toggle: delete if same emoji exists, else upsert
  const existing = await db
    .select()
    .from(reactionsTable)
    .where(and(eq(reactionsTable.messageId, messageId), eq(reactionsTable.userId, userId)));

  if (existing.length > 0 && existing[0].emoji === emoji) {
    // Remove reaction
    await db
      .delete(reactionsTable)
      .where(and(eq(reactionsTable.messageId, messageId), eq(reactionsTable.userId, userId)));
  } else {
    // Delete old reaction from this user then insert new one
    await db
      .delete(reactionsTable)
      .where(and(eq(reactionsTable.messageId, messageId), eq(reactionsTable.userId, userId)));
    await db.insert(reactionsTable).values({ messageId, userId, emoji });
  }

  const allRxns = await db.select().from(reactionsTable).where(eq(reactionsTable.messageId, messageId));
  return allRxns.map((r) => ({ userId: r.userId, emoji: r.emoji }));
}

async function markMessageUnsent(messageId: string, senderUsername: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.id, messageId), eq(messagesTable.senderUsername, senderUsername)))
    .limit(1);
  if (rows.length === 0) return false;

  await db
    .update(messagesTable)
    .set({ isUnsent: true, content: "" })
    .where(eq(messagesTable.id, messageId));
  return true;
}

// ─── WebSocket Server ───────────────────────────────────────────────────────

export function attachRealtime(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws) => {
    let username: string | null = null;

    ws.on("message", async (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      // ── Auth handshake ──
      if (msg.type === "hello" && typeof msg.token === "string") {
        const verified = verifyToken(msg.token);
        if (!verified) {
          send(ws, { type: "error", message: "Unauthorized" });
          ws.close();
          return;
        }
        username = verified.toLowerCase();
        let set = sockets.get(username);
        if (!set) { set = new Set(); sockets.set(username, set); }
        set.add(ws);
        send(ws, { type: "hello_ack", username });

        try {
          const convs = await getConversationsForUser(username);
          send(ws, { type: "conversations", items: convs });
        } catch (err) {
          logger.error(err, "Failed to load conversations");
          send(ws, { type: "conversations", items: [] });
        }
        return;
      }

      if (!username) return;

      // ── History ──
      if (msg.type === "history" && typeof msg.peer === "string") {
        try {
          const messages = await getHistoryMessages(username, msg.peer);
          send(ws, { type: "history", peer: msg.peer.toLowerCase(), messages });
        } catch (err) {
          logger.error(err, "Failed to load history");
          send(ws, { type: "history", peer: msg.peer.toLowerCase(), messages: [] });
        }
        return;
      }

      // ── Send message ──
      if (msg.type === "send" && typeof msg.to === "string" && msg.message) {
        const to = msg.to.trim().toLowerCase().replace(/^@/, "");
        if (!to || to === username) return;

        try {
          const roomKey = await ensureRoom(username, to);
          const m = msg.message;
          const stored: StoredMessage = {
            id: typeof m.id === "string" ? m.id : Math.random().toString(36).slice(2, 10),
            roomKey,
            senderUsername: username,
            type: ["image", "video", "voice", "like"].includes(m.type) ? m.type : "text",
            content: typeof m.content === "string" ? m.content : "",
            createdAt: new Date().toISOString(),
            replyToId: typeof m.replyToId === "string" ? m.replyToId : undefined,
            reactions: [],
            voice: m.voice && typeof m.voice.duration === "number"
              ? { duration: m.voice.duration, peaks: Array.isArray(m.voice.peaks) ? m.voice.peaks : [] }
              : undefined,
          };

          await saveMessage(stored);

          const payload = { type: "message", peer: to, message: stored };
          broadcastTo(username, payload);
          broadcastTo(to, { type: "message", peer: username, message: stored });
        } catch (err) {
          logger.error(err, "Failed to save/broadcast message");
        }
        return;
      }

      // ── React ──
      if (msg.type === "react" && typeof msg.peer === "string" && typeof msg.messageId === "string" && typeof msg.emoji === "string") {
        const peer = msg.peer.trim().toLowerCase();
        try {
          const reactions = await saveReaction(msg.messageId, username, msg.emoji);
          const payload = { type: "react", peer, messageId: msg.messageId, reactions };
          broadcastTo(username, payload);
          broadcastTo(peer, { type: "react", peer: username, messageId: msg.messageId, reactions });
        } catch (err) {
          logger.error(err, "Failed to save reaction");
        }
        return;
      }

      // ── Unsend ──
      if (msg.type === "unsend" && typeof msg.peer === "string" && typeof msg.messageId === "string") {
        const peer = msg.peer.trim().toLowerCase();
        try {
          const ok = await markMessageUnsent(msg.messageId, username);
          if (!ok) return;
          const payload = { type: "unsend", peer, messageId: msg.messageId };
          broadcastTo(username, payload);
          broadcastTo(peer, { type: "unsend", peer: username, messageId: msg.messageId });
        } catch (err) {
          logger.error(err, "Failed to unsend message");
        }
        return;
      }

      // ── Typing ──
      if (msg.type === "typing" && typeof msg.to === "string") {
        const to = msg.to.trim().toLowerCase();
        broadcastTo(to, { type: "typing", peer: username, isTyping: !!msg.isTyping });
        return;
      }

      // ── Read receipt ──
      if (msg.type === "read" && typeof msg.to === "string") {
        const to = msg.to.trim().toLowerCase();
        broadcastTo(to, { type: "read", peer: username });
        return;
      }
    });

    ws.on("close", () => {
      if (username) {
        const set = sockets.get(username);
        if (set) {
          set.delete(ws);
          if (set.size === 0) sockets.delete(username);
        }
      }
    });
  });

  logger.info("WebSocket realtime attached at /api/ws");
}
