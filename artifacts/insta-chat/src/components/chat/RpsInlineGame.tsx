import { useMemo } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

type RpsMove = "rock" | "paper" | "scissors";
type RpsGamePayload = {
  kind: "rps";
  gameId: string;
  createdBy: string;
  createdAt: string;
  bestOf: 3 | 5;
};

type RpsMovePayload = {
  kind: "rps_move";
  gameId: string;
  move: RpsMove;
};

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

function moveEmoji(m: RpsMove): string {
  if (m === "rock") return "🪨";
  if (m === "paper") return "📄";
  return "✂️";
}

function moveLabel(m: RpsMove): string {
  if (m === "rock") return "حجر";
  if (m === "paper") return "ورقة";
  return "مقص";
}

function roundWinner(a: RpsMove, b: RpsMove): 0 | 1 | 2 {
  if (a === b) return 0;
  if (a === "rock" && b === "scissors") return 1;
  if (a === "paper" && b === "rock") return 1;
  if (a === "scissors" && b === "paper") return 1;
  return 2;
}

function pickLastMove(messages: Message[], gameId: string, senderId: string): RpsMove | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.type !== "game") continue;
    if (m.senderId !== senderId) continue;
    const p = safeJsonParse<RpsMovePayload>(m.content);
    if (!p || p.kind !== "rps_move" || p.gameId !== gameId) continue;
    return p.move;
  }
  return null;
}

