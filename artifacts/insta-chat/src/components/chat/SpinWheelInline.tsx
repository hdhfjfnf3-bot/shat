import { useMemo, useState } from "react";

import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";

type StartPayload = {
  kind: "wheel_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
  preset: "ضحك" | "رومانسية" | "ميكس";
};

type SpinPayload = {
  kind: "wheel_spin";
  gameId: string;
  by: string;
  at: string;
};

type Payload = StartPayload | SpinPayload;

const PRESETS: Record<StartPayload["preset"], string[]> = {
  ضحك: [
    "قلّد صوت مذيع 10 ثواني",
    "اعمل وش جد في سيلفي",
    "قول كلمة… والتاني يطلع 3 مرادفات في 5 ثواني",
    "غنّي كلمة واحدة بس من أغنية",
    "اختار فلتر تخيلي ووصفه",
    "احكي موقف محرج في سطرين",
  ],
  رومانسية: [
    "قول 3 حاجات بتحبها فيه/فيها",
    "رسالة صوتية 8 ثواني: (أنا مبسوط عشان…)",
    "وعد صغير للأسبوع ده",
    "قولي أكتر حاجة بتريحك لما تتعب",
    "اختاروا خروجة بسيطة وتحددوا يومها",
    "كلمة سر لطيفة بينكم",
  ],
  ميكس: [
    "قلّد صوت مذيع 10 ثواني",
    "قول 3 حاجات بتحبها فيه/فيها",
    "احكي موقف محرج في سطرين",
    "وعد صغير للأسبوع ده",
    "غنّي كلمة واحدة بس من أغنية",
    "رسالة صوتية 8 ثواني: (أنا مبسوط عشان…)",
  ],
};

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

export function SpinWheelInline({
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
  const [spinning, setSpinning] = useState(false);
  const [spinAngle, setSpinAngle] = useState(0);

  const start = useMemo(() => safeJsonParse<StartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "wheel_start" ? start.gameId : null;

  const spins = useMemo(() => {
    if (!gameId) return 0;
    let n = 0;
    for (const m of allMessages) {
      if (m.type !== "game") continue;
      const p = safeJsonParse<Payload>(m.content);
      if (!p || p.gameId !== gameId) continue;
      if (p.kind === "wheel_spin") n++;
    }
    return n;
  }, [allMessages, gameId]);

  if (!start || !gameId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
        رسالة عجلة الحظ غير صالحة.
      </div>
    );
  }

  const items = PRESETS[start.preset];
  const seed = hashSeed(`${gameId}:${spins}`);
  const pickedIndex = seed % items.length;
  const picked = items[pickedIndex]!;

  const p1 = start.createdBy.toLowerCase();
  const p2 = p1 === me ? otherUserId.toLowerCase() : me;
  const myTurn = (spins % 2 === 0 ? p1 : p2) === me;

  const spin = () => {
    if (!myTurn || spinning) return;
    setSpinning(true);
    const extra = 720 + (seed % 360);
    setSpinAngle((a) => a + extra);
    setTimeout(() => {
      const payload: SpinPayload = { kind: "wheel_spin", gameId, by: me, at: new Date().toISOString() };
      sendMessage(conversationId, JSON.stringify(payload), "game");
      setSpinning(false);
    }, 900);
  };

  const slices = items.length;
  const sliceDeg = 360 / slices;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden">
      <div className="p-3 bg-gradient-to-r from-rose-500/20 to-indigo-500/20">
        <div className="text-[13px] font-black text-white">🎡 عجلة الحظ</div>
        <div className="text-[11px] text-white/70 mt-0.5">
          بريسِت: {start.preset} • {myTurn ? "دورك" : "دور الطرف التاني"}
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-white/80 drop-shadow" />
            <div
              className="w-full max-w-[300px] aspect-square rounded-full border border-white/10 bg-black/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.6)] relative overflow-hidden mx-auto"
              style={{
                transform: `rotate(${spinAngle}deg)`,
                transition: spinning ? "transform 0.9s cubic-bezier(.2,.8,.2,1)" : undefined,
              }}
            >
              {items.map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-0"
                  style={{
                    transform: `rotate(${i * sliceDeg}deg)`,
                  }}
                >
                  <div
                    className="absolute left-1/2 top-1/2 origin-left"
                    style={{
                      width: "50%",
                      height: 2,
                      background: "rgba(255,255,255,0.08)",
                      transform: "translateY(-1px)",
                    }}
                  />
                </div>
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 shadow" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="text-[11px] text-white/60 mb-1">النتيجة</div>
          <div className="text-[14px] font-semibold text-white leading-relaxed">{picked}</div>
        </div>

        <button
          type="button"
          onClick={spin}
          disabled={!myTurn || spinning}
          className={[
            "w-full rounded-xl border border-white/10 py-2 text-[13px] font-black transition-colors",
            myTurn && !spinning
              ? "bg-white/5 hover:bg-white/10 active:bg-white/15 text-white"
              : "bg-white/5 text-white/30 cursor-not-allowed",
          ].join(" ")}
        >
          {spinning ? "بتلف..." : "لف العجلة"}
        </button>
      </div>
    </div>
  );
}

