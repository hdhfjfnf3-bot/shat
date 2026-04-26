import { useEffect, useRef } from "react";
import { useChatStore, setRealtimeAdapter } from "./store";
import { useMe } from "./me";
import { supabase, roomKey } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtime() {
  const username = useMe((s) => s.username);
  const token = useMe((s) => s.token);
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!username || !token) return;
    const me = username.toLowerCase();
    let closed = false;

    // Cleanup previous channels
    channelsRef.current.forEach((c) => c.unsubscribe());
    channelsRef.current = [];

    async function init() {
      const store = useChatStore.getState();

      // Load all rooms for this user
      const { data: rooms } = await supabase
        .from("rooms")
        .select("*")
        .or(`user_a.eq.${me},user_b.eq.${me}`);

      if (closed) return;

      // Load history + subscribe for each room
      for (const room of rooms ?? []) {
        const peer = room.user_a === me ? room.user_b : room.user_a;
        store.ensureConversation(peer);

        // Load message history
        const { data: msgs } = await supabase
          .from("messages")
          .select("*, reactions(*)")
          .eq("room_key", room.key)
          .order("created_at");

        if (closed) return;

        for (const m of msgs ?? []) {
          store.ingestRemoteMessage(peer, {
            id: m.id,
            senderId: m.sender_username,
            type: m.type,
            content: m.is_unsent ? "" : m.content,
            createdAt: m.created_at,
            replyToId: m.reply_to_id ?? undefined,
            reactions: (m.reactions ?? []).map((r: any) => ({ userId: r.user_id, emoji: r.emoji })),
            voice: m.voice_meta ?? undefined,
            isUnsent: m.is_unsent,
          } as any);
          if (m.is_unsent) store.markUnsent(peer, m.id);
        }

        subscribeToRoom(room.key, peer, me);
      }
    }

    function subscribeToRoom(key: string, peer: string, me: string) {
      const store = useChatStore.getState();
      const ch = supabase
        .channel(`room:${key}`)
        // New messages (Postgres Changes)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_key=eq.${key}` }, (p) => {
          const m = p.new as any;
          store.ingestRemoteMessage(peer, {
            id: m.id, senderId: m.sender_username, type: m.type,
            content: m.content, createdAt: m.created_at,
            replyToId: m.reply_to_id ?? undefined, reactions: [], voice: m.voice_meta ?? undefined,
          } as any);
        })
        // Unsent messages
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `room_key=eq.${key}` }, (p) => {
          const m = p.new as any;
          if (m.is_unsent) store.markUnsent(peer, m.id);
        })
        // Reactions
        .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, async (p) => {
          const row = (p.new ?? p.old) as any;
          if (!row?.message_id) return;
          const { data } = await supabase.from("reactions").select("*").eq("message_id", row.message_id);
          if (data) store.setReactions(peer, row.message_id, data.map((r) => ({ userId: r.user_id, emoji: r.emoji })));
        })
        // Typing (broadcast)
        .on("broadcast", { event: "typing" }, (p) => {
          if (p.payload.to === me) store.setTyping(p.payload.from, p.payload.isTyping);
        })
        // Read receipts (broadcast)
        .on("broadcast", { event: "read" }, (p) => {
          if (p.payload.to === me) store.markPeerRead(p.payload.from);
        })
        .subscribe();

      channelsRef.current.push(ch);
    }

    setRealtimeAdapter({
      sendMessage: (to, msg) => {
        const key = roomKey(me, to);
        // Ensure room exists
        supabase.from("rooms").upsert({ key, user_a: me, user_b: to }, { onConflict: "key" }).then(() => {
          supabase.from("messages").insert({
            id: msg.id, room_key: key, sender_username: me,
            type: msg.type, content: msg.content,
            reply_to_id: msg.replyToId ?? null, voice_meta: msg.voice ?? null, is_unsent: false,
          }).then(() => {
            // Subscribe to new room if first message
            const already = channelsRef.current.some((c) => (c as any).topic === `realtime:room:${key}`);
            if (!already) subscribeToRoom(key, to, me);
          });
        });
        return true;
      },
      reactMessage: (peer, messageId, emoji) => {
        supabase.from("reactions").select("*").eq("message_id", messageId).eq("user_id", me).then(({ data }) => {
          if (data && data.length > 0 && data[0].emoji === emoji) {
            supabase.from("reactions").delete().eq("message_id", messageId).eq("user_id", me);
          } else {
            supabase.from("reactions").delete().eq("message_id", messageId).eq("user_id", me).then(() => {
              supabase.from("reactions").insert({ message_id: messageId, user_id: me, emoji });
            });
          }
        });
        return true;
      },
      unsendMessage: (peer, messageId) => {
        supabase.from("messages").update({ is_unsent: true, content: "" }).eq("id", messageId).eq("sender_username", me);
        return true;
      },
      sendTyping: (to, isTyping) => {
        const key = roomKey(me, to);
        const ch = channelsRef.current.find((c) => (c as any).topic === `realtime:room:${key}`);
        ch?.send({ type: "broadcast", event: "typing", payload: { from: me, to, isTyping } });
      },
      sendRead: (to) => {
        const key = roomKey(me, to);
        const ch = channelsRef.current.find((c) => (c as any).topic === `realtime:room:${key}`);
        ch?.send({ type: "broadcast", event: "read", payload: { from: me, to } });
      },
    });

    init();

    return () => {
      closed = true;
      channelsRef.current.forEach((c) => c.unsubscribe());
      channelsRef.current = [];
      setRealtimeAdapter({});
    };
  }, [username, token]);
}
