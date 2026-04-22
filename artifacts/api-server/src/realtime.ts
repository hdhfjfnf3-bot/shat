import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { logger } from "./lib/logger";

type Reaction = { userId: string; emoji: string };
type VoiceMeta = { duration: number; peaks: number[] };

export type StoredMessage = {
  id: string;
  roomKey: string;
  senderUsername: string;
  type: "text" | "image" | "voice" | "like";
  content: string;
  createdAt: string;
  replyToId?: string;
  reactions: Reaction[];
  voice?: VoiceMeta;
  isUnsent?: boolean;
};

type Room = {
  key: string;
  users: [string, string];
  messages: StoredMessage[];
};

const rooms = new Map<string, Room>();
const sockets = new Map<string, Set<WebSocket>>();

function roomKey(a: string, b: string): string {
  return [a.toLowerCase(), b.toLowerCase()].sort().join("__");
}

function getOrCreateRoom(a: string, b: string): Room {
  const key = roomKey(a, b);
  let r = rooms.get(key);
  if (!r) {
    r = { key, users: [a.toLowerCase(), b.toLowerCase()], messages: [] };
    rooms.set(key, r);
  }
  return r;
}

function send(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastTo(username: string, data: unknown) {
  const set = sockets.get(username.toLowerCase());
  if (!set) return;
  for (const ws of set) send(ws, data);
}

function listConversationsFor(username: string) {
  const u = username.toLowerCase();
  const list: Array<{ peer: string; lastMessage: StoredMessage | null; key: string }> = [];
  for (const r of rooms.values()) {
    if (!r.users.includes(u)) continue;
    const peer = r.users[0] === u ? r.users[1] : r.users[0];
    list.push({ peer, lastMessage: r.messages[r.messages.length - 1] ?? null, key: r.key });
  }
  return list;
}

export function getConversationMessages(username: string, peer: string): StoredMessage[] {
  const r = rooms.get(roomKey(username, peer));
  return r ? r.messages : [];
}

export function getConversationsHttp(username: string) {
  return listConversationsFor(username);
}

export function attachRealtime(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws) => {
    let username: string | null = null;

    ws.on("message", (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === "hello" && typeof msg.username === "string") {
        username = msg.username.trim().toLowerCase().replace(/^@/, "");
        if (!username) return;
        let set = sockets.get(username);
        if (!set) {
          set = new Set();
          sockets.set(username, set);
        }
        set.add(ws);
        send(ws, { type: "hello_ack", username });
        send(ws, { type: "conversations", items: listConversationsFor(username) });
        return;
      }

      if (!username) return;

      if (msg.type === "history" && typeof msg.peer === "string") {
        const messages = getConversationMessages(username, msg.peer);
        send(ws, { type: "history", peer: msg.peer.toLowerCase(), messages });
        return;
      }

      if (msg.type === "send" && typeof msg.to === "string" && msg.message) {
        const to = msg.to.trim().toLowerCase().replace(/^@/, "");
        if (!to || to === username) return;
        const room = getOrCreateRoom(username, to);
        const m = msg.message;
        const stored: StoredMessage = {
          id: typeof m.id === "string" ? m.id : Math.random().toString(36).slice(2, 10),
          roomKey: room.key,
          senderUsername: username,
          type: m.type === "image" || m.type === "voice" || m.type === "like" ? m.type : "text",
          content: typeof m.content === "string" ? m.content : "",
          createdAt: new Date().toISOString(),
          replyToId: typeof m.replyToId === "string" ? m.replyToId : undefined,
          reactions: [],
          voice: m.voice && typeof m.voice.duration === "number" ? { duration: m.voice.duration, peaks: Array.isArray(m.voice.peaks) ? m.voice.peaks : [] } : undefined,
        };
        room.messages.push(stored);
        if (room.messages.length > 500) room.messages.splice(0, room.messages.length - 500);

        const payload = { type: "message", peer: to, message: stored };
        broadcastTo(username, payload);
        broadcastTo(to, { type: "message", peer: username, message: stored });
        return;
      }

      if (msg.type === "react" && typeof msg.peer === "string" && typeof msg.messageId === "string" && typeof msg.emoji === "string") {
        const peer = msg.peer.trim().toLowerCase();
        const room = rooms.get(roomKey(username, peer));
        if (!room) return;
        const target = room.messages.find((mm) => mm.id === msg.messageId);
        if (!target) return;
        const cur = target.reactions ?? [];
        const mine = cur.find((r) => r.userId === username);
        let next = cur.filter((r) => r.userId !== username);
        if (!mine || mine.emoji !== msg.emoji) {
          next = [...next, { userId: username!, emoji: msg.emoji }];
        }
        target.reactions = next;
        const payload = { type: "react", peer, messageId: msg.messageId, reactions: target.reactions };
        broadcastTo(username, payload);
        broadcastTo(peer, { type: "react", peer: username, messageId: msg.messageId, reactions: target.reactions });
        return;
      }

      if (msg.type === "unsend" && typeof msg.peer === "string" && typeof msg.messageId === "string") {
        const peer = msg.peer.trim().toLowerCase();
        const room = rooms.get(roomKey(username, peer));
        if (!room) return;
        const target = room.messages.find((mm) => mm.id === msg.messageId);
        if (!target || target.senderUsername !== username) return;
        target.isUnsent = true;
        target.content = "";
        target.voice = undefined;
        const payload = { type: "unsend", peer, messageId: msg.messageId };
        broadcastTo(username, payload);
        broadcastTo(peer, { type: "unsend", peer: username, messageId: msg.messageId });
        return;
      }

      if (msg.type === "typing" && typeof msg.to === "string") {
        const to = msg.to.trim().toLowerCase();
        broadcastTo(to, { type: "typing", peer: username, isTyping: !!msg.isTyping });
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
