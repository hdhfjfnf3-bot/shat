import { useMemo, useState, useEffect } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { Trophy } from "lucide-react";

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
    <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-white to-gray-200 rounded-lg shadow-[inset_0_-2px_4px_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.4)] relative ${rolling ? "animate-spin" : ""}`} style={{ transformStyle: "preserve-3d" }}>
      {dots.map(([x, y], i) => (
        <div key={i} className="absolute w-2 h-2 bg-gradient-to-br from-gray-800 to-black rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" style={{ top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' }} />
      ))}
    </div>
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

export function SnakesLaddersInline({ gameMessage, otherUserId, conversationId, allMessages }: { gameMessage: Message; otherUserId: string; conversationId: string; allMessages: Message[] }) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();
  const [isRolling, setIsRolling] = useState(false);
  const [displayDice, setDisplayDice] = useState<number>(6);

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

  const state = useMemo(() => {
    if (!gameId) return { mePos: 1, otherPos: 1, turn: me, winner: null as string | null, lastMove: null as null | { by: string; from: number; landed: number; final: number; roll: number } };

    let mePos = 1;
    let otherPos = 1;
    let turn = (start?.createdBy ?? me).toLowerCase();
    let winner: string | null = null;
    let lastMove: null | { by: string; from: number; landed: number; final: number; roll: number } = null;

    for (const r of rolls) {
      if (winner) break;
      const by = r.by.toLowerCase();
      const isMe = by === me;
      const from = isMe ? mePos : otherPos;
      const { landed, final } = nextPos(from, r.value);
      if (isMe) mePos = final; else otherPos = final;
      lastMove = { by, from, landed, final, roll: r.value };
      if (final >= 100) { winner = by; break; }
      turn = by === me ? otherUserId.toLowerCase() : me;
    }

    return { mePos, otherPos, turn, winner, lastMove };
  }, [gameId, me, otherUserId, rolls, start?.createdBy]);

  useEffect(() => {
    if (!isRolling && state.lastMove) setDisplayDice(state.lastMove.roll);
  }, [state.lastMove, isRolling]);

  if (!start || !gameId) return <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">رسالة لعبة غير صالحة.</div>;

  const myTurn = state.turn === me;
  const isDone = Boolean(state.winner);

  const rollDice = () => {
    if (!gameId || isDone || !myTurn || isRolling) return;
    setIsRolling(true);
    let spins = 0;
    const interval = setInterval(() => {
      setDisplayDice(Math.floor(Math.random() * 6) + 1);
      if (++spins > 10) clearInterval(interval);
    }, 50);

    setTimeout(() => {
      clearInterval(interval);
      const value = (Math.floor(Math.random() * 6) + 1) as SlRollPayload["value"];
      sendMessage(conversationId, JSON.stringify({ kind: "sl_roll", gameId, by: me, value, at: new Date().toISOString() }), "game");
      setIsRolling(false);
    }, 600);
  };

  const BOARD_CELLS = Array.from({ length: 100 }, (_, i) => i + 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] overflow-hidden sm:w-[360px] w-[310px] shadow-2xl font-sans relative">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-3 flex justify-between items-center shadow-md relative z-10">
        <div>
          <div className="text-[14px] font-black text-white tracking-wide uppercase drop-shadow-md">🐍🪜 السلم والثعبان</div>
          <div className="text-[11px] text-emerald-100 font-medium">
            {isDone ? (state.winner === me ? "لقد فزت! 👑" : "الخصم فاز! 👑") : myTurn ? "دورك الآن" : "في انتظار الخصم..."}
          </div>
        </div>
        {!isDone && (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={rollDice}
              disabled={!myTurn || isRolling}
              className={`relative z-50 flex items-center justify-center h-10 px-4 rounded-xl font-black text-[13px] transition-all overflow-hidden ${myTurn ? "bg-white text-emerald-700 shadow-[0_0_15px_rgba(255,255,255,0.5)] active:scale-95 hover:bg-emerald-50" : "bg-white/20 text-white/50 cursor-not-allowed"}`}
            >
              {isRolling ? "جاري الرمي..." : "🎲 رمي النرد"}
            </button>
          </div>
        )}
      </div>

      <div className="p-2 sm:p-3 bg-[#1e2320]">
        
        {/* The Board */}
        <div className="relative aspect-square bg-[#cbe8ce] rounded-xl shadow-[inset_0_4px_10px_rgba(0,0,0,0.2)] border-2 border-[#166534] overflow-hidden" dir="ltr">
          
          {/* Grid Background Patterns */}
          <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
            {BOARD_CELLS.map((cell) => {
              const pos = getCellPos(cell);
              const isEven = (Math.floor((cell - 1) / 10) + ((cell - 1) % 10)) % 2 === 0;
              return (
                <div key={`bg-${cell}`} className={`absolute flex items-start justify-start p-0.5 ${isEven ? "bg-[#d8f0db]" : "bg-[#b9dfbe]"} border-r border-b border-black/5`} style={pos}>
                  <span className="text-[7px] sm:text-[9px] font-bold text-green-900/40 select-none">{cell}</span>
                </div>
              );
            })}
          </div>

          {/* Snakes and Ladders SVG Overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.4" />
              </filter>
            </defs>
            {Object.entries(JUMPS).map(([fromStr, to]) => {
              const from = parseInt(fromStr);
              const p1 = getCenter(from);
              const p2 = getCenter(to);
              const isLadd = to > from;

              if (isLadd) {
                // Draw Ladder
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                const rungs = Math.floor(len / 4);
                
                return (
                  <g key={`l-${from}`} filter="url(#shadow)">
                    {/* Rails */}
                    <line x1={p1.x - dy * 0.05} y1={p1.y + dx * 0.05} x2={p2.x - dy * 0.05} y2={p2.y + dx * 0.05} stroke="#8b4513" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1={p1.x + dy * 0.05} y1={p1.y - dx * 0.05} x2={p2.x + dy * 0.05} y2={p2.y - dx * 0.05} stroke="#8b4513" strokeWidth="1.2" strokeLinecap="round" />
                    {/* Rungs */}
                    {Array.from({ length: rungs }).map((_, i) => {
                      const t = (i + 1) / (rungs + 1);
                      const cx = p1.x + dx * t;
                      const cy = p1.y + dy * t;
                      return (
                        <line key={i} x1={cx - dy * 0.05} y1={cy + dx * 0.05} x2={cx + dy * 0.05} y2={cy - dx * 0.05} stroke="#a0522d" strokeWidth="0.8" />
                      );
                    })}
                  </g>
                );
              } else {
                // Draw Snake
                const midX = (p1.x + p2.x) / 2 + (Math.random() * 10 - 5);
                const midY = (p1.y + p2.y) / 2 + (Math.random() * 10 - 5);
                return (
                  <g key={`s-${from}`} filter="url(#shadow)">
                    {/* Snake Body */}
                    <path d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                    {/* Snake Head (at the start/top) */}
                    <circle cx={p1.x} cy={p1.y} r="1.8" fill="#b91c1c" />
                    {/* Snake Eye */}
                    <circle cx={p1.x - 0.5} cy={p1.y - 0.5} r="0.4" fill="white" />
                  </g>
                );
              }
            })}
          </svg>

          {/* Tokens Layer */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {/* Other Player Token */}
            <div 
              className="absolute transition-all duration-700 ease-in-out drop-shadow-xl flex items-center justify-center"
              style={{ ...getCellPos(state.otherPos), transform: 'translate(10%, -10%) scale(1.1)' }}
            >
              <div className="w-4 h-5 sm:w-5 sm:h-6 bg-gradient-to-t from-red-600 to-red-400 rounded-t-full shadow-inner border border-red-800 flex items-start justify-center pt-0.5">
                <div className="w-2 h-2 bg-white/30 rounded-full" />
              </div>
            </div>
            
            {/* My Token */}
            <div 
              className="absolute transition-all duration-700 ease-in-out drop-shadow-xl flex items-center justify-center"
              style={{ ...getCellPos(state.mePos), transform: 'translate(-10%, 10%) scale(1.1)' }}
            >
              <div className="w-4 h-5 sm:w-5 sm:h-6 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-full shadow-inner border border-blue-800 flex items-start justify-center pt-0.5">
                <div className="w-2 h-2 bg-white/30 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="bg-[#141715] p-3 flex items-center justify-between">
        
        {/* Dice Visual */}
        <div className="flex items-center gap-3">
          <div className="scale-75 origin-left">
            <DiceFace value={displayDice} rolling={isRolling} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#888]">
              {state.lastMove ? (state.lastMove.by === me ? "رميت:" : "خصمك رمى:") : "الزهر:"}
            </span>
            <span className="text-[14px] font-bold text-white">
              {state.lastMove ? state.lastMove.roll : "-"}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-1 text-[10px] sm:text-[11px] font-medium border-l border-white/10 pl-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-md border border-black" />
            <span className="text-white">أنت (المركز {state.mePos})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-md border border-black" />
            <span className="text-[#a8a8a8]">الخصم (المركز {state.otherPos})</span>
          </div>
        </div>
      </div>

      {/* Winner Overlay */}
      {isDone && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
          <Trophy className={`w-16 h-16 mb-2 ${state.winner === me ? "text-yellow-400" : "text-gray-400"}`} />
          <div className="text-2xl font-black text-white drop-shadow-lg">
            {state.winner === me ? "أنت فزت! 🎉" : "الخصم فاز"}
          </div>
        </div>
      )}
    </div>
  );
}
