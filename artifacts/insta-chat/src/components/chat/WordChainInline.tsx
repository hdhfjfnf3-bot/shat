import { useMemo, useState } from "react";

import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";

type StartPayload = {
  kind: "wordchain_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
  rule: "آخر حرف" | "آخر حرفين";
};

type PlayPayload = {
  kind: "wordchain_play";
  gameId: string;
  by: string;
  word: string;
  at: string;
};

type ResetPayload = {
  kind: "wordchain_reset";
  gameId: string;
  by: string;
  at: string;
};

type Payload = StartPayload | PlayPayload | ResetPayload;

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function normArabic(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

export function WordChainInline({
  gameMessage,
  otherUserId,
  conversationId,
  allMessages,
  participants,
}: {
  gameMessage: Message;
  otherUserId: string;
  conversationId: string;
  allMessages: Message[];
  participants?: import("@/lib/types").User[];
}) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();
  const [word, setWord] = useState("");

  const start = useMemo(() => safeJsonParse<StartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "wordchain_start" ? start.gameId : null;

  const plays = useMemo(() => {
    if (!gameId) return [] as PlayPayload[];
    const out: PlayPayload[] = [];
    for (const m of allMessages) {
      if (m.type !== "game") continue;
      const p = safeJsonParse<Payload>(m.content);
      if (!p || p.gameId !== gameId) continue;
      if (p.kind === "wordchain_play") out.push(p);
      if (p.kind === "wordchain_reset") out.length = 0;
    }
    return out;
  }, [allMessages, gameId]);

  if (!start || !gameId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
        رسالة لعبة سلسلة كلمات غير صالحة.
      </div>
    );
  }

  const last = plays.length ? plays[plays.length - 1] : null;
  const neededLen = start.rule === "آخر حرفين" ? 2 : 1;
  const need = last ? normArabic(last.word).slice(-neededLen) : null;
  
  const allPlayers = useMemo(() => {
    if (!participants || participants.length === 0) {
      const p1 = start?.createdBy.toLowerCase() || "";
      const p2 = p1 === me ? otherUserId.toLowerCase() : me;
      return [p1, p2];
    }
    const set = new Set<string>();
    set.add(start?.createdBy.toLowerCase() || "");
    participants.forEach((p) => set.add(p.username.toLowerCase()));
    set.add(me);
    return Array.from(set).sort();
  }, [participants, start?.createdBy, me, otherUserId]);

  const currentTurnPlayer = allPlayers[plays.length % allPlayers.length];
  const myTurn = currentTurnPlayer === me;

  const error = useMemo(() => {
    const w = normArabic(word);
    if (!w) return null;
    if (need && !w.startsWith(need)) return `لازم تبدأ بـ "${need}"`;
    if (plays.some((p) => normArabic(p.word) === w)) return "الكلمة دي اتقالت قبل كده";
    if (w.length < 2) return "اكتب كلمة أطول شوية";
    return null;
  }, [need, plays, word]);

  const play = () => {
    if (!myTurn) return;
    if (error) return;
    const w = word.trim();
    if (!w) return;
    const payload: PlayPayload = { kind: "wordchain_play", gameId, by: me, word: w, at: new Date().toISOString() };
    sendMessage(conversationId, JSON.stringify(payload), "game");
    setWord("");
  };

  const reset = () => {
    const payload: ResetPayload = { kind: "wordchain_reset", gameId, by: me, at: new Date().toISOString() };
    sendMessage(conversationId, JSON.stringify(payload), "game");
    setWord("");
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden">
      <div className="p-3 bg-gradient-to-r from-emerald-500/15 to-lime-500/10">
        <div className="text-[13px] font-black text-white">🔗 سلسلة كلمات</div>
        <div className="text-[11px] text-white/70 mt-0.5">
          القاعدة: {start.rule} • {myTurn ? "دورك" : `دور ${currentTurnPlayer}`}
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="text-[11px] text-white/60 mb-1">آخر كلمة</div>
          <div className="text-[14px] font-semibold text-white">{last ? last.word : "ابدأ انت بكلمة"}</div>
          {need ? <div className="text-[11px] text-white/50 mt-1">ابدأ بـ: "{need}"</div> : null}
        </div>

        <div className="flex items-stretch gap-2">
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder={need ? `مثال: ${need}...` : "اكتب كلمة"}
            className="flex-1 rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/30"
            disabled={!myTurn}
          />
          <button
            type="button"
            onClick={play}
            disabled={!myTurn || Boolean(error) || !word.trim()}
            className={[
              "rounded-xl px-4 text-[13px] font-black border border-white/10 transition-colors",
              myTurn && !error && word.trim()
                ? "bg-white/5 hover:bg-white/10 active:bg-white/15 text-white"
                : "bg-white/5 text-white/30 cursor-not-allowed",
            ].join(" ")}
          >
            لعب
          </button>
        </div>

        {error ? <div className="text-[12px] text-rose-300">{error}</div> : null}

        <div className="flex items-center justify-between text-[11px] text-white/55">
          <span>عدد الكلمات: {plays.length}</span>
          <button type="button" onClick={reset} className="text-white/60 hover:text-white transition-colors">
            ريست
          </button>
        </div>
      </div>
    </div>
  );
}

