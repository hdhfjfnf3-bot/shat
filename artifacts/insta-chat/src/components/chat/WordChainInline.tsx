import { useMemo, useState } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, AlertCircle, RefreshCcw, Send, PlayCircle } from "lucide-react";

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
  try { return JSON.parse(s) as T; } catch { return null; }
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
  const [isFocused, setIsFocused] = useState(false);

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
    return <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">رسالة لعبة غير صالحة.</div>;
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

  const themeColor = myTurn ? "#10b981" : "#a8a8a8"; // Emerald for active turn

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="rounded-[32px] border border-white/10 bg-black/60 backdrop-blur-3xl overflow-hidden w-full max-w-[340px] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] font-sans relative isolate hardware-accelerated mx-auto"
    >
      {/* Ambient background glow */}
      <AnimatePresence>
        {myTurn && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.15 }} 
            className="absolute top-0 right-0 w-full h-[150px] bg-[#10b981] blur-[80px] -z-10 pointer-events-none" 
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#10b981]/10 to-transparent border-b border-white/[0.05] p-4 backdrop-blur-md relative z-10 flex items-start justify-between">
        <div>
          <div className="text-[15px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a8a8a8] tracking-widest uppercase drop-shadow-md flex items-center gap-2">
            <Link2 className="w-4 h-4 text-white" /> 
            سلسلة كلمات
          </div>
          <div className="text-[11px] mt-1.5 font-bold flex flex-wrap gap-1.5 items-center">
            <span className="bg-white/10 px-2 py-0.5 rounded-md text-white/80">{start.rule}</span>
            <span className={`px-2 py-0.5 rounded-md border ${myTurn ? "bg-[#10b981]/20 border-[#10b981]/50 text-[#10b981]" : "bg-white/5 border-white/10 text-white/50"}`}>
              {myTurn ? "دورك الآن" : `دور ${currentTurnPlayer.split(" ")[0]}`}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 relative z-10 flex flex-col gap-4">
        
        {/* Last Word Display */}
        <motion.div 
          key={last ? last.word : 'start'}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-[20px] p-4 text-center border relative overflow-hidden shadow-inner ${last ? "bg-[#10b981]/10 border-[#10b981]/20" : "bg-white/5 border-white/10"}`}
        >
          {last && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#10b981] to-transparent opacity-50" />}
          
          <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">الكلمة الحالية</div>
          <div className="text-[24px] font-black text-white drop-shadow-md tracking-wide">
            {last ? last.word : "ابدأ بكلمة"}
          </div>
          
          {need && (
            <div className="text-[12px] font-bold mt-2 inline-flex items-center gap-1 bg-black/40 px-3 py-1 rounded-full border border-white/5 text-[#10b981]">
              <PlayCircle className="w-3.5 h-3.5" />
              لازم تبدأ بـ: "{need}"
            </div>
          )}
        </motion.div>

        {/* Input Area */}
        <div className="relative">
          <div className={`flex items-center gap-2 bg-black/40 border transition-all duration-300 rounded-[18px] p-1.5 ${isFocused ? "border-[#10b981]/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "border-white/10"}`}>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={need ? `اكتب كلمة بتبدأ بـ ${need}...` : "اكتب كلمة..."}
              className="flex-1 bg-transparent px-3 py-2.5 text-[14px] font-bold text-white outline-none placeholder:text-white/30 placeholder:font-medium"
              disabled={!myTurn}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !error && word.trim()) play();
              }}
            />
            <motion.button
              whileHover={myTurn && !error && word.trim() ? { scale: 1.05 } : {}}
              whileTap={myTurn && !error && word.trim() ? { scale: 0.95 } : {}}
              onClick={play}
              disabled={!myTurn || Boolean(error) || !word.trim()}
              className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all ${
                myTurn && !error && word.trim()
                  ? "bg-gradient-to-br from-[#10b981] to-[#059669] text-white shadow-[0_5px_15px_rgba(16,185,129,0.4)]"
                  : "bg-white/5 text-white/30 cursor-not-allowed border border-white/5"
              }`}
            >
              <Send className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" />
            </motion.button>
          </div>
          
          {/* Error Message */}
          <AnimatePresence>
            {error && word.trim().length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="absolute -bottom-8 right-0 left-0 flex justify-center"
              >
                <div className="bg-[#ff4d4f]/90 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-md border border-[#ff4d4f]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-between items-center text-[12px] font-bold text-[#888] bg-black/20 px-3 py-2 rounded-xl border border-white/5">
          <div className="flex items-center gap-1.5 text-white/70">
            <span className="bg-white/10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white shadow-inner">{plays.length}</span>
            <span>كلمات ملعوبة</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={reset}
            className="flex items-center gap-1.5 text-[#a8a8a8] hover:text-white transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            إعادة
          </motion.button>
        </div>

      </div>
    </motion.div>
  );
}
