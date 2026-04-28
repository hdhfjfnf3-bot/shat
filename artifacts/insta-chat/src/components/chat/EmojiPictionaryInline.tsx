import { useMemo } from "react";

import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";

type StartPayload = {
  kind: "emoji_pict_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
};

type NextPayload = {
  kind: "emoji_pict_next";
  gameId: string;
  by: string;
  at: string;
};

type Payload = StartPayload | NextPayload;

const PROMPTS = [
  "🎬🍿👀",
  "🚕🌧️😤",
  "🏖️🕶️🍉",
  "🐈‍⬛🪟🌙",
  "👟🏃‍♂️💨",
  "🍔🍟😋",
  "🎧🎶😌",
  "🧠⚡🧩",
  "🧋🧊🍓",
  "📦🚚🏠",
  "🎉🥳📸",
  "😴🛏️⏰",
];

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function EmojiPictionaryInline({
  gameMessage,
  otherUserId,
  conversationId,
  allMessages,
}: {
  gameMessage: Message;
  otherUserId: string;
  conversationId: string;
  allMessages: Message[];
}) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();

  const start = useMemo(() => safeJsonParse<StartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "emoji_pict_start" ? start.gameId : null;

  const step = useMemo(() => {
    if (!gameId) return 0;
    let n = 0;
    for (const m of allMessages) {
      if (m.type !== "game") continue;
      const p = safeJsonParse<Payload>(m.content);
      if (!p || p.gameId !== gameId) continue;
      if (p.kind === "emoji_pict_next") n++;
    }
    return n;
  }, [allMessages, gameId]);

  if (!start || !gameId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
        رسالة لعبة الإيموجيز غير صالحة.
      </div>
    );
  }

  const seed = hashSeed(`${gameId}:${step}`);
  const prompt = PROMPTS[seed % PROMPTS.length]!;
  const p1 = start.createdBy.toLowerCase();
  const p2 = p1 === me ? otherUserId.toLowerCase() : me;
  const turn = step % 2 === 0 ? p1 : p2;
  const myTurn = turn === me;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden">
      <div className="p-3 bg-gradient-to-r from-fuchsia-600/30 to-sky-600/20">
        <div className="text-[13px] font-black text-white">🧩 احكيها بالإيموجيز</div>
        <div className="text-[11px] text-white/70 mt-0.5">
          اللي عليه الدور يشرح… والتاني يخمّن في رسالة عادية.
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
          <div className="text-[11px] text-white/60 mb-1">{myTurn ? "دورك تشرح" : "دور الطرف التاني"}</div>
          <div className="text-[28px] leading-none">{prompt}</div>
        </div>

        <button
          type="button"
          onClick={() => {
            const payload: NextPayload = { kind: "emoji_pict_next", gameId, by: me, at: new Date().toISOString() };
            sendMessage(conversationId, JSON.stringify(payload), "game");
          }}
          className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15 py-2 text-[13px] font-black text-white transition-colors"
        >
          اللي بعده
        </button>
      </div>
    </div>
  );
}

