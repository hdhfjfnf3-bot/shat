import { useMemo } from "react";
import { Message, CURRENT_USER } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import { Gamepad2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

type HubPayload = { kind: "hub"; hubId: string; createdAt: string; };
type RpsStartPayload = { kind: "rps"; gameId: string; createdBy: string; createdAt: string; bestOf: 3 | 5; };
type SlStartPayload = { kind: "sl_start"; gameId: string; createdBy: string; createdAt: string; };
type XoStartPayload = { kind: "xo_start"; gameId: string; createdBy: string; };
type DbStartPayload = { kind: "db_start"; gameId: string; createdBy: string; gridSize: number; };
type C4StartPayload = { kind: "c4_start"; gameId: string; createdBy: string; };
type DominoStartPayload = { kind: "domino_start"; gameId: string; createdBy: string; };
type QndStartPayload = { kind: "qnd_start"; gameId: string; createdBy: string; createdAt: string; mode: "mix" | "questions" | "dares"; level: "خفيف" | "تقيل"; safeMode: boolean; };
type WyrStartPayload = { kind: "wyr_start"; gameId: string; createdBy: string; createdAt: string; };
type NhiStartPayload = { kind: "nhi_start"; gameId: string; createdBy: string; createdAt: string; };
type ScrambleStartPayload = { kind: "scramble_start"; gameId: string; createdBy: string; createdAt: string; };
type LoveCalcStartPayload = { kind: "lovecalc_start"; gameId: string; createdBy: string; createdAt: string; };
type EmojiPictStartPayload = { kind: "emoji_pict_start"; gameId: string; createdBy: string; createdAt: string; };
type FastTapStartPayload = { kind: "fasttap_start"; gameId: string; createdBy: string; createdAt: string; };
type WheelStartPayload = { kind: "wheel_start"; gameId: string; createdBy: string; createdAt: string; preset: "ضحك" | "رومانسية" | "ميكس"; };
type WordChainStartPayload = { kind: "wordchain_start"; gameId: string; createdBy: string; createdAt: string; rule: "آخر حرف" | "آخر حرفين"; };
type BankStartPayload = { kind: "bank_start"; gameId: string; createdBy: string; createdAt: string; token: "🚗" | "🏎️" | "🚕" | "🛻"; };
type CardsStartPayload = { kind: "cards_start"; gameId: string; createdBy: string; createdAt: string; mode: "war" | "high_card"; };
type ChessStartPayload = { kind: "chess_start"; gameId: string; createdBy: string; createdAt: string; };
type SeegaStartPayload = { kind: "seega_start"; gameId: string; createdBy: string; createdAt: string; };
type MemoryStartPayload = { kind: "memory_start"; gameId: string; createdBy: string; createdAt: string; deck: string[]; };
type HangmanStartPayload = { kind: "hangman_start"; gameId: string; createdBy: string; createdAt: string; word: string; category: string; };

const ARABIC_WORDS = [
  { w: "مصر", c: "دولة" }, { w: "مبرمج", c: "وظيفة" }, { w: "شطرنج", c: "لعبة" },
  { w: "كرة قدم", c: "رياضة" }, { w: "قهوة", c: "مشروب" }, { w: "انترنت", c: "تكنولوجيا" },
  { w: "طيارة", c: "مركبة" }, { w: "سيارة", c: "مركبة" }, { w: "اسكندرية", c: "مدينة" }
];

function generateMemoryDeck() {
  const EMOJIS = ["🐱", "🦊", "🐶", "🐰", "🐼", "🐨", "🐸", "🐵"];
  const deck = [...EMOJIS, ...EMOJIS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 20 } }
};

function GameCard({
  icon, title, isNew, isTrend, onClick,
}: {
  icon: string; title: string; isNew?: boolean; isTrend?: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      variants={cardVariants}
      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.08)" }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative flex flex-col items-center justify-center aspect-square rounded-[22px] bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.2] transition-colors overflow-hidden group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
    >
      <div className="text-[34px] mb-2 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 drop-shadow-xl">
        {icon}
      </div>
      <span className="text-[11px] font-black tracking-wide text-white/90 leading-tight text-center px-2 w-full drop-shadow-md">
        {title}
      </span>
      {isNew && (
        <div className="absolute top-2 left-2 bg-gradient-to-tr from-[#ff0844] to-[#ffb199] text-white text-[9px] font-bold px-1.5 py-[1px] rounded-full shadow-[0_2px_10px_rgba(255,8,68,0.5)]">
          جديد
        </div>
      )}
      {isTrend && !isNew && (
        <div className="absolute top-2 left-2 bg-gradient-to-tr from-[#f093fb] to-[#f5576c] text-white text-[9px] font-bold px-1.5 py-[1px] rounded-full shadow-[0_2px_10px_rgba(240,147,251,0.5)] flex items-center gap-0.5">
          تريند <Sparkles className="w-2 h-2" />
        </div>
      )}
    </motion.button>
  );
}

