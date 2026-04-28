import { useMemo } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";

type DominoStartPayload = { kind: "domino_start"; gameId: string; createdBy: string };
type DominoMovePayload = { kind: "domino_move"; gameId: string; by: string; boneIndex: number; edge: "left" | "right" | "first" };
type DominoDrawPayload = { kind: "domino_draw"; gameId: string; by: string };
type Payload = DominoStartPayload | DominoMovePayload | DominoDrawPayload;

type Bone = [number, number];

// Deterministic random
function xorshift32(seed: number): () => number {
  let x = seed | 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  };
}
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function makeDominoes(): Bone[] {
  const bones: Bone[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) bones.push([i, j]);
  }
  return bones;
}

const DominoHalf = ({ value }: { value: number }) => {
  const dots = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[20, 20], [50, 50], [80, 80]],
    4: [[25, 25], [25, 75], [75, 25], [75, 75]],
    5: [[20, 20], [20, 80], [50, 50], [80, 20], [80, 80]],
    6: [[25, 15], [25, 50], [25, 85], [75, 15], [75, 50], [75, 85]]
  }[value] || [];

  return (
    <div className="relative w-full h-full flex-1 min-h-[22px] min-w-[22px]">
      {dots.map(([x, y], i) => (
        <div 
          key={i} 
          className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-br from-gray-900 to-black rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" 
          style={{ top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' }} 
        />
      ))}
    </div>
  );
};

const DominoBone = ({ a, b, isVertical = true, inverted = false, playable = false }: { a: number, b: number, isVertical?: boolean, inverted?: boolean, playable?: boolean }) => {
  const top = inverted ? b : a;
  const bot = inverted ? a : b;

  return (
    <div className={`
      flex ${isVertical ? "flex-col w-8 h-16 sm:w-10 sm:h-20" : "flex-row w-16 h-8 sm:w-20 sm:h-10"} 
      bg-gradient-to-br from-[#fffaeb] to-[#e6dfc8] 
      rounded-md border border-[#c2ba9e] shadow-[0_3px_5px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.8)]
      p-1 items-center justify-between relative overflow-hidden transition-all duration-300
      ${playable ? "hover:-translate-y-2 hover:shadow-[0_8px_15px_rgba(0,0,0,0.5)] ring-2 ring-[#00d26a] ring-offset-1 ring-offset-transparent cursor-pointer" : ""}
    `}>
      {/* 3D Inner Edge */}
      <div className="absolute inset-0 rounded-md border border-white/40 pointer-events-none" />
      
      {/* Top/Left Half */}
      <DominoHalf value={top} />
      
      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className={`${isVertical ? "w-full h-[1.5px]" : "h-full w-[1.5px]"} bg-gradient-to-r from-gray-400 via-gray-600 to-gray-400 absolute`} style={{ [isVertical ? 'width' : 'height']: '120%' }} />
        {/* Metal Spinner Pin */}
        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-gray-200 to-gray-500 shadow-sm border border-gray-600 z-10" />
      </div>
      
      {/* Bottom/Right Half */}
      <DominoHalf value={bot} />
    </div>
  );
};

const DominoBack = ({ compact = false }: { compact?: boolean }) => (
  <div
    className={[
      "rounded-md border border-[#b8ab85] bg-gradient-to-br from-[#f7efd8] to-[#d8ccb0]",
      "shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.7)] relative overflow-hidden",
      compact ? "w-4 h-8 sm:w-5 sm:h-10" : "w-5 h-10 sm:w-6 sm:h-12",
    ].join(" ")}
  >
    <div className="absolute inset-[2px] rounded-[4px] border border-[#8c7e5a]/40" />
    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_#8c7e5a_0%,_transparent_60%)]" />
    <div className="absolute inset-x-[28%] top-[12%] bottom-[12%] rounded-full border border-[#9f916c]/50" />
  </div>
);


export function DominoesInlineGame({ gameMessage, otherUserId, conversationId, allMessages }: { gameMessage: Message; otherUserId: string; conversationId: string; allMessages: Message[] }) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();

  const start = useMemo(() => {
    try { return JSON.parse(gameMessage.content) as DominoStartPayload; } catch { return null; }
  }, [gameMessage.content]);

  const gameId = start?.gameId;

  const events = useMemo(() => {
    if (!gameId) return [];
    return allMessages
      .filter(m => m.type === "game")
      .map(m => { try { return JSON.parse(m.content) as Payload; } catch { return null; } })
      .filter((p): p is Payload => p !== null && p.gameId === gameId);
  }, [allMessages, gameId]);

  const state = useMemo(() => {
    if (!start) return null;
    const p1 = start.createdBy.toLowerCase();
    const p2 = p1 === me ? otherUserId.toLowerCase() : me;
    const allBones = makeDominoes();
    const rnd = xorshift32(hashSeed(`dominoes:${start.gameId}`));
    for (let i = allBones.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [allBones[i], allBones[j]] = [allBones[j], allBones[i]];
    }

    const hands: Record<string, number[]> = { [p1]: [], [p2]: [] };
    for (let i = 0; i < 7; i++) hands[p1].push(i);
    for (let i = 7; i < 14; i++) hands[p2].push(i);
    let boneyardIndex = 14;
    let turn = p1;
    const board: { index: number; inverted: boolean }[] = [];
    let leftEnd: number | null = null;
    let rightEnd: number | null = null;
    let winner: string | null = null;
    
    const isPass = (player: string) => {
      if (board.length === 0) return false;
      for (const idx of hands[player]) {
        const [a, b] = allBones[idx];
        if (a === leftEnd || b === leftEnd || a === rightEnd || b === rightEnd) return false;
      }
      return true;
    };

    for (const ev of events) {
      if (winner) break;

      if (ev.kind === "domino_move" && ev.by === turn) {
        const idx = ev.boneIndex;
        if (!hands[turn].includes(idx)) continue;
        const [a, b] = allBones[idx];
        let played = false;

        if (board.length === 0) {
          board.push({ index: idx, inverted: false });
          leftEnd = a; rightEnd = b; played = true;
        } else if (ev.edge === "left") {
          if (a === leftEnd) { board.unshift({ index: idx, inverted: true }); leftEnd = b; played = true; }
          else if (b === leftEnd) { board.unshift({ index: idx, inverted: false }); leftEnd = a; played = true; }
        } else if (ev.edge === "right") {
          if (a === rightEnd) { board.push({ index: idx, inverted: false }); rightEnd = b; played = true; }
          else if (b === rightEnd) { board.push({ index: idx, inverted: true }); rightEnd = a; played = true; }
        }

        if (played) {
          hands[turn] = hands[turn].filter(x => x !== idx);
          if (hands[turn].length === 0) { winner = turn; break; }
          turn = turn === p1 ? p2 : p1;
        }
      } else if (ev.kind === "domino_draw" && ev.by === turn) {
        if (boneyardIndex < 28) {
          hands[turn].push(boneyardIndex);
          boneyardIndex++;
        }
      }
    }

    if (!winner && boneyardIndex >= 28 && isPass(turn)) {
      turn = turn === p1 ? p2 : p1;
      if (isPass(turn)) {
        let p1Score = 0, p2Score = 0;
        hands[p1].forEach(i => p1Score += allBones[i][0] + allBones[i][1]);
        hands[p2].forEach(i => p2Score += allBones[i][0] + allBones[i][1]);
        if (p1Score < p2Score) winner = p1; else if (p2Score < p1Score) winner = p2; else winner = "draw";
      }
    }

    return { allBones, hands, board, leftEnd, rightEnd, boneyardCount: 28 - boneyardIndex, turn, winner };
  }, [events, otherUserId, start]);

  if (!start || !state) return <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">رسالة ضومنة غير صالحة.</div>;

  const myTurn = state.turn === me;
  const isDone = state.winner !== null;
  const myHand = state.hands[me] || [];
  const oppHandCount = state.hands[otherUserId]?.length || 0;

  const playBone = (idx: number) => {
    if (!myTurn || isDone) return;
    const [a, b] = state.allBones[idx];
    let edge: "first" | "left" | "right" = "first";
    if (state.board.length > 0) {
      const canLeft = a === state.leftEnd || b === state.leftEnd;
      const canRight = a === state.rightEnd || b === state.rightEnd;
      if (canLeft && !canRight) edge = "left";
      else if (canRight && !canLeft) edge = "right";
      else if (canLeft && canRight) edge = "right";
      else return;
    }
    sendMessage(conversationId, JSON.stringify({ kind: "domino_move", gameId: start.gameId, by: me, boneIndex: idx, edge }), "game");
  };

  const drawBone = () => {
    if (!myTurn || isDone || state.boneyardCount === 0) return;
    sendMessage(conversationId, JSON.stringify({ kind: "domino_draw", gameId: start.gameId, by: me }), "game");
  };

  const canDraw = myTurn && !isDone && state.boneyardCount > 0;
  let hasPlayable = false;
  if (state.board.length === 0) hasPlayable = true;
  else {
    for (const idx of myHand) {
      const [a, b] = state.allBones[idx];
      if (a === state.leftEnd || b === state.leftEnd || a === state.rightEnd || b === state.rightEnd) hasPlayable = true;
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#2d1b11] overflow-hidden w-full shadow-2xl relative font-sans">
      {/* Wood Texture Overlay */}
      <div className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />

      <div className="bg-gradient-to-b from-[#4a2e1b] to-[#3a2010] px-3 py-2 flex justify-between items-center border-b border-white/10 relative z-10 shadow-md">
        <div className="font-black text-white text-[14px] drop-shadow-md">🎲 ضومنة (Dominoes)</div>
        <div className={`text-[11px] font-bold px-2 py-0.5 rounded ${isDone ? "bg-yellow-500/20 text-yellow-300" : myTurn ? "bg-green-500/20 text-green-300 animate-pulse" : "bg-white/10 text-white/50"}`}>
          {isDone ? (state.winner === me ? "لقد فزت! 🎉" : state.winner === "draw" ? "تعادل!" : "الخصم فاز 😢") : (myTurn ? "دورك للعب" : "في انتظار الخصم...")}
        </div>
      </div>

      {/* Opponent's Hand */}
      <div className="bg-black/40 px-3 py-2 flex items-center justify-between relative z-10 border-b border-white/5">
        <div className="text-[11px] text-[#ddd] font-medium">أحجار الخصم: {oppHandCount}</div>
        <div className="flex items-end gap-1.5 min-h-[42px]">
          {Array.from({ length: Math.min(oppHandCount, 7) }).map((_, i) => (
            <div key={i} className={i % 2 ? "translate-y-1" : ""}>
              <DominoBack compact />
            </div>
          ))}
          {oppHandCount > 7 && <span className="text-white text-[11px] ml-1 font-bold">+{oppHandCount - 7}</span>}
        </div>
      </div>

      {/* Playing Board Area (Green Felt) */}
      <div className="h-[150px] sm:h-[170px] bg-gradient-to-br from-[#1f4d2d] to-[#102816] p-3 overflow-x-auto flex items-center shadow-[inset_0_5px_15px_rgba(0,0,0,0.6)] relative custom-scrollbar">
        <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
        
        <div className="flex items-center gap-1 min-w-max px-4 relative z-10 mx-auto transition-all duration-300">
          {state.board.length === 0 ? (
            <div className="text-white/30 text-[13px] font-bold w-full text-center border-2 border-dashed border-white/20 rounded-xl p-4">
              اللوحة فارغة. العب أول حجر!
            </div>
          ) : (
            state.board.map((item, i) => {
              const [a, b] = state.allBones[item.index];
              const isDouble = a === b;
              return (
              <div key={i} className="flex-shrink-0 drop-shadow-xl animate-in fade-in slide-in-from-bottom-2">
                  {/* Doubles are traditionally played vertically, others horizontally */}
                  <DominoBone a={a} b={b} isVertical={isDouble} inverted={item.inverted} />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Middle Action Bar */}
      <div className="bg-black/30 px-4 py-2.5 flex items-center justify-between border-t border-white/5 relative z-10">
        <div className="text-[12px] font-bold text-white/80">السحب: <span className="text-white">{state.boneyardCount} حجر</span></div>
        <button
          onClick={drawBone}
          disabled={!canDraw}
          className={`text-[12px] font-black px-4 py-1.5 rounded-lg transition-all shadow-md ${
            canDraw && !hasPlayable && myTurn ? "bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white animate-pulse hover:brightness-110 active:scale-95" : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
          }`}
        >
          📥 سحب حجر
        </button>
      </div>

      {/* My Hand Area */}
      <div className="p-3 sm:p-4 bg-gradient-to-t from-[#2a170d] to-[#3d2516] relative z-10">
        <div className="text-[12px] font-bold text-white/80 mb-3">أحجارك ({myHand.length}):</div>
        <div className="flex flex-wrap gap-2.5 justify-center">
          {myHand.map((idx) => {
            const [a, b] = state.allBones[idx];
            let playable = false;
            if (myTurn && !isDone) {
              if (state.board.length === 0) playable = true;
              else if (a === state.leftEnd || b === state.leftEnd || a === state.rightEnd || b === state.rightEnd) playable = true;
            }
            return (
              <div key={idx} onClick={() => playable && playBone(idx)} className={playable ? "" : "opacity-90"}>
                <DominoBone a={a} b={b} isVertical={true} playable={playable} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
