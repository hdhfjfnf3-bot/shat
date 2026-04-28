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
}: {
  gameMessage: Message;
  otherUserId: string;
  conversationId: string;
  allMessages: Message[];
}) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();

  const start = useMemo(() => safeJsonParse<StartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "fasttap_start" ? start.gameId : null;

  const state = useMemo(() => {
    if (!gameId) return { my: 0, other: 0 };
    let my = 0;
    let other = 0;
    let resetAt = 0;
    for (const m of allMessages) {
      if (m.type !== "game") continue;
      const p = safeJsonParse<Payload>(m.content);
      if (!p || p.gameId !== gameId) continue;
      if (p.kind === "fasttap_reset") {
        resetAt++;
        my = 0;
        other = 0;
      }
      if (p.kind === "fasttap_tap") {
        const by = p.by.toLowerCase();
        if (by === me) my++;
        else if (by === otherUserId.toLowerCase()) other++;
      }
    }
    return { my, other, resetAt };
  }, [allMessages, gameId, me, otherUserId]);

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

  const lead =
    state.my === state.other ? "تعادل" : state.my > state.other ? "إنت متقدم" : "الطرف التاني متقدم";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden">
      <div className="p-3 bg-gradient-to-r from-amber-500/20 to-red-500/20">
        <div className="text-[13px] font-black text-white">⚡ النقر السريع</div>
        <div className="text-[11px] text-white/70 mt-0.5">مين يضغط أكتر… من غير ما يزهق.</div>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-xl border border-white/10 bg-black/30 p-2">
            <div className="text-white/60 mb-1">إنت</div>
            <div className="text-white font-black text-[18px]">{state.my}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-2">
            <div className="text-white/60 mb-1">الطرف التاني</div>
            <div className="text-white font-black text-[18px]">{state.other}</div>
          </div>
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