export function GameHubInline({
  hubMessage, conversationId, isGroup, participants = [],
}: {
  hubMessage: Message; conversationId: string; isGroup?: boolean; participants?: import("@/lib/types").User[];
}) {
  const { sendMessage } = useChatStore();
  const payload = useMemo(() => safeJsonParse<HubPayload>(hubMessage.content), [hubMessage.content]);

  const send = (obj: unknown) => {
    sendMessage(conversationId, JSON.stringify(obj), "game");
  };

  if (!payload || payload.kind !== "hub") {
    return (
      <div className="rounded-[24px] border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
        رسالة صالة ألعاب غير صالحة.
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="w-[300px] sm:w-[340px] rounded-[32px] border border-white/10 bg-black/60 backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.1)] overflow-hidden p-5"
    >
      {/* Premium Header */}
      <div className="flex items-center gap-3.5 mb-5 relative">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#4f46e5]/30 rounded-full blur-[40px] pointer-events-none" />
        <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-[#a78bfa]/20 to-[#4f46e5]/20 flex items-center justify-center border border-[#a78bfa]/30 shadow-[0_0_20px_rgba(167,139,250,0.2)] shrink-0 z-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
          <Gamepad2 className="w-6 h-6 text-[#a78bfa] drop-shadow-md" />
        </div>
        <div className="z-10">
          <div className="text-[17px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-[#a78bfa] tracking-wide drop-shadow-sm">
            صالة الألعاب الـ VIP
          </div>
          <div className="text-[12px] font-bold text-[#a8a8a8] mt-[2px]">
            اختار لعبة والعبوا جوه الشات!
          </div>
        </div>
      </div>

      {/* Grid with stagger animations */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-3 gap-2.5 relative z-10">
        <GameCard
          icon="🎭" title="تحديات" isNew
          onClick={() => send({ kind: "qnd_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString(), mode: "mix", level: "خفيف", safeMode: true } as QndStartPayload)}
        />
        <GameCard
          icon="⚖️" title="لو خيروك" isNew
          onClick={() => send({ kind: "wyr_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString() } as WyrStartPayload)}
        />
        <GameCard
          icon="🚫" title="عمرك عملت" isTrend
          onClick={() => send({ kind: "nhi_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString() } as NhiStartPayload)}
        />
        <GameCard
          icon="💖" title="مقياس الحب" isTrend
          onClick={() => send({ kind: "lovecalc_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString() } as LoveCalcStartPayload)}
        />
        <GameCard
          icon="🧩" title="إيموجيز"
          onClick={() => send({ kind: "emoji_pict_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString() } as EmojiPictStartPayload)}
        />
        <GameCard
          icon="⚡" title="النقر السريع"
          onClick={() => send({ kind: "fasttap_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString() } as FastTapStartPayload)}
        />
        <GameCard
          icon="🎡" title="عجلة الحظ"
          onClick={() => send({ kind: "wheel_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString(), preset: "ميكس" } as WheelStartPayload)}
        />
        <GameCard
          icon="🔠" title="فك الشفرة"
          onClick={() => send({ kind: "scramble_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString() } as ScrambleStartPayload)}
        />
        <GameCard
          icon="🔗" title="كلمات"
          onClick={() => send({ kind: "wordchain_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString(), rule: "آخر حرف" } as WordChainStartPayload)}
        />

        {!isGroup && (
          <>
            <GameCard
              icon="🧠" title="الذاكرة" isNew
              onClick={() => send({ kind: "memory_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString(), deck: generateMemoryDeck() } as MemoryStartPayload)}
            />
            <GameCard
              icon="🪢" title="المشنقة" isNew
              onClick={() => {
                const w = ARABIC_WORDS[Math.floor(Math.random() * ARABIC_WORDS.length)];
                send({ kind: "hangman_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString(), word: w.w, category: w.c } as HangmanStartPayload);
              }}
            />
            <GameCard
              icon="🏜️" title="سيجا" isTrend
              onClick={() => send({ kind: "seega_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString() } as SeegaStartPayload)}
            />
            <GameCard
              icon="♟️" title="شطرنج" isNew
              onClick={() => send({ kind: "chess_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString() } as ChessStartPayload)}
            />
            <GameCard
              icon="🎲" title="مقص"
              onClick={() => send({ kind: "rps", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString(), bestOf: 3 } as RpsStartPayload)}
            />
            <GameCard
              icon="❌" title="إكس أو"
              onClick={() => send({ kind: "xo_start", gameId: newId(), createdBy: CURRENT_USER.username } as XoStartPayload)}
            />
            <GameCard
              icon="🔴" title="4 في صف"
              onClick={() => send({ kind: "c4_start", gameId: newId(), createdBy: CURRENT_USER.username } as C4StartPayload)}
            />
            <GameCard
              icon="✍️" title="مربعات"
              onClick={() => send({ kind: "db_start", gameId: newId(), createdBy: CURRENT_USER.username, gridSize: 4 } as DbStartPayload)}
            />
            <GameCard
              icon="🀄" title="ضومنة"
              onClick={() => send({ kind: "domino_start", gameId: newId(), createdBy: CURRENT_USER.username } as DominoStartPayload)}
            />
            <GameCard
              icon="⚔️" title="حرب أوراق"
              onClick={() => send({ kind: "cards_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString(), mode: "war" } as CardsStartPayload)}
            />
            <GameCard
              icon="🃏" title="أعلى ورقة"
              onClick={() => send({ kind: "cards_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString(), mode: "high_card" } as CardsStartPayload)}
            />
          </>
        )}

        {(!isGroup || participants.length <= 5) && (
          <GameCard
            icon="🐍" title="ثعبان"
            onClick={() => send({ kind: "sl_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString() } as SlStartPayload)}
          />
        )}

        {(!isGroup || participants.length <= 3) && (
          <GameCard
            icon="🏦" title="بنك الحظ"
            onClick={() => {
              const tokens: BankStartPayload["token"][] = ["🚗", "🏎️", "🚕", "🛻"];
              send({ kind: "bank_start", gameId: newId(), createdBy: CURRENT_USER.username, createdAt: new Date().toISOString(), token: tokens[Math.floor(Math.random() * tokens.length)]! } as BankStartPayload);
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