export function RpsInlineGame({
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
  const me = useMe((s) => s.username);
  const { sendMessage } = useChatStore();

  const payload = useMemo(() => safeJsonParse<RpsGamePayload>(gameMessage.content), [gameMessage.content]);
  const gameId = payload?.kind === "rps" ? payload.gameId : null;

  const myMove = useMemo(() => (gameId ? pickLastMove(allMessages, gameId, me) : null), [allMessages, gameId, me]);
  const theirMove = useMemo(
    () => (gameId ? pickLastMove(allMessages, gameId, otherUserId) : null),
    [allMessages, gameId, otherUserId],
  );

  const status = useMemo(() => {
    if (!payload || !gameId) return { title: "خطأ", sub: "فيه مشكلة في اللعبة", winStatus: 0 };
    if (!myMove && !theirMove) return { title: "حجر، ورقة، مقص", sub: "اختر حركتك الآن", winStatus: -1 };
    if (myMove && !theirMove) return { title: "في الانتظار...", sub: "مستني الخصم يختار", winStatus: -1 };
    if (!myMove && theirMove) return { title: "الخصم لعب", sub: "دورك تختار دلوقتي!", winStatus: -1 };
    
    const w = roundWinner(myMove!, theirMove!);
    if (w === 0) return { title: "تعادل 🤝", sub: "نفس الحركة!", winStatus: 0 };
    if (w === 1) return { title: "أنت كسبت! 🎉", sub: `${moveEmoji(myMove!)} يكسب ${moveEmoji(theirMove!)}`, winStatus: 1 };
    return { title: "الخصم كسب 😢", sub: `${moveEmoji(theirMove!)} يكسب ${moveEmoji(myMove!)}`, winStatus: 2 };
  }, [payload, gameId, myMove, theirMove]);

  if (!payload || !gameId) {
    return <div className="rounded-2xl bg-black/50 p-4 text-[#a8a8a8]">رسالة غير صالحة</div>;
  }

  const sendMove = (move: RpsMove) => {
    const msg: RpsMovePayload = { kind: "rps_move", gameId, move };
    sendMessage(conversationId, JSON.stringify(msg), "game");
  };

  const isDone = !!myMove && !!theirMove;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="rounded-[32px] border border-white/10 bg-black/60 backdrop-blur-3xl overflow-hidden w-[300px] sm:w-[320px] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] font-sans relative mx-auto pb-5 isolate hardware-accelerated"
    >
      
      {/* Dynamic Background glow based on status */}
      <AnimatePresence>
        {isDone ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.4 }}
            className={`absolute top-0 left-0 w-full h-[150px] blur-[80px] -z-10 transition-colors duration-1000 ${status.winStatus === 1 ? 'bg-[#00d2ff]' : status.winStatus === 2 ? 'bg-[#ff0844]' : 'bg-[#fbbc05]'}`} 
          />
        ) : (
          <div className="absolute top-[-50px] left-[-50px] w-40 h-40 bg-purple-600/30 blur-[60px] pointer-events-none -z-10" />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-gradient-to-b from-white/10 to-transparent p-4 flex flex-col items-center justify-center border-b border-white/[0.05] relative z-10 backdrop-blur-md">
        <div className="text-[17px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a8a8a8] tracking-widest uppercase drop-shadow-md flex items-center gap-2">
          {status.title}
        </div>
        <div className={`text-[12px] mt-1.5 font-bold ${isDone ? (status.winStatus === 1 ? "text-[#00d2ff] drop-shadow-[0_0_5px_rgba(0,210,255,0.5)]" : status.winStatus === 2 ? "text-[#ff4d4f] drop-shadow-[0_0_5px_rgba(255,77,79,0.5)]" : "text-yellow-400 drop-shadow-[0_0_5px_rgba(251,188,5,0.5)]") : "text-[#888]"}`}>
          {status.sub}
        </div>
      </div>

      <div className="p-5 relative z-10">
        {/* Battle Arena */}
        <div className="flex justify-between items-center bg-black/40 rounded-[24px] p-4 border border-white/[0.05] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] mb-6 relative overflow-hidden backdrop-blur-sm">
          
          {/* Animated VS badge */}
          <motion.div 
            animate={!isDone ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-[#222] to-[#000] border-2 border-white/10 flex items-center justify-center text-[11px] font-black text-[#888] italic z-20 shadow-[0_0_20px_rgba(0,0,0,0.8)]"
          >
            VS
          </motion.div>
          
          <div className="flex flex-col items-center flex-1 z-10">
            <span className="text-[11px] font-black text-white/50 mb-2.5 uppercase tracking-widest drop-shadow-md">أنت</span>
            <div className="w-[72px] h-[72px] rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] relative overflow-hidden">
              <AnimatePresence mode="popLayout">
                {myMove ? (
                  <motion.div 
                    initial={{ scale: 0, rotate: -45, x: -50 }} 
                    animate={{ scale: 1, rotate: 0, x: 0 }} 
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-5xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] z-10"
                  >
                    {moveEmoji(myMove)}
                  </motion.div>
                ) : (
                  <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-3xl text-white/20 blur-[1px]">?</motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col items-center flex-1 z-10">
            <span className="text-[11px] font-black text-white/50 mb-2.5 uppercase tracking-widest drop-shadow-md">الخصم</span>
            <div className="w-[72px] h-[72px] rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] relative overflow-hidden">
              <AnimatePresence mode="popLayout">
                {theirMove ? (
                  <motion.div 
                    initial={{ scale: 0, rotate: 45, x: 50 }} 
                    animate={{ scale: 1, rotate: 0, x: 0 }} 
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-5xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] z-10"
                  >
                    {moveEmoji(theirMove)}
                  </motion.div>
                ) : (
                  <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.7 }} className="text-3xl text-white/20 blur-[1px]">?</motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3.5">
          {([
            { move: "rock" as const, label: "حجر", emoji: "🪨" },
            { move: "paper" as const, label: "ورقة", emoji: "📄" },
            { move: "scissors" as const, label: "مقص", emoji: "✂️" },
          ] as const).map((b, i) => (
            <motion.button
              key={b.move}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
              whileHover={!isDone ? { scale: 1.15, y: -8, boxShadow: "0 10px 20px rgba(0,0,0,0.5)" } : {}}
              whileTap={!isDone ? { scale: 0.9 } : {}}
              onClick={() => sendMove(b.move)}
              disabled={isDone || !!myMove}
              className={`flex flex-col items-center justify-center gap-1.5 w-[76px] py-3.5 rounded-[22px] border transition-all ${
                isDone || !!myMove
                  ? myMove === b.move 
                    ? "bg-white/20 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.3),inset_0_1px_0_rgba(255,255,255,0.4)]" 
                    : "bg-black/40 border-white/5 opacity-30 cursor-not-allowed filter grayscale"
                  : "bg-gradient-to-b from-white/10 to-white/5 border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] cursor-pointer"
              }`}
            >
              <span className="text-4xl drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]">{b.emoji}</span>
              <span className={`text-[12px] font-black tracking-wide ${myMove === b.move ? "text-white" : "text-white/60"}`}>{b.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

