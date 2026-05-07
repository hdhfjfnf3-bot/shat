import { useMemo } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles } from "lucide-react";

type XoStartPayload = {
  kind: "xo_start";
  gameId: string;
  createdBy: string;
};

type XoMovePayload = {
  kind: "xo_move";
  gameId: string;
  by: string;
  cell: number;
};

const cellVariants = {
  hidden: { scale: 0, rotateY: 180, opacity: 0 },
  visible: { 
    scale: 1, rotateY: 0, opacity: 1, 
    transition: { type: "spring", stiffness: 300, damping: 20 }
  }
};

export function XoInlineGame({
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

  const start = useMemo(() => {
    try {
      return JSON.parse(gameMessage.content) as XoStartPayload;
    } catch {
      return null;
    }
  }, [gameMessage.content]);

  const gameId = start?.gameId;

  const moves = useMemo(() => {
    if (!gameId) return [];
    const out: XoMovePayload[] = [];
    for (const m of allMessages) {
      if (m.type !== "game") continue;
      try {
        const p = JSON.parse(m.content) as XoMovePayload;
        if (p.kind === "xo_move" && p.gameId === gameId) out.push(p);
      } catch {}
    }
    return out;
  }, [allMessages, gameId]);

  const state = useMemo(() => {
    const board = Array(9).fill(null) as (string | null)[];
    let turn = start?.createdBy?.toLowerCase() || me.toLowerCase();
    let winner: string | null = null;
    let winningLine: number[] | null = null;

    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    for (const m of moves) {
      if (winner) break;
      const by = m.by.toLowerCase();
      if (board[m.cell] === null) {
        board[m.cell] = by;
        turn = by === me.toLowerCase() ? otherUserId.toLowerCase() : me.toLowerCase();
        
        for (const [a, b, c] of lines) {
          if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            winner = board[a];
            winningLine = [a, b, c];
            break;
          }
        }
      }
    }
    
    const isDraw = !winner && board.every(c => c !== null);
    
    return { board, turn, winner, winningLine, isDraw };
  }, [moves, start, me, otherUserId]);

  if (!start || !gameId) return <div className="text-white">لعبة إكس أو غير صالحة</div>;

  const myTurn = state.turn === me.toLowerCase();
  const isDone = !!state.winner || state.isDraw;
  const isCreator = start.createdBy.toLowerCase() === me.toLowerCase();
  
  const getSymbol = (player: string) => player.toLowerCase() === start.createdBy.toLowerCase() ? "X" : "O";
  const mySymbol = getSymbol(me);

  const handleCellClick = (idx: number) => {
    if (isDone || !myTurn || state.board[idx]) return;
    const payload: XoMovePayload = {
      kind: "xo_move",
      gameId,
      by: me.toLowerCase(),
      cell: idx,
    };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="rounded-[32px] border border-white/10 bg-black/80 backdrop-blur-3xl overflow-hidden w-[300px] sm:w-[320px] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] font-sans relative mx-auto isolate hardware-accelerated"
    >
      
      {/* Dynamic Background glow */}
      <motion.div 
        animate={state.winner ? { scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] } : {}}
        transition={{ repeat: Infinity, duration: 3 }}
        className={`absolute inset-0 blur-[80px] -z-10 ${state.winner === me.toLowerCase() ? "bg-[#00d2ff]/30" : state.winner ? "bg-[#ff0844]/30" : "bg-purple-600/20"}`} 
      />

      {/* Header */}
      <div className="bg-gradient-to-b from-white/10 to-transparent p-4 flex flex-col items-center justify-center border-b border-white/[0.05] relative z-10 backdrop-blur-md">
        <div className="text-[18px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a8a8a8] tracking-widest uppercase drop-shadow-md flex items-center gap-2">
          <span className="text-[#ff4d4f] drop-shadow-[0_0_8px_rgba(255,77,79,0.8)]">X</span> 
          تيك تاك تو 
          <span className="text-[#00d2ff] drop-shadow-[0_0_8px_rgba(0,210,255,0.8)]">O</span>
        </div>
        <div className={`text-[13px] mt-1.5 font-bold ${isDone ? (state.winner === me.toLowerCase() ? "text-[#00d2ff] drop-shadow-[0_0_5px_rgba(0,210,255,0.5)]" : state.isDraw ? "text-yellow-400" : "text-[#ff4d4f]") : "text-[#a8a8a8]"}`}>
          {state.winner 
            ? (state.winner === me.toLowerCase() ? "أنت الفائز! 🎉" : "لقد خسرت 😢")
            : state.isDraw 
              ? "التعادل سيد الموقف 🤝"
              : myTurn 
                ? "دورك، العب بذكاء!" 
                : "في انتظار لعب الخصم..."}
        </div>
      </div>

      {/* The Board */}
      <div className="p-6 flex items-center justify-center relative z-10 preserve-3d perspective-[1000px]">
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] relative">
          
          {/* Board Grid Lines (Neon Glow) */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-evenly">
            <div className="w-full h-[2px] bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.2)] rounded-full" />
            <div className="w-full h-[2px] bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.2)] rounded-full" />
          </div>
          <div className="absolute inset-0 pointer-events-none flex justify-evenly">
            <div className="h-full w-[2px] bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.2)] rounded-full" />
            <div className="h-full w-[2px] bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.2)] rounded-full" />
          </div>

          {state.board.map((cell, i) => {
            const isWinningCell = state.winningLine?.includes(i);
            const isX = cell && getSymbol(cell) === "X";
            
            return (
              <motion.button
                key={i}
                whileHover={!cell && myTurn && !isDone ? { scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" } : {}}
                whileTap={!cell && myTurn && !isDone ? { scale: 0.9 } : {}}
                onClick={() => handleCellClick(i)}
                disabled={isDone || !myTurn || cell !== null}
                className={`w-full aspect-square rounded-[18px] text-5xl font-black flex items-center justify-center transition-all duration-300 relative z-10 ${
                  isWinningCell 
                    ? `bg-white/20 border-2 border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.6)] z-20` 
                    : cell 
                      ? "bg-black/20 backdrop-blur-md border border-white/5 shadow-[inset_0_2px_5px_rgba(255,255,255,0.1)]" 
                      : "bg-transparent cursor-pointer"
                }`}
                style={{ transformStyle: "preserve-3d" }}
              >
                <AnimatePresence>
                  {cell && (
                    <motion.div
                      variants={cellVariants}
                      initial="hidden"
                      animate="visible"
                      className={`absolute inset-0 flex items-center justify-center filter drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] ${isX ? "text-[#ff4d4f]" : "text-[#00d2ff]"}`}
                      style={{ textShadow: isX ? "0 0 20px rgba(255,77,79,0.6)" : "0 0 20px rgba(0,210,255,0.6)" }}
                    >
                      {getSymbol(cell)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-black/40 backdrop-blur-xl border-t border-white/[0.05] p-3.5 flex items-center justify-center text-[13px] font-bold text-[#888] z-10 relative shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        أنت تلعب بالرمز: <span className={`ml-2 text-[18px] font-black drop-shadow-lg ${mySymbol === "X" ? "text-[#ff4d4f]" : "text-[#00d2ff]"}`}>{mySymbol}</span>
      </div>

      {/* Cinematic Winner Overlay */}
      <AnimatePresence>
        {isDone && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            className="absolute inset-0 bg-black/60 z-50 flex flex-col items-center justify-center rounded-[32px] border border-white/20"
          >
            {state.winner === me.toLowerCase() && (
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                className="absolute inset-0 -z-10 bg-[conic-gradient(from_0deg,transparent,rgba(0,210,255,0.3),transparent)]"
              />
            )}
            
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
              className="flex flex-col items-center p-6 bg-black/40 border border-white/10 rounded-[28px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative isolate"
            >
              {state.winner ? (
                <>
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                    <Trophy className={`w-24 h-24 mb-5 ${state.winner === me.toLowerCase() ? "text-[#fbbc05]" : "text-[#737373]"} drop-shadow-[0_0_40px_rgba(251,188,5,0.6)]`} />
                  </motion.div>
                  {state.winner === me.toLowerCase() && (
                    <div className="absolute top-0 right-0 animate-ping"><Sparkles className="w-8 h-8 text-[#00d2ff]" /></div>
                  )}
                </>
              ) : (
                <div className="text-7xl mb-6 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">🤝</div>
              )}
              
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a8a8a8] drop-shadow-xl text-center px-4 leading-tight tracking-wide">
                {state.winner 
                  ? (state.winner === me.toLowerCase() ? "أنت فزت! 🎉" : "الخصم فاز")
                  : "تعادل!"}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
