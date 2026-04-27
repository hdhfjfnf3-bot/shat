import { useEffect, useRef } from "react";
import { useChatStore, setRealtimeAdapter } from "./store";
import { useMe } from "./me";
import { supabase, roomKey } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtime() {
  const username = useMe((s) => s.username);
  const token = useMe((s) => s.token);
  // Use a Map<roomKey, channel> for O(1) lookup in typing/read
  const channelMap = useRef<Map<string, RealtimeChannel>>(new Map());

  useEffect(() => {
    if (!username || !token) return;
    const me = username.toLowerCase();
    let closed = false;

    // Cleanup previous channels
    channelMap.current.forEach((ch) => ch.unsubscribe());
    channelMap.current.clear();

    async function init() {
      const store = useChatStore.getState();

      // Listen for ANY room changes (INSERT or UPDATE from upsert) to ensure we catch new chats
      const globalCh = supabase
        .channel(`global:${me}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, (p) => {
          const r = (p.new || p.old) as any;
          if (r && (r.user_a === me || r.user_b === me)) {
            handleNewRoom(r);
          }
        })
        .subscribe();
      channelMap.current.set("__global__", globalCh);

      // Load all existing rooms
      const { data: rooms } = await supabase
        .from("rooms")
        .select("*")
        .or(`user_a.eq.${me},user_b.eq.${me}`);

      if (closed) return;

      for (const room of rooms ?? []) {
        const peer = room.user_a === me ? room.user_b : room.user_a;
        await setupRoom(room.key, peer);
      }
    }

    async function handleNewRoom(room: any) {
      const peer = room.user_a === me ? room.user_b : room.user_a;
      await setupRoom(room.key, peer);
    }

    async function setupRoom(key: string, peer: string) {
      if (closed) return;
      if (channelMap.current.has(key)) return; // already subscribed

      const store = useChatStore.getState();
      store.ensureConversation(peer);

      // 1. Subscribe to real-time events for this room FIRST to avoid race conditions
      const ch = supabase
        .channel(`room:${key}`, {
          config: { broadcast: { ack: false } },
        })
        // New messages
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_key=eq.${key}` }, (p) => {
          const m = p.new as any;
          useChatStore.getState().ingestRemoteMessage(peer, {
            id: m.id, senderId: m.sender_username, type: m.type,
            content: m.content, createdAt: m.created_at,
            replyToId: m.reply_to_id ?? undefined, reactions: [],
            voice: m.voice_meta ?? undefined,
          } as any);
        })
        // Unsent messages
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `room_key=eq.${key}` }, (p) => {
          const m = p.new as any;
          if (m.is_unsent) useChatStore.getState().markUnsent(peer, m.id);
        })
        // Reactions
        .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, async (p) => {
          const row = (p.new ?? p.old) as any;
          if (!row?.message_id) return;
          const { data } = await supabase.from("reactions").select("*").eq("message_id", row.message_id);
          if (data) useChatStore.getState().setReactions(peer, row.message_id, data.map((r) => ({ userId: r.user_id, emoji: r.emoji })));
        })
        // Typing indicator
        .on("broadcast", { event: "typing" }, (p) => {
          if (p.payload?.to === me) useChatStore.getState().setTyping(p.payload.from, p.payload.isTyping);
        })
        // Read receipt
        .on("broadcast", { event: "read" }, (p) => {
          if (p.payload?.to === me) useChatStore.getState().markPeerRead(p.payload.from);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED" && !channelMap.current.has(key)) {
            channelMap.current.set(key, ch);
          }
        });

      // Mark as subscribed immediately so we don't duplicate
      channelMap.current.set(key, ch);

      // 2. THEN load message history to ensure no gap
      const { data: msgs } = await supabase
        .from("messages")
        .select("*, reactions(*)")
        .eq("room_key", key)
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
    }

    // ── Realtime adapter (store → Supabase) ──────────────────────────
    setRealtimeAdapter({
      sendMessage: (to, msg) => {
        const key = roomKey(me, to);
        supabase.from("rooms")
          .upsert({ key, user_a: me, user_b: to }, { onConflict: "key" })
          .then(({ error: roomErr }) => {
            if (roomErr) console.error("Room upsert error:", roomErr);
            supabase.from("messages").insert({
              id: msg.id, room_key: key, sender_username: me,
              type: msg.type, content: msg.content,
              reply_to_id: msg.replyToId ?? null,
              voice_meta: msg.voice ?? null,
              is_unsent: false,
            }).then(({ error: msgErr }) => {
              if (msgErr) console.error("Msg insert error:", msgErr);
              // Subscribe to this room if not already done
              if (!channelMap.current.has(key)) setupRoom(key, to);
            });
          });
        return true;
      },

      reactMessage: (_peer, messageId, emoji) => {
        supabase.from("reactions")
          .select("*").eq("message_id", messageId).eq("user_id", me)
          .then(({ data }) => {
            if (data?.[0]?.emoji === emoji) {
              supabase.from("reactions").delete().eq("message_id", messageId).eq("user_id", me);
            } else {
              supabase.from("reactions").delete().eq("message_id", messageId).eq("user_id", me)
                .then(() => supabase.from("reactions").insert({ message_id: messageId, user_id: me, emoji }));
            }
          });
        return true;
      },

      unsendMessage: (_peer, messageId) => {
        supabase.from("messages")
          .update({ is_unsent: true, content: "" })
          .eq("id", messageId).eq("sender_username", me);
        return true;
      },

      sendTyping: (to, isTyping) => {
        const key = roomKey(me, to);
        const ch = channelMap.current.get(key);
        if (ch) {
          ch.send({ type: "broadcast", event: "typing", payload: { from: me, to, isTyping } });
        }
      },

      sendRead: (to) => {
        const key = roomKey(me, to);
        const ch = channelMap.current.get(key);
        if (ch) {
          ch.send({ type: "broadcast", event: "read", payload: { from: me, to } });
        }
      },
    });

    init();

    return () => {
      closed = true;
      channelMap.current.forEach((ch) => ch.unsubscribe());
      channelMap.current.clear();
      setRealtimeAdapter({});
    };
  }, [username, token]);
}
