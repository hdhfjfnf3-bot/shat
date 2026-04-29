import { useMemo } from "react";

import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";

type StartPayload = {
  kind: "fasttap_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
};

type TapPayload = {
  kind: "fasttap_tap";
  gameId: string;
  by: string;
  at: string;
};

type ResetPayload = {
  kind: "fasttap_reset";
  gameId: string;
  by: string;
  at: string;
};

type Payload = StartPayload | TapPayload | ResetPayload;

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function FastTapInline({
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

  const start = useMemo(() => safeJsonParse<StartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "fasttap_start" ? start.gameId : null;

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

  const state = useMemo(() => {
    const scores: Record<string, number> = {};
    for (const p of allPlayers) scores[p] = 0;
    
    if (!gameId) return { scores, resetAt: 0 };
    let resetAt = 0;
    
    for (const m of allMessages) {
      if (m.type !== "game") continue;
      const p = safeJsonParse<Payload>(m.content);
      if (!p || p.gameId !== gameId) continue;
      if (p.kind === "fasttap_reset") {
        resetAt++;
        for (const p of allPlayers) scores[p] = 0;
      }
      if (p.kind === "fasttap_tap") {
        const by = p.by.toLowerCase();
        if (scores[by] !== undefined) scores[by]++;
        else scores[by] = 1;
      }
    }
    return { scores, resetAt };
  }, [allMessages, gameId, allPlayers]);

  if (!start || !gameId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
        رسالة لعبة النقر السريع غير صالحة.
      </div>
    );
  }

  const tap = () => {
    const payload: TapPayload = { kind: "fasttap_tap", gameId, by: me, at: new Date().toISOString() };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  const reset = () => {
    const payload: ResetPayload = { kind: "fasttap_reset", gameId, by: me, at: new Date().toISOString() };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  const topScore = Math.max(...Object.values(state.scores));
  const leaders = Object.entries(state.scores).filter(([, score]) => score === topScore && score > 0).map(([p]) => p);
  
  const lead = leaders.length === 0 
    ? "لسه محدش ضغط" 
    : leaders.length > 1 
      ? "تعادل بين: " + leaders.map(p => p === me ? "أنت" : p).join(" و ")
      : leaders[0] === me 
        ? "أنت متقدم!" 
        : `${leaders[0]} متقدم!`;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden">
      <div className="p-3 bg-gradient-to-r from-amber-500/20 to-red-500/20">
        <div className="text-[13px] font-black text-white">⚡ النقر السريع</div>
        <div className="text-[11px] text-white/70 mt-0.5">مين يضغط أكتر… من غير ما يزهق.</div>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-[12px] max-h-32 overflow-y-auto hide-scrollbar">
          {allPlayers.map((p) => {
            const isLeader = leaders.includes(p) && topScore > 0;
            return (
              <div key={p} className={`rounded-xl border ${isLeader ? "border-[#00d26a] bg-[#00d26a]/10" : "border-white/10 bg-black/30"} p-2 transition-all`}>
                <div className="text-white/60 mb-1 truncate" title={p}>{p === me ? "أنت" : p}</div>
                <div className={`font-black text-[18px] ${isLeader ? "text-[#00d26a]" : "text-white"}`}>{state.scores[p] ?? 0}</div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={tap}
          className="w-full rounded-2xl border border-white/10 bg-gradient-to-r from-[#00d26a]/20 to-sky-500/10 hover:from-[#00d26a]/30 hover:to-sky-500/20 active:from-[#00d26a]/40 py-3 text-[14px] font-black text-white transition-colors"
        >
          اضغط هنا
        </button>

        <div className="flex items-center justify-between text-[11px] text-white/55">
          <span>{lead}</span>
          <button type="button" onClick={reset} className="text-white/60 hover:text-white transition-colors">
            ريست
          </button>
        </div>
      </div>
    </div>
  );
}

