import { useMemo, useState } from "react";

import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";

type QndStartPayload = {
  kind: "qnd_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
  mode: "mix" | "questions" | "dares";
  level: "خفيف" | "تقيل";
  safeMode: boolean;
};

type QndNextPayload = {
  kind: "qnd_next";
  gameId: string;
  by: string;
  at: string;
};

type Payload = QndStartPayload | QndNextPayload;

type Card = {
  type: "سؤال" | "تحدي";
  level: "خفيف" | "تقيل";
  safe: boolean;
  text: string;
};

const CARDS: Card[] = [
  // أسئلة (خفيف)
  { type: "سؤال", level: "خفيف", safe: true, text: "لو معاك زرار يوقف الزمن 10 دقايق… هتعمل إيه؟" },
  { type: "سؤال", level: "خفيف", safe: true, text: "أحلى حاجة بتفرّحك من غير فلوس؟" },
  { type: "سؤال", level: "خفيف", safe: true, text: "مين أكتر مطرب/أغنية بتظبطلك المود؟" },
  { type: "سؤال", level: "خفيف", safe: true, text: "لو هنطلع خروجة دلوقتي حالًا… نروح فين؟ وليه؟" },
  { type: "سؤال", level: "خفيف", safe: true, text: "إيه أكتر حاجة بتضحكك حتى لو مضايق؟" },
  // أسئلة (تقيل)
  { type: "سؤال", level: "تقيل", safe: true, text: "إيه حاجة نفسك تحققها السنة دي ومحتاج دعم فيها؟" },
  { type: "سؤال", level: "تقيل", safe: true, text: "إيه أكتر عادة صغيرة لو اتغيرت هتخلي حياتك أهدى؟" },
  { type: "سؤال", level: "تقيل", safe: true, text: "إيه حدودك اللي بتحب تبقى واضحة في العلاقة؟" },
  { type: "سؤال", level: "تقيل", safe: false, text: "إيه أكتر حاجة بتخوفك تخسرها؟ (قولها براحة)" },

  // تحديات (خفيف)
  { type: "تحدي", level: "خفيف", safe: true, text: "قلّدو بعض 20 ثانية… اللي يضحك الأول يخسر." },
  { type: "تحدي", level: "خفيف", safe: true, text: "صوّروا ڤويس 10 ثواني تقولوا فيه جملة حلوة لبعض (من غير كسوف)." },
  { type: "تحدي", level: "خفيف", safe: true, text: "اعملوا سيلفي غريبة (وش جد) وخلوها ذكرى." },
  { type: "تحدي", level: "خفيف", safe: true, text: "اختار كلمة… والتاني يطلع 3 مرادفات بسرعة خلال 7 ثواني." },
  { type: "تحدي", level: "خفيف", safe: true, text: "اكتبوا لكل واحد 3 حاجات ممتنين ليها النهارده." },

  // تحديات (تقيل)
  { type: "تحدي", level: "تقيل", safe: true, text: "كل واحد يقول للتاني حاجة واحدة محتاجها الأيام دي… في جملة واحدة." },
  { type: "تحدي", level: "تقيل", safe: true, text: "اتفقوا على عادة صغيرة تعملوها الأسبوع ده (5 دقايق يوميًا) واكتبوا ده في الشات." },
  { type: "تحدي", level: "تقيل", safe: false, text: "شارك ذكرى صعبة اتعلمت منها حاجة… لو مش جاهز قول (ستوب) عادي." },
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

function pickCard(start: QndStartPayload, index: number): Card {
  const filtered = CARDS.filter((c) => {
    if (start.safeMode && !c.safe) return false;
    if (c.level !== start.level) return false;
    if (start.mode === "questions") return c.type === "سؤال";
    if (start.mode === "dares") return c.type === "تحدي";
    return true;
  });
  const list = filtered.length ? filtered : CARDS.filter((c) => (start.safeMode ? c.safe : true));
  const seed = hashSeed(`${start.gameId}:${index}:${start.mode}:${start.level}:${start.safeMode ? "safe" : "all"}`);
  return list[seed % list.length]!;
}

export function QnDInlineGame({
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

  const start = useMemo(() => safeJsonParse<QndStartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "qnd_start" ? start.gameId : null;

  const step = useMemo(() => {
    if (!gameId) return 0;
    let n = 0;
    for (const m of allMessages) {
      if (m.type !== "game") continue;
      const p = safeJsonParse<Payload>(m.content);
      if (!p || p.gameId !== gameId) continue;
      if (p.kind === "qnd_next") n++;
    }
    return n;
  }, [allMessages, gameId]);

  const [collapsed, setCollapsed] = useState(false);

  if (!start || !gameId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
        رسالة لعبة أسئلة/تحديات غير صالحة.
      </div>
    );
  }

  const card = pickCard(start, step);
  const badge =
    card.type === "سؤال"
      ? "bg-sky-500/15 text-sky-200 border-sky-500/25"
      : "bg-amber-500/15 text-amber-200 border-amber-500/25";

  const next = () => {
    const payload: QndNextPayload = { kind: "qnd_next", gameId, by: me, at: new Date().toISOString() };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121212] overflow-hidden">
      <div className="p-3 bg-gradient-to-r from-[#0f172a] to-[#111827]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-black text-white">🎭 أسئلة وتحديات</div>
            <div className="text-[11px] text-white/70 mt-0.5">
              مود: {start.mode === "mix" ? "ميكس" : start.mode === "questions" ? "أسئلة" : "تحديات"} • مستوى: {start.level} •
              {start.safeMode ? " آمن" : " مفتوح"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((s) => !s)}
            className="text-[11px] text-white/60 hover:text-white transition-colors"
            title="تصغير"
          >
            {collapsed ? "افتح" : "صغّر"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badge}`}>{card.type}</span>
            <span className="text-[11px] text-white/50"># {step + 1}</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="text-[14px] font-semibold text-white leading-relaxed">{card.text}</div>
            {!card.safe && (
              <div className="text-[11px] text-white/50 mt-2">
                لو مش مرتاح… قول (ستوب) عادي جدًا.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={next}
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15 py-2 text-[13px] font-black text-white transition-colors"
            >
              التالي
            </button>
            <button
              type="button"
              onClick={() => {
                // quick "ack" to keep the chat lively without forcing anything
                sendMessage(conversationId, "🔥 يلا بينا", "text");
              }}
              className="rounded-xl border border-white/10 bg-[#00d26a]/10 hover:bg-[#00d26a]/15 active:bg-[#00d26a]/20 py-2 text-[13px] font-black text-[#7CFFB7] transition-colors"
            >
              يلا
            </button>
          </div>

          <div className="text-[11px] text-white/45">
            {participants && participants.length > 0 
              ? "تبادلوا الدور: كل واحد يسحب سؤال أو تحدي بالدور."
              : "تبادلوا الدور: مرة سؤال/تحدي عليك… ومرة على الطرف التاني."}
          </div>
        </div>
      )}
    </div>
  );
}

