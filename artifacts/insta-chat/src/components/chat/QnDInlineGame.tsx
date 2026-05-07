import { useMemo, useState } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, HelpCircle, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";

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
  { type: "سؤال", level: "خفيف", safe: true, text: "مين أكتر حد بتثق فيه وتقوله كل أسرارك؟" },
  { type: "سؤال", level: "خفيف", safe: true, text: "لو هتمسح فترة من حياتك هتمسح إيه؟" },
  { type: "سؤال", level: "خفيف", safe: true, text: "إيه أكتر موقف محرج حصلك ومستحيل تنساه؟" },
  { type: "سؤال", level: "خفيف", safe: true, text: "إيه أسوأ كدبة كدبتها ومحدش اكتشفها لحد دلوقتي؟" },
  { type: "سؤال", level: "خفيف", safe: true, text: "إيه أكتر أكلة ممكن تاكلها كل يوم من غير ما تزهق؟" },
  { type: "سؤال", level: "خفيف", safe: true, text: "مين الممثل اللي تحب تعيش قصة فيلمه؟" },
  { type: "سؤال", level: "خفيف", safe: true, text: "لو صحيت لقيت نفسك بقيت مليونير... إيه أول حاجة هتشتريها؟" },
  { type: "سؤال", level: "خفيف", safe: true, text: "لو هتوصف نفسك في 3 كلمات هيبقوا إيه؟" },

  // أسئلة (تقيل)
  { type: "سؤال", level: "تقيل", safe: true, text: "إيه حاجة نفسك تحققها السنة دي ومحتاج دعم فيها؟" },
  { type: "سؤال", level: "تقيل", safe: true, text: "إيه أكتر عادة صغيرة لو اتغيرت هتخلي حياتك أهدى؟" },
  { type: "سؤال", level: "تقيل", safe: true, text: "إيه حدودك اللي بتحب تبقى واضحة في العلاقة؟" },
  { type: "سؤال", level: "تقيل", safe: false, text: "إيه أكتر حاجة بتخوفك تخسرها؟ (قولها براحة)" },
  { type: "سؤال", level: "تقيل", safe: false, text: "مين الشخص اللي ندمت إنك عرفته؟" },
  { type: "سؤال", level: "تقيل", safe: false, text: "إمتى آخر مرة عيطت فيها لوحدك؟ وليه؟" },
  { type: "سؤال", level: "تقيل", safe: true, text: "لو رجع بيك الزمن 5 سنين.. إيه القرار اللي هتغيره؟" },
  { type: "سؤال", level: "تقيل", safe: false, text: "إيه أكبر غلطة عملتها في حق حد بتحبه؟" },
  { type: "سؤال", level: "تقيل", safe: true, text: "بتحس بإيه لما تبص في المراية وتشوف نفسك دلوقتي؟" },
  { type: "سؤال", level: "تقيل", safe: false, text: "سر عمرك ما قلته لأي حد في الدنيا؟" },

  // تحديات (خفيف)
  { type: "تحدي", level: "خفيف", safe: true, text: "قلّدو بعض 20 ثانية… اللي يضحك الأول يخسر." },
  { type: "تحدي", level: "خفيف", safe: true, text: "صوّروا ڤويس 10 ثواني تقولوا فيه جملة حلوة لبعض (من غير كسوف)." },
  { type: "تحدي", level: "خفيف", safe: true, text: "اعملوا سيلفي غريبة (وش جد) وخلوها ذكرى." },
  { type: "تحدي", level: "خفيف", safe: true, text: "اختار كلمة… والتاني يطلع 3 مرادفات بسرعة خلال 7 ثواني." },
  { type: "تحدي", level: "خفيف", safe: true, text: "اكتبوا لكل واحد 3 حاجات ممتنين ليها النهارده." },
  { type: "تحدي", level: "خفيف", safe: true, text: "ابعت فويس نوت بتغني فيها أغنية طفولية بصوت عالي." },
  { type: "تحدي", level: "خفيف", safe: true, text: "قلد رقصه مشهوره وابعتها فيديو." },
  { type: "تحدي", level: "خفيف", safe: true, text: "حط الموبايل على راسك وحاول تمشي خط مستقيم 10 خطوات." },

  // تحديات (تقيل)
  { type: "تحدي", level: "تقيل", safe: true, text: "كل واحد يقول للتاني حاجة واحدة محتاجها الأيام دي… في جملة واحدة." },
  { type: "تحدي", level: "تقيل", safe: true, text: "اتفقوا على عادة صغيرة تعملوها الأسبوع ده (5 دقايق يوميًا) واكتبوا ده في الشات." },
  { type: "تحدي", level: "تقيل", safe: false, text: "شارك ذكرى صعبة اتعلمت منها حاجة… لو مش جاهز قول (ستوب) عادي." },
  { type: "تحدي", level: "تقيل", safe: false, text: "ابعت آخر سكرين شوت أخدتها على موبايلك من غير ما تعدلها." },
  { type: "تحدي", level: "تقيل", safe: false, text: "كلم حد متعرفوش كويس وقوله (أنا عارف السر اللي مخبيه) واقفل." },
  { type: "تحدي", level: "تقيل", safe: false, text: "حط صورة مضحكة ليك ستوري لمدة ساعة." },
  { type: "تحدي", level: "تقيل", safe: false, text: "ورّي الطرف التاني آخر شات بينك وبين شخص متعرفوش كويس." }
];

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
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
  const baseSeed = hashSeed(`${start.gameId}:${start.mode}:${start.level}`);
  return list[(baseSeed + index) % list.length]!;
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
  const [flipDirection, setFlipDirection] = useState(1);

  if (!start || !gameId) {
    return <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">رسالة لعبة غير صالحة.</div>;
  }

  const card = pickCard(start, step);
  const isQuestion = card.type === "سؤال";
  
  const themeColors = isQuestion 
    ? { primary: "#00d2ff", secondary: "#3a7bd5", gradient: "from-[#00d2ff] to-[#3a7bd5]" }
    : { primary: "#ff9d00", secondary: "#ff0844", gradient: "from-[#ff9d00] to-[#ff0844]" };

  const next = () => {
    setFlipDirection(flipDirection * -1);
    const payload: QndNextPayload = { kind: "qnd_next", gameId, by: me, at: new Date().toISOString() };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="rounded-[32px] border border-white/10 bg-black/60 backdrop-blur-3xl overflow-hidden w-full max-w-[340px] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] font-sans relative isolate hardware-accelerated mx-auto"
    >
      {/* Ambient background glow */}
      <motion.div 
        animate={{ opacity: [0.1, 0.25, 0.1], scale: [1, 1.1, 1] }} 
        transition={{ repeat: Infinity, duration: 3 }}
        className="absolute top-0 left-0 w-full h-[150px] blur-[80px] -z-10"
        style={{ backgroundColor: themeColors.primary }}
      />

      {/* Header */}
      <div className="bg-white/5 border-b border-white/[0.05] p-4 backdrop-blur-md relative z-10 flex items-start justify-between">
        <div>
          <div className="text-[15px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a8a8a8] tracking-widest uppercase drop-shadow-md flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" /> 
            أسئلة وتحديات
          </div>
          <div className="text-[11px] text-[#a8a8a8] mt-1.5 font-bold flex flex-wrap gap-1.5 items-center">
            <span className="bg-white/10 px-2 py-0.5 rounded-md text-white/80">{start.mode === "mix" ? "ميكس" : start.mode === "questions" ? "أسئلة" : "تحديات"}</span>
            <span className="bg-white/10 px-2 py-0.5 rounded-md text-white/80">{start.level}</span>
            <span className={`px-2 py-0.5 rounded-md text-white/90 ${start.safeMode ? "bg-[#00d26a]/30" : "bg-[#ff4d4f]/30"}`}>
              {start.safeMode ? "آمن" : "مفتوح"}
            </span>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setCollapsed((s) => !s)}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white border border-white/10 shadow-inner"
        >
          {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="p-5 relative z-10"
          >
            {/* The 3D Card */}
            <div className="relative preserve-3d perspective-[1000px] mb-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ rotateY: 90 * flipDirection, opacity: 0, scale: 0.9 }}
                  animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                  exit={{ rotateY: -90 * flipDirection, opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className={`w-full min-h-[160px] rounded-[24px] bg-gradient-to-br ${themeColors.gradient} p-[2px] shadow-[0_20px_40px_rgba(0,0,0,0.6)]`}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="bg-black/60 backdrop-blur-xl w-full h-full rounded-[22px] p-5 flex flex-col items-center justify-center text-center relative border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] isolate">
                    
                    {/* Card Inner Glow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-[22px] -z-10" />
                    
                    <div className="absolute top-3 left-4 right-4 flex justify-between items-center">
                      <span className="text-[10px] font-black tracking-widest text-white/50 uppercase">بطاقة #{step + 1}</span>
                      <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]`} style={{ color: themeColors.primary, backgroundColor: themeColors.primary }} />
                    </div>

                    <div className="mb-3 mt-4">
                      {isQuestion ? (
                        <HelpCircle className="w-10 h-10 text-white drop-shadow-md opacity-90" />
                      ) : (
                        <Sparkles className="w-10 h-10 text-white drop-shadow-md opacity-90" />
                      )}
                    </div>

                    <div className="text-[17px] font-black text-white leading-relaxed drop-shadow-lg mb-2">
                      {card.text}
                    </div>

                    {!card.safe && (
                      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#ff4d4f] font-bold bg-[#ff4d4f]/10 px-3 py-1.5 rounded-full border border-[#ff4d4f]/30 backdrop-blur-md">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        لو مش مرتاح… قول (ستوب) عادي جداً
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  sendMessage(conversationId, "🔥 يلا بينا", "text");
                }}
                className="flex-1 py-3.5 rounded-[16px] bg-white/10 border border-white/10 text-white font-black text-[14px] hover:bg-white/20 transition-colors shadow-inner"
              >
                يلا بينا
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: `0 10px 20px ${themeColors.primary}40` }}
                whileTap={{ scale: 0.95 }}
                onClick={next}
                className={`flex-1 py-3.5 rounded-[16px] bg-gradient-to-r ${themeColors.gradient} text-white font-black text-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] relative overflow-hidden`}
              >
                بطاقة تانية
              </motion.button>
            </div>

            <div className="text-[11px] text-[#888] font-bold text-center mt-4 uppercase tracking-widest">
              {participants && participants.length > 0 
                ? "العبوا بالدور يا جماعة"
                : "تبادلوا الأدوار بكل صراحة"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
