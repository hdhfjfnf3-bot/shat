import { useMemo } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";

type C4StartPayload = { kind: "c4_start"; gameId: string; createdBy: string };
type C4MovePayload = { kind: "c4_move"; gameId: string; by: string; col: number };
type Payload = C4StartPayload | C4MovePayload;

const COLS = 7;
const ROWS = 6;

export function Connect4InlineGame({
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

  const start = useMemo(() => {
    try { return JSON.parse(gameMessage.content) as C4StartPayload; }
    catch { return null; }
  }, [gameMessage.content]);

  const gameId = start?.gameId;

  const events = useMemo(() => {
    if (!gameId) return [];
    const out: Payload[] = [];
    for (const m of allMessages) {
      if (m.type !== "game") continue;
      try {
        const p = JSON.parse(m.content) as Payload;
        if (p.gameId === gameId) out.push(p);
      } catch {}
    }
    return out;
  }, [allMessages, gameId]);

  const state = useMemo(() => {
    if (!start) return null;
    const p1 = start.createdBy.toLowerCase();
    const p2 = p1 === me ? otherUserId.toLowerCase() : me;
    
    // board[row][col] where row 0 is top, row 5 is bottom
    const board: (string | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let turn = p1;
    let winner: string | null = null;
    let winningCells: { r: number, c: number }[] = [];

    const checkWin = (r: number, c: number, player: string) => {
      const dirs = [[1,0], [0,1], [1,1], [1,-1]];
      for (const [dr, dc] of dirs) {
        let count = 1;
        const cells = [{r, c}];
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i, nc = c + dc * i;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) { count++; cells.push({r:nr, c:nc}); }
          else break;
        }
        for (let i = 1; i < 4; i++) {
          const nr = r - dr * i, nc = c - dc * i;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) { count++; cells.push({r:nr, c:nc}); }
          else break;
        }
        if (count >= 4) return cells;
      }
      return null;
    };

    for (const ev of events) {
      if (winner) break;
      if (ev.kind === "c4_move" && ev.by === turn) {
        const col = ev.col;
        if (col < 0 || col >= COLS || board[0][col] !== null) continue;
        
        let rowPlaced = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (board[r][col] === null) {
            board[r][col] = turn;
            rowPlaced = r;
            break;
          }
        }
        
        if (rowPlaced !== -1) {
          const winCells = checkWin(rowPlaced, col, turn);
          if (winCells) {
            winner = turn;
            winningCells = winCells;
            break;
          }
          turn = turn === p1 ? p2 : p1;
        }
      }
    }

    const isDraw = !winner && board[0].every(c => c !== null);

    return { board, turn, winner, winningCells, isDraw, p1, p2 };
  }, [events, otherUserId, start, me]);

  if (!start || !state) return <div className="text-white">لعبة أربعة في صف غير صالحة</div>;

  const myTurn = state.turn === me;
  const isDone = state.winner !== null || state.isDraw;

  const dropToken = (col: number) => {
    if (!myTurn || isDone || state.board[0][col] !== null) return;
    const payload: C4MovePayload = { kind: "c4_move", gameId: start.gameId, by: me, col };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  const getChipStyle = (player: string | null, isWin: boolean) => {
    if (!player) return "";
    const isP1 = player === state.p1;
    if (isP1) {
      return isWin 
        ? "bg-gradient-to-br from-[#ff0844] to-[#ffb199] shadow-[0_0_20px_rgba(255,8,68,0.8),inset_0_-4px_8px_rgba(0,0,0,0.4)]" 
        : "bg-gradient-to-br from-[#d90429] to-[#ef233c] shadow-[inset_0_-4px_8px_rgba(0,0,0,0.4),0_4px_8px_rgba(0,0,0,0.3)] border-2 border-[#8d0801]";
    } else {
      return isWin 
        ? "bg-gradient-to-br from-[#fbbc05] to-[#ffe566] shadow-[0_0_20px_rgba(251,188,5,0.8),inset_0_-4px_8px_rgba(0,0,0,0.4)]" 
        : "bg-gradient-to-br from-[#eab308] to-[#facc15] shadow-[inset_0_-4px_8px_rgba(0,0,0,0.4),0_4px_8px_rgba(0,0,0,0.3)] border-2 border-[#ca8a04]";
    }
  };

  return (
    <div className="rounded-[32px] border border-white/10 bg-black/80 backdrop-blur-3xl overflow-hidden w-full max-w-full shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.1)] font-sans relative">
      
      {/* Background neon glows */}
      <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-blue-600/30 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-50px] right-[-50px] w-48 h-48 bg-purple-600/20 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-transparent p-4 flex justify-between items-center border-b border-white/[0.05] relative z-10 shadow-md">
        <div>
          <div className="font-black text-transparent bg-clip-text bg-gradient-to-r from-[#60a5fa] to-[#3b82f6] text-[16px] uppercase tracking-wider drop-shadow-sm flex items-center gap-1.5">
            <span>🔵🔴</span> 4 في صف 
          </div>
          <div className="text-[12px] font-bold text-[#a8a8a8] mt-1">
            {isDone ? (state.winner === me ? "أنت فزت! 🎉" : state.winner === state.p2 ? "الخصم فاز 😢" : "تعادل!") : (myTurn ? "دورك! العب في عمود" : "في انتظار الخصم...")}
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-5 relative z-10">
        
        {/* The Board Frame */}
        <div className="bg-gradient-to-b from-[#1e3a8a] to-[#172554] p-2.5 sm:p-4 rounded-[20px] shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_2px_10px_rgba(59,130,246,0.3)] border border-blue-500/30 backdrop-blur-md relative overflow-visible transform-gpu" style={{ transform: "perspective(800px) rotateX(5deg)", transformStyle: "preserve-3d" }}>
          
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Headers for hovering and clicking */}
            {Array.from({ length: COLS }).map((_, col) => (
              <button
                key={`btn-${col}`}
                onClick={() => dropToken(col)}
                disabled={!myTurn || isDone || state.board[0][col] !== null}
                className="h-8 flex justify-center items-center group mb-1 outline-none relative"
              >
                {!isDone && myTurn && state.board[0][col] === null && (
                  <motion.div 
                    initial={{ y: -5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -5, opacity: 0 }}
                    className="absolute -top-6 text-[#60a5fa] drop-shadow-[0_0_10px_rgba(96,165,250,0.8)] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ▼
                  </motion.div>
                )}
                {/* Column highlight on hover */}
                {!isDone && myTurn && state.board[0][col] === null && (
                  <div className="absolute top-0 bottom-[-300px] w-full bg-white/5 opacity-0 group-hover:opacity-100 rounded-lg pointer-events-none transition-opacity z-10" />
                )}
              </button>
            ))}

            {/* Board Cells */}
            {state.board.map((row, rIdx) => 
              row.map((cell, cIdx) => {
                const isWinning = state.winningCells.some(w => w.r === rIdx && w.c === cIdx);
                const chipStyle = getChipStyle(cell, isWinning);
                
                return (
                  <div key={`${rIdx}-${cIdx}`} className="aspect-square bg-[#020617]/80 rounded-full flex items-center justify-center p-1 sm:p-1.5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.8),0_1px_1px_rgba(255,255,255,0.1)] relative border border-black/50 overflow-visible z-20">
                    <AnimatePresence>
                      {cell && (
                        <motion.div 
                          initial={{ y: -200, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ type: "spring", bounce: 0.5, damping: 12, stiffness: 100 }}
                          className={`w-full h-full rounded-full flex items-center justify-center relative ${chipStyle}`}
                        >
                          {/* Inner rings for 3D effect */}
                          <div className="absolute w-[70%] h-[70%] rounded-full border border-white/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]" />
                          <div className="absolute w-[40%] h-[40%] rounded-full border border-black/20 shadow-inner" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Info Legend */}
        <div className="mt-5 flex justify-center items-center gap-6 text-[12px] font-bold">
          <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-colors ${state.p1 === me ? "bg-red-500/10 border-red-500/30 text-white" : "bg-white/5 border-white/10 text-[#a8a8a8]"}`}>
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#d90429] to-[#ef233c] shadow-md border border-[#8d0801]" /> 
            إنت {state.p1 === me ? "(أحمر)" : "(أصفر)"}
          </div>
          <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-colors ${state.p1 !== me ? "bg-yellow-500/10 border-yellow-500/30 text-white" : "bg-white/5 border-white/10 text-[#a8a8a8]"}`}>
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#eab308] to-[#facc15] shadow-md border border-[#ca8a04]" /> 
            الطرف الآخر
          </div>
        </div>
      </div>

      {/* Winner Overlay */}
      <AnimatePresence>
        {isDone && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md z-50 flex flex-col items-center justify-center border border-white/10 rounded-[32px]"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="flex flex-col items-center"
            >
              {state.winner ? (
                <Trophy className={`w-24 h-24 mb-4 ${state.winner === me ? "text-[#fbbc05]" : "text-[#737373]"} drop-shadow-[0_0_30px_rgba(251,188,5,0.4)]`} />
              ) : (
                <div className="text-6xl mb-4">🤝</div>
              )}
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a8a8a8] drop-shadow-xl text-center px-4 leading-tight">
                {state.winner 
                  ? (state.winner === me ? "أنت فزت! 🎉" : "الخصم فاز")
                  : "تعادل!"}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
