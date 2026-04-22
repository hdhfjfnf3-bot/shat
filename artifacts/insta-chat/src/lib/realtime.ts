import { useEffect, useRef } from "react";
import { useChatStore, setRealtimeAdapter } from "./store";
import { useMe } from "./me";

function buildWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/ws`;
}

export function useRealtime() {
  const username = useMe((s) => s.username);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);

  useEffect(() => {
    if (!username) return;
    let closed = false;

    const connect = () => {
      const ws = new WebSocket(buildWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "hello", username }));
      };

      ws.onmessage = (ev) => {
        let data: any;
        try {
          data = JSON.parse(ev.data);
        } catch {
          return;
        }
        const store = useChatStore.getState();

        if (data.type === "hello_ack") return;

        if (data.type === "conversations" && Array.isArray(data.items)) {
          for (const it of data.items) {
            if (typeof it.peer !== "string") continue;
            store.ensureConversation(it.peer);
            if (it.lastMessage) {
              store.ingestRemoteMessage(it.peer, {
                id: it.lastMessage.id,
                senderId: it.lastMessage.senderUsername,
                type: it.lastMessage.type,
                content: it.lastMessage.content,
                createdAt: it.lastMessage.createdAt,
                replyToId: it.lastMessage.replyToId,
                reactions: it.lastMessage.reactions ?? [],
                voice: it.lastMessage.voice,
              } as any);
            }
            ws.send(JSON.stringify({ type: "history", peer: it.peer }));
          }
          return;
        }

        if (data.type === "history" && typeof data.peer === "string" && Array.isArray(data.messages)) {
          for (const m of data.messages) {
            store.ingestRemoteMessage(data.peer, {
              id: m.id,
              senderId: m.senderUsername,
              type: m.type,
              content: m.content,
              createdAt: m.createdAt,
              replyToId: m.replyToId,
              reactions: m.reactions ?? [],
              voice: m.voice,
              isUnsent: m.isUnsent,
            } as any);
            if (m.isUnsent) store.markUnsent(data.peer.toLowerCase(), m.id);
          }
          return;
        }

        if (data.type === "message" && typeof data.peer === "string" && data.message) {
          const m = data.message;
          store.ingestRemoteMessage(data.peer, {
            id: m.id,
            senderId: m.senderUsername,
            type: m.type,
            content: m.content,
            createdAt: m.createdAt,
            replyToId: m.replyToId,
            reactions: m.reactions ?? [],
            voice: m.voice,
          } as any);
          return;
        }

        if (data.type === "react" && typeof data.peer === "string") {
          store.setReactions(data.peer.toLowerCase(), data.messageId, data.reactions ?? []);
          return;
        }

        if (data.type === "unsend" && typeof data.peer === "string") {
          store.markUnsent(data.peer.toLowerCase(), data.messageId);
          return;
        }

        if (data.type === "typing" && typeof data.peer === "string") {
          store.setTyping(data.peer, !!data.isTyping);
          return;
        }
      };

      ws.onclose = () => {
        if (closed) return;
        if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
        reconnectRef.current = window.setTimeout(connect, 1500);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    };

    setRealtimeAdapter({
      sendMessage: (to, msg) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        ws.send(
          JSON.stringify({
            type: "send",
            to,
            message: {
              id: msg.id,
              type: msg.type,
              content: msg.content,
              replyToId: msg.replyToId,
              voice: msg.voice,
            },
          }),
        );
        return true;
      },
      reactMessage: (peer, messageId, emoji) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        ws.send(JSON.stringify({ type: "react", peer, messageId, emoji }));
        return true;
      },
      unsendMessage: (peer, messageId) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        ws.send(JSON.stringify({ type: "unsend", peer, messageId }));
        return true;
      },
    });

    connect();

    return () => {
      closed = true;
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;
      setRealtimeAdapter({});
    };
  }, [username]);

}
