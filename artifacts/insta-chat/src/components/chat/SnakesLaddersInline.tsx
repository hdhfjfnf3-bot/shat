import { useMemo, useState, useEffect } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { Trophy, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SlStartPayload = { kind: "sl_start"; gameId: string; createdBy: string; createdAt: string; };
type SlRollPayload = { kind: "sl_roll"; gameId: string; by: string; value: 1 | 2 | 3 | 4 | 5 | 6; at: string; };
type SlPayload = SlStartPayload | SlRollPayload;

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

const JUMPS: Record<number, number> = {
  2: 38, 7: 14, 8: 31, 15: 26, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 78: 98, 87: 94,
  16: 6, 46: 25, 49: 11, 62: 19, 64: 60, 74: 53, 89: 68, 92: 88, 95: 75, 99: 80,
};

function clamp(n: number, min: number, max: number): number { return Math.min(max, Math.max(min, n)); }

function nextPos(pos: number, roll: number): { landed: number; final: number; jumpTo?: number } {
  const landed = clamp(pos + roll, 1, 100);
  const jumpTo = JUMPS[landed];
  if (typeof jumpTo === "number") return { landed, final: jumpTo, jumpTo };
  return { landed, final: landed };
}

const DiceFace = ({ value, rolling }: { value: number; rolling: boolean }) => {
  const dots = {
    1: [[50, 50]],
    2: [[20, 20], [80, 80]],
    3: [[20, 20], [50, 50], [80, 80]],
    4: [[20, 20], [20, 80], [80, 20], [80, 80]],
    5: [[20, 20], [20, 80], [50, 50], [80, 20], [80, 80]],
    6: [[20, 20], [20, 50], [20, 80], [80, 20], [80, 50], [80, 80]]
  }[value] || [[50, 50]];

  return (
    <motion.div 
      animate={{ 
        rotateX: rolling ? [0, 360, 720] : 0, 
        rotateY: rolling ? [0, 360, 720] : 0,
        scale: rolling ? [1, 1.2, 1] : 1,
        boxShadow: rolling ? "0 10px 30px rgba(255,255,255,0.4)" : "0 5px 15px rgba(0,0,0,0.5)"
      }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="w-12 h-12 bg-gradient-to-br from-[#ffffff] to-[#d4d4d4] rounded-xl shadow-[inset_0_-2px_4px_rgba(0,0,0,0.3),0_8px_16px_rgba(0,0,0,0.5)] relative border border-white/50" 
      style={{ transformStyle: "preserve-3d" }}
    >
      {dots.map(([x, y], i) => (
        <div key={i} className="absolute w-2.5 h-2.5 bg-gradient-to-br from-[#222] to-[#000] rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.5)]" style={{ top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' }} />
      ))}
    </motion.div>
  );
};

function getCellPos(cell: number) {
  const zeroBased = clamp(cell, 1, 100) - 1;
  const boardRow = Math.floor(zeroBased / 10);
  const rowFromTop = 9 - boardRow;
  const colFromLeft = boardRow % 2 === 0 ? zeroBased % 10 : 9 - (zeroBased % 10);
  return { left: `${colFromLeft * 10}%`, top: `${rowFromTop * 10}%`, width: '10%', height: '10%' };
}

function getCenter(cell: number) {
  const pos = getCellPos(cell);
  return { x: parseFloat(pos.left) + 5, y: parseFloat(pos.top) + 5 };
}

export function SnakesLaddersInline({ gameMessage, otherUserId, conversationId, allMessages, participants }: { gameMessage: Message; otherUserId: string; conversationId: string; allMessages: Message[]; participants?: import("@/lib/types").User[] }) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();
  const [isRolling, setIsRolling] = useState(false);
  const [displayDice, setDisplayDice] = useState<number>(6);
  
  const [cheatMode, setCheatMode] = useState(false);
  const [cheatValue, setCheatValue] = useState<number | "">("");

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "P" || e.key === "p") setCheatMode(true);
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, []);

  const start = useMemo(() => safeJsonParse<SlStartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "sl_start" ? start.gameId : null;

  const rolls = useMemo(() => {
    if (!gameId) return [] as SlRollPayload[];
    return allMessages
      .filter((m) => m.type === "game")
      .map((m) => safeJsonParse<SlPayload>(m.content))
      .filter((p): p is SlRollPayload => p !== null && p.kind === "sl_roll" && p.gameId === gameId)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [allMessages, gameId]);

  const allPlayers = useMemo(() => {
    if (!participants || participants.length === 0) {
      const p1 = start?.createdBy.toLowerCase() || "";
      const p2 = p1 === me ? otherUserId.toLowerCase() : me;
      return [p1, p2];
    }
    const set = new Set<string>();
    set.add(start?.createdBy.toLowerCase() || "");
    participants.forEach(p => set.add(p.username.toLowerCase()));
    set.add(me);
    return Array.from(set).sort();
  }, [participants, start?.createdBy, me, otherUserId]);

  const TOKEN_COLORS = [
    "from-[#007aff] to-[#00d2ff] border-[#00d2ff]/50 shadow-[#007aff]",
    "from-[#ff0844] to-[#ffb199] border-[#ffb199]/50 shadow-[#ff0844]",
    "from-[#fbbc05] to-[#fcebb6] border-[#fcebb6]/50 shadow-[#fbbc05]",
    "from-[#9d4edd] to-[#e0c3fc] border-[#e0c3fc]/50 shadow-[#9d4edd]",
    "from-[#00d26a] to-[#51ffaa] border-[#51ffaa]/50 shadow-[#00d26a]",
  ];

  const state = useMemo(() => {
    const positions: Record<string, number> = {};
    for (const p of allPlayers) positions[p] = 1;
    let winner: string | null = null;
    let lastMove: null | { by: string; from: number; landed: number; final: number; roll: number } = null;
    let validRollsCount = 0;

    for (const r of rolls) {
      if (winner) break;
      const turnExpected = allPlayers[validRollsCount % allPlayers.length];
      const by = r.by.toLowerCase();
      if (turnExpected && by !== turnExpected) continue;
      
      if (positions[by] === undefined) positions[by] = 1;
      const from = positions[by];
      const { landed, final } = nextPos(from, r.value);
      positions[by] = final;
      lastMove = { by, from, landed, final, roll: r.value };
      validRollsCount++;
      if (final >= 100) { winner = by; break; }
    }

    const turn = allPlayers[validRollsCount % allPlayers.length] || me;
    return { positions, turn, winner, lastMove };
  }, [allPlayers, rolls, me]);

  useEffect(() => {
    if (!isRolling && state.lastMove) setDisplayDice(state.lastMove.roll);
  }, [state.lastMove, isRolling]);

  if (!start || !gameId) return <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">رسالة لعبة غير صالحة.</div>;

  const myTurn = state.turn === me;
  const isDone = Boolean(state.winner);

  const rollDice = () => {
    if (!gameId || isDone || !myTurn || isRolling) return;
    setCheatMode(false); // Hide the overlay immediately upon click!
    setIsRolling(true);

    let value = (Math.floor(Math.random() * 6) + 1) as SlRollPayload["value"];
    // Use cheat value if it exists, then clear it
    if (typeof cheatValue === "number" && cheatValue >= 1 && cheatValue <= 6) {
      value = cheatValue as SlRollPayload["value"];
      setCheatValue("");
    }

    useChatStore.getState().triggerDiceRoll([value], () => {
      setDisplayDice(value);
      sendMessage(conversationId, JSON.stringify({ kind: "sl_roll", gameId, by: me, value, at: new Date().toISOString() }), "game");
      setIsRolling(false);
    });
  };

  const BOARD_CELLS = Array.from({ length: 100 }, (_, i) => i + 1);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-[95vw] sm:w-[85vw] md:w-[460px] max-w-full rounded-[32px] border border-white/10 bg-black/60 backdrop-blur-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] font-sans relative isolate hardware-accelerated mx-auto"
    >
      
      {/* Dynamic ambient glow based on game state */}
      <AnimatePresence>
        {isDone ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.4 }}
            className={`absolute top-0 left-0 w-full h-full blur-[100px] -z-10 transition-colors duration-1000 ${state.winner === me ? 'bg-[#00d26a]' : 'bg-[#ff0844]'}`} 
          />
        ) : (
          <motion.div 
            animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }} 
            transition={{ repeat: Infinity, duration: 4 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#00d26a]/20 blur-[80px] -z-10" 
          />
        )}
      </AnimatePresence>

      {/* Cheat Mode Center Overlay */}
      <AnimatePresence>
        {cheatMode && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="absolute inset-0 bg-black/60 z-[9999] flex flex-col items-center justify-center p-6"
            onClick={(e) => { if (e.target === e.currentTarget) setCheatMode(false); }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_2px_10px_rgba(255,255,255,0.05)] w-full max-w-[280px]"
            >
              <div className="w-16 h-16 rounded-full bg-[#00d26a]/10 flex items-center justify-center shadow-[0_0_30px_rgba(0,210,106,0.2)]">
                <Sparkles className="w-8 h-8 text-[#00d26a]" />
              </div>
              <div className="text-center">
                <h3 className="text-white text-[18px] font-black mb-1">الوضع السري 🤫</h3>
                <p className="text-white/40 text-[12px] font-bold">اختر الرقم الذي سيظهر في النرد القادم</p>
              </div>
              <input 
                type="number" min={1} max={6} value={cheatValue} 
                onChange={(e) => setCheatValue(parseInt(e.target.value) || "")}
                placeholder="1-6"
                className="w-full h-14 bg-black/50 border border-white/20 text-white text-center rounded-2xl font-black text-[24px] outline-none focus:border-[#00d26a] focus:shadow-[0_0_20px_rgba(0,210,106,0.3)] transition-all shadow-inner"
              />
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={rollDice}
                className="w-full h-12 bg-gradient-to-r from-[#00d26a] to-[#009e4f] text-white rounded-xl font-black text-[15px] shadow-[0_10px_30px_rgba(0,210,106,0.4)]"
              >
                تأكيد ورمي النرد 🎲
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-white/10 to-transparent p-4 flex justify-between items-center shadow-lg relative z-10 border-b border-white/[0.05] backdrop-blur-md">
        <div>
          <div className="text-[16px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a8a8a8] tracking-wide uppercase drop-shadow-md flex items-center gap-2">
            <span>🐍🪜</span> السلم والثعبان 3D
          </div>
          <div className={`text-[12px] font-bold mt-1.5 ${isDone ? (state.winner === me ? "text-[#00d26a] drop-shadow-[0_0_5px_rgba(0,210,106,0.5)]" : "text-[#ff4d4f]") : myTurn ? "text-[#00d2ff]" : "text-[#a8a8a8]"}`}>
            {isDone ? (state.winner === me ? "لقد فزت! 👑" : "الخصم فاز! 👑") : myTurn ? "دورك الآن! ارمي النرد" : "في انتظار الخصم..."}
          </div>
        </div>
        {!isDone && (
          <div className="flex flex-col items-center gap-1 relative">
            <motion.button
              whileHover={myTurn && !isRolling ? { scale: 1.05, boxShadow: "0 10px 30px rgba(0, 210, 106, 0.4)" } : {}}
              whileTap={myTurn && !isRolling ? { scale: 0.95 } : {}}
              onClick={rollDice}
              disabled={!myTurn || isRolling}
              className={`relative z-50 flex items-center justify-center h-10 px-5 rounded-[14px] font-black text-[13px] transition-all overflow-hidden ${myTurn && !isRolling ? "bg-gradient-to-r from-[#00d26a] to-[#009e4f] text-white shadow-[0_5px_20px_rgba(0,210,106,0.4),inset_0_1px_0_rgba(255,255,255,0.4)]" : "bg-white/10 text-white/40 cursor-not-allowed border border-white/10"}`}
            >
              {isRolling ? "جاري الرمي..." : "🎲 ارمي"}
            </motion.button>
          </div>
        )}
      </div>

      <div className="p-5 bg-black/40 relative backdrop-blur-sm">
        
        {/* The Board 3D Container */}
        <div 
          className="relative aspect-square w-full rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.2)] overflow-hidden border border-white/10 preserve-3d"
          style={{ transform: "perspective(1000px) rotateX(15deg)" }}
          dir="ltr"
        >
          {/* Grid Background Patterns - Optimized for Performance */}
          <div className="absolute inset-0 bg-[#0a0a0f]">
            {BOARD_CELLS.map((cell) => {
              const pos = getCellPos(cell);
              const isEven = (Math.floor((cell - 1) / 10) + ((cell - 1) % 10)) % 2 === 0;
              return (
                <div key={`bg-${cell}`} className="absolute p-[1.5px]" style={pos}>
                  <div className={`w-full h-full flex items-start justify-start p-1 rounded-[4px] ${isEven ? "bg-[#181a26]" : "bg-[#212436]"} border border-black/20`}>
                    <span className="text-[12px] sm:text-[14px] font-bold select-none text-white/70" style={{ textShadow: "1px 1px 1px rgba(0,0,0,0.8)" }}>{cell}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Snakes and Ladders SVG Overlay - Optimized (No Filters) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ filter: "drop-shadow(0 5px 10px rgba(0,0,0,0.6))" }}>
            <defs>
              <linearGradient id="snake-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff0844" />
                <stop offset="100%" stopColor="#ffb199" />
              </linearGradient>
              <linearGradient id="ladder-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d2ff" />
                <stop offset="100%" stopColor="#3a7bd5" />
              </linearGradient>
            </defs>
            {Object.entries(JUMPS).map(([fromStr, to]) => {
              const from = parseInt(fromStr);
              const p1 = getCenter(from);
              const p2 = getCenter(to);
              const isLadd = to > from;

              if (isLadd) {
                // Draw Premium Ladder
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const rungs = Math.floor(len / 4);
                
                return (
                  <g key={`l-${from}`}>
                    {/* Shadow Layer */}
                    <line x1={p1.x - dy * 0.05} y1={p1.y + dx * 0.05} x2={p2.x - dy * 0.05} y2={p2.y + dx * 0.05} stroke="black" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
                    <line x1={p1.x + dy * 0.05} y1={p1.y - dx * 0.05} x2={p2.x + dy * 0.05} y2={p2.y - dx * 0.05} stroke="black" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
                    {/* Rails */}
                    <line x1={p1.x - dy * 0.05} y1={p1.y + dx * 0.05} x2={p2.x - dy * 0.05} y2={p2.y + dx * 0.05} stroke="url(#ladder-grad)" strokeWidth="1.0" strokeLinecap="round" />
                    <line x1={p1.x + dy * 0.05} y1={p1.y - dx * 0.05} x2={p2.x + dy * 0.05} y2={p2.y - dx * 0.05} stroke="url(#ladder-grad)" strokeWidth="1.0" strokeLinecap="round" />
                    {/* Rungs */}
                    {Array.from({ length: rungs }).map((_, i) => {
                      const t = (i + 1) / (rungs + 1);
                      const cx = p1.x + dx * t;
                      const cy = p1.y + dy * t;
                      return (
                        <line key={i} x1={cx - dy * 0.05} y1={cy + dx * 0.05} x2={cx + dy * 0.05} y2={cy - dx * 0.05} stroke="#00d2ff" strokeWidth="0.6" />
                      );
                    })}
                  </g>
                );
              } else {
                // Draw Premium Snake (Deterministic curve to prevent jitter)
                const offset = ((from * 7 + to * 13) % 15) - 7.5;
                const midX = (p1.x + p2.x) / 2 + offset;
                const midY = (p1.y + p2.y) / 2 - offset;
                return (
                  <g key={`s-${from}`}>
                    {/* Snake Shadow */}
                    <path d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`} fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
                    {/* Snake Body */}
                    <path d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`} fill="none" stroke="url(#snake-grad)" strokeWidth="1.5" strokeLinecap="round" />
                    {/* Snake Head */}
                    <circle cx={p1.x} cy={p1.y} r="1.8" fill="#ff0844" />
                    {/* Snake Eye */}
                    <circle cx={p1.x - 0.5} cy={p1.y - 0.3} r="0.4" fill="white" />
                  </g>
                );
              }
            })}
          </svg>

          {/* Tokens Layer */}
          <div className="absolute inset-0 pointer-events-none z-20" style={{ transformStyle: "preserve-3d" }}>
            {allPlayers.map((p, idx) => {
              const pos = state.positions[p] || 1;
              const colorClass = TOKEN_COLORS[idx % TOKEN_COLORS.length];
              const offsetX = (idx % 2 === 0 ? 1 : -1) * (idx * 5) + "%";
              const offsetY = (idx % 2 === 0 ? -1 : 1) * (idx * 5) + "%";
              const cellPos = getCellPos(pos);
              
              const colorMatch = colorClass?.match(/shadow-\[([^\]]+)\]/);
              const glowColor = colorMatch ? colorMatch[1] : "#fff";

              return (
                <motion.div 
                  key={p}
                  initial={false}
                  animate={{ left: cellPos.left, top: cellPos.top }}
                  transition={{ type: "spring", stiffness: 45, damping: 10, mass: 1 }}
                  className="absolute flex items-center justify-center w-[10%] h-[10%]"
                  style={{ transform: `translate(${offsetX}, ${offsetY}) translateZ(30px)` }}
                >
                  <div className="relative">
                    <div className={`w-3.5 h-4.5 sm:w-4 sm:h-5 bg-gradient-to-t ${colorClass} rounded-t-full shadow-[0_3px_6px_rgba(0,0,0,0.6),inset_0_1px_3px_rgba(255,255,255,0.3)] border border-white/20 flex items-start justify-center pt-0.5 relative overflow-hidden`}>
                      <div className="w-1.5 h-1.5 bg-white/80 rounded-full shadow-sm" />
                      <div className="absolute bottom-0 w-full h-1/3 bg-black/30" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="bg-black/50 backdrop-blur-xl border-t border-white/[0.05] p-5 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        
        {/* Dice Visual */}
        <div className="flex items-center gap-5">
          <DiceFace value={displayDice} rolling={isRolling} />
          <div className="flex flex-col">
            <span className="text-[12px] text-[#a8a8a8] font-bold uppercase tracking-widest drop-shadow-sm">
              {state.lastMove ? (state.lastMove.by === me ? "أنت رميت" : "الخصم رمى") : "النتيجة"}
            </span>
            <motion.span 
              key={state.lastMove?.roll}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[26px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a8a8a8] drop-shadow-lg leading-none mt-1"
            >
              {state.lastMove ? state.lastMove.roll : "-"}
            </motion.span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 text-[13px] font-bold border-l border-white/10 pl-5 max-h-24 overflow-y-auto w-1/3 hide-scrollbar">
          {allPlayers.map((p, idx) => {
            const colorMatch = TOKEN_COLORS[idx % TOKEN_COLORS.length]?.match(/from-\[([^\]]+)\]/);
            const colorCode = colorMatch ? colorMatch[1] : "#fff";
            const isMe = p === me;
            return (
              <div key={p} className={`flex items-center gap-2 shrink-0 ${isMe ? "bg-white/5 px-2 py-1 rounded-lg border border-white/10" : ""}`}>
                <div className="w-3.5 h-3.5 rounded-full shadow-lg border-2 border-black/50" style={{ backgroundColor: colorCode, boxShadow: `0 0 15px ${colorCode}` }} />
                <span className={isMe ? "text-white font-black drop-shadow-md" : "text-[#a8a8a8]"} title={p}>
                  {isMe ? "أنت" : p.split(" ")[0]} <span className="text-[11px] text-white/50 ml-1">({state.positions[p] || 1})</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cinematic Winner Overlay */}
      <AnimatePresence>
        {isDone && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(15px)" }}
            className="absolute inset-0 bg-black/60 z-50 flex flex-col items-center justify-center rounded-[32px] border border-white/20"
          >
            {state.winner === me && (
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                className="absolute inset-0 -z-10 bg-[conic-gradient(from_0deg,transparent,rgba(0,210,106,0.3),transparent)]"
              />
            )}

            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
              className="flex flex-col items-center p-8 bg-black/40 border border-white/10 rounded-[28px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative isolate"
            >
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Trophy className={`w-28 h-28 mb-5 ${state.winner === me ? "text-[#fbbc05]" : "text-[#737373]"} drop-shadow-[0_0_40px_rgba(251,188,5,0.6)]`} />
              </motion.div>
              {state.winner === me && (
                <div className="absolute top-0 right-0 animate-ping"><Sparkles className="w-8 h-8 text-[#00d26a]" /></div>
              )}
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a8a8a8] drop-shadow-2xl text-center leading-tight">
                {state.winner === me ? "أنت فزت! 🎉" : "الخصم فاز"}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
