import { useMemo, useState, useEffect } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles } from "lucide-react";

type MemoryStartPayload = { kind: "memory_start"; gameId: string; createdBy: string; createdAt: string; deck: string[]; };
type MemoryFlipPayload = { kind: "memory_flip"; gameId: string; by: string; idx: number; at: string; };
type MemoryPayload = MemoryStartPayload | MemoryFlipPayload;

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

export function MemoryInline({ gameMessage, otherUserId, conversationId, allMessages, participants }: { gameMessage: Message; otherUserId: string; conversationId: string; allMessages: Message[]; participants?: import("@/lib/types").User[] }) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();

  const start = useMemo(() => safeJsonParse<MemoryStartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "memory_start" ? start.gameId : null;
  const deck = start?.kind === "memory_start" ? start.deck : [];

  const flips = useMemo(() => {
    if (!gameId) return [] as MemoryFlipPayload[];
    return allMessages
      .filter((m) => m.type === "game")
      .map((m) => safeJsonParse<MemoryPayload>(m.content))
      .filter((p): p is MemoryFlipPayload => p !== null && p.kind === "memory_flip" && p.gameId === gameId)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [allMessages, gameId]);

  const { p1, p2, p1Score, p2Score, matchedPairs, flippedIndices, turn, winner } = useMemo(() => {
    const player1 = start?.createdBy.toLowerCase() || "";
    const player2 = player1 === me ? otherUserId.toLowerCase() : me;
    
    let score1 = 0;
    let score2 = 0;
    let currentTurn = player1;
    let matched = new Set<number>();
    let currentlyFlipped: number[] = [];

    for (const flip of flips) {
      if (matched.has(flip.idx)) continue;
      
      // Prevent flipping more than 2
      if (currentlyFlipped.length === 2) {
        // Evaluate previous two
        const [a, b] = currentlyFlipped;
        if (deck[a] === deck[b]) {
          matched.add(a);
          matched.add(b);
          if (flip.by === player1) score1++;
          else score2++;
          // turn stays the same
        } else {
          currentTurn = currentTurn === player1 ? player2 : player1;
        }
        currentlyFlipped = [];
      }

      currentlyFlipped.push(flip.idx);
    }

    // Evaluate trailing flips if any
    let isWaitingForTimeout = false;
    if (currentlyFlipped.length === 2) {
      const [a, b] = currentlyFlipped;
      if (deck[a] === deck[b]) {
        matched.add(a);
        matched.add(b);
        // We don't know who flipped unless we look at the last flip's 'by'. Let's assume the currentTurn.
        if (currentTurn === player1) score1++;
        else score2++;
        currentlyFlipped = [];
      } else {
        isWaitingForTimeout = true;
      }
    }

    let win = null;
    if (matched.size === deck.length && deck.length > 0) {
      if (score1 > score2) win = player1;
      else if (score2 > score1) win = player2;
      else win = "draw";
    }

    // If waiting for timeout, the next player theoretically shouldn't play yet, but we handle that in UI.
    return {
      p1: player1,
      p2: player2,
      p1Score: score1,
      p2Score: score2,
      matchedPairs: matched,
      flippedIndices: currentlyFlipped,
      turn: currentTurn,
      winner: win
    };
  }, [flips, start, me, otherUserId, deck]);

  const myTurn = turn === me && !winner && flippedIndices.length < 2;

  const handleCardClick = (idx: number) => {
    if (!myTurn || winner) return;
    if (matchedPairs.has(idx) || flippedIndices.includes(idx)) return;
    
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
    sendMessage(conversationId, JSON.stringify({ kind: "memory_flip", gameId, by: me, idx, at: new Date().toISOString() }), "game");
  };

  if (!start || !gameId) return <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[#a8a8a8]">لعبة غير صالحة.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-[95vw] sm:w-[85vw] md:w-[400px] max-w-full rounded-[32px] border border-white/10 bg-gradient-to-br from-[#1e1b4b] to-[#312e81] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] font-sans relative isolate mx-auto"
    >
      <div className="bg-white/5 backdrop-blur-md p-4 flex justify-between items-center shadow-lg relative z-10 border-b border-white/[0.05]">
        <div>
          <div className="text-[16px] font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-indigo-300 tracking-wide flex items-center gap-2">
            <span>🧠</span> تطابق الذاكرة
          </div>
          <div className={`text-[12px] font-bold mt-1.5 ${winner ? "text-amber-400" : myTurn ? "text-emerald-400" : "text-white/40"}`}>
            {winner ? (winner === me ? "لقد فزت! 👑" : winner === "draw" ? "تعادل!" : "الخصم فاز!") : myTurn ? "دورك.. اختر كارتين" : "في انتظار الخصم..."}
          </div>
        </div>
      </div>

      <div className="p-5 relative flex justify-center bg-black/20">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {deck.map((emoji, idx) => {
            const isMatched = matchedPairs.has(idx);
            const isFlipped = isMatched || flippedIndices.includes(idx);
            
            return (
              <motion.div
                key={idx}
                onClick={() => handleCardClick(idx)}
                whileHover={!isFlipped && myTurn ? { scale: 1.05 } : {}}
                whileTap={!isFlipped && myTurn ? { scale: 0.95 } : {}}
                className={`relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl cursor-pointer perspective-1000`}
              >
                <motion.div 
                  className="w-full h-full relative preserve-3d"
                  initial={false}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  {/* Front (Hidden) */}
                  <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-500/40 to-purple-500/40 border border-white/20 rounded-2xl shadow-[inset_0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                    <Sparkles className="w-6 h-6 text-indigo-300/50" />
                  </div>
                  
                  {/* Back (Revealed) */}
                  <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-white to-indigo-50 border border-white/50 rounded-2xl shadow-[0_5px_15px_rgba(0,0,0,0.3)] flex items-center justify-center [transform:rotateY(180deg)]">
                    <span className={`text-3xl sm:text-4xl drop-shadow-md ${isMatched ? "opacity-50 grayscale transition-all duration-1000" : ""}`}>{emoji}</span>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="bg-black/40 border-t border-white/5 p-4 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-sm font-bold">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${turn === p1 && !winner ? "bg-indigo-500/20 border border-indigo-500/30" : "opacity-50"}`}>
          <span className={p1 === me ? "text-indigo-300" : "text-white"}>{p1 === me ? "أنت" : p1.split(" ")[0]}</span>
          <span className="text-xl font-black text-indigo-400">{p1Score}</span>
        </div>
        <div className="text-white/20">VS</div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${turn === p2 && !winner ? "bg-pink-500/20 border border-pink-500/30" : "opacity-50"}`}>
          <span className="text-xl font-black text-pink-400">{p2Score}</span>
          <span className={p2 === me ? "text-pink-300" : "text-white"}>{p2 === me ? "أنت" : p2.split(" ")[0]}</span>
        </div>
      </div>

      <AnimatePresence>
        {winner && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
            className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="flex flex-col items-center p-8 bg-indigo-950 border border-indigo-500/50 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative"
            >
              <Trophy className={`w-20 h-20 mb-4 ${winner === me ? "text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]" : "text-neutral-500"}`} />
              <div className="text-3xl font-black text-white drop-shadow-lg text-center mb-2">
                {winner === "draw" ? "تعادل!" : winner === me ? "أنت ذكي وفزت! 🎉" : "خسرت اللعبة"}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
