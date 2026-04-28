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

export function DominoesInlineGame({
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
    try { return JSON.parse(gameMessage.content) as DominoStartPayload; }
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
    const p2 = otherUserId.toLowerCase();
    
    // Shuffle deterministic
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
      const hand = hands[player];
      if (board.length === 0) return false; // can play anything
      for (const idx of hand) {
        const [a, b] = allBones[idx];
        if (a === leftEnd || b === leftEnd || a === rightEnd || b === rightEnd) return false;
      }
      return true; // no playable piece
    };

    for (const ev of events) {
      if (winner) break;

      if (ev.kind === "domino_move" && ev.by === turn) {
        const idx = ev.boneIndex;
        if (!hands[turn].includes(idx)) continue; // cheater or bug
        
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

    // Auto-pass if player has no moves and boneyard is empty
    if (!winner && boneyardIndex >= 28 && isPass(turn)) {
      turn = turn === p1 ? p2 : p1;
      if (isPass(turn)) {
        // Both blocked -> block game (count pips)
        let p1Score = 0, p2Score = 0;
        hands[p1].forEach(i => p1Score += allBones[i][0] + allBones[i][1]);
        hands[p2].forEach(i => p2Score += allBones[i][0] + allBones[i][1]);
        if (p1Score < p2Score) winner = p1;
        else if (p2Score < p1Score) winner = p2;
        else winner = "draw";
      }
    }

    return { allBones, hands, board, leftEnd, rightEnd, boneyardCount: 28 - boneyardIndex, turn, winner };
  }, [events, otherUserId, start]);

  if (!start || !state) return <div className="text-white">لعبة ضومنة غير صالحة</div>;

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
      else if (canLeft && canRight) {
        // Ask user? For simplicity, prefer right.
        edge = "right";
      } else return; // Can't play
    }

    const payload: DominoMovePayload = { kind: "domino_move", gameId: start.gameId, by: me, boneIndex: idx, edge };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  const drawBone = () => {
    if (!myTurn || isDone || state.boneyardCount === 0) return;
    const payload: DominoDrawPayload = { kind: "domino_draw", gameId: start.gameId, by: me };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  const canDraw = myTurn && !isDone && state.boneyardCount > 0;
  
  // Can play any?
  let hasPlayable = false;
  if (state.board.length === 0) hasPlayable = true;
  else {
    for (const idx of myHand) {
      const [a, b] = state.allBones[idx];
      if (a === state.leftEnd || b === state.leftEnd || a === state.rightEnd || b === state.rightEnd) hasPlayable = true;
    }
  }

  const Dot = () => <div className="w-[3px] h-[3px] sm:w-1 sm:h-1 bg-black rounded-full" />;
  const renderHalf = (n: number) => {
    const dots = [];
    for(let i=0; i<n; i++) dots.push(<Dot key={i} />);
    // Very simple visual layout for dots
    return (
      <div className={`w-5 h-5 sm:w-6 sm:h-6 flex flex-wrap items-center justify-center gap-0.5 p-0.5 bg-[#fefae0] rounded-sm ${n === 0 ? "opacity-0" : ""}`}>
        {dots}
      </div>
    );
  };

  const renderDomino = (idx: number, isVertical: boolean = true, inverted: boolean = false) => {
    const [a, b] = state.allBones[idx];
    const top = inverted ? b : a;
    const bot = inverted ? a : b;
    return (
      <div className={`flex ${isVertical ? "flex-col w-6 h-12 sm:w-7 sm:h-14" : "flex-row w-12 h-6 sm:w-14 sm:h-7"} bg-[#fefae0] rounded-md border border-black/20 shadow-md p-0.5 items-center justify-between`}>
        {renderHalf(top)}
        <div className={`${isVertical ? "w-full h-px" : "h-full w-px"} bg-black/20`} />
        {renderHalf(bot)}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#2d1b11] overflow-hidden w-[280px] sm:w-[360px] shadow-xl">
      <div className="bg-[#4a2e1b] px-3 py-2 flex justify-between items-center border-b border-white/10">
        <div className="font-bold text-white text-[13px]">🎲 ضومنة (Dominoes)</div>
        <div className="text-[11px] text-[#ddd]">
          {isDone ? (state.winner === me ? "أنت فزت! 🎉" : state.winner === "draw" ? "تعادل!" : "الطرف الآخر فاز 😢") : (myTurn ? "دورك" : "دور الخصم")}
        </div>
      </div>

      {/* Opponent's Hand */}
      <div className="bg-black/20 px-2 py-1.5 flex items-center justify-between">
        <div className="text-[10px] text-[#aaa]">أحجار الخصم: {oppHandCount}</div>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(oppHandCount, 7) }).map((_, i) => (
            <div key={i} className="w-3 h-5 bg-[#fefae0] rounded-[2px] shadow-sm border border-black/20" />
          ))}
          {oppHandCount > 7 && <span className="text-white text-[10px] ml-1">+{oppHandCount - 7}</span>}
        </div>
      </div>

      {/* Board */}
      <div className="h-[120px] bg-[#1a3822] p-2 overflow-x-auto flex items-center shadow-inner relative">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />
        <div className="flex items-center gap-1 min-w-max px-4 relative z-10 mx-auto">
          {state.board.length === 0 ? (
            <div className="text-white/30 text-[12px] font-bold w-full text-center">اللوحة فارغة. ابدأ باللعب!</div>
          ) : (
            state.board.map((item, i) => (
              <div key={i} className="flex-shrink-0">
                {renderDomino(item.index, false, item.inverted)}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-black/20 px-3 py-2 flex items-center justify-between border-t border-white/10">
        <div className="text-[11px] text-[#ddd]">السحب: {state.boneyardCount} حجر</div>
        <button
          onClick={drawBone}
          disabled={!canDraw}
          className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${
            canDraw && !hasPlayable && myTurn ? "bg-[#f59e0b] text-white shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse" : "bg-white/10 text-white/50"
          }`}
        >
          سحب حجر
        </button>
      </div>

      {/* My Hand */}
      <div className="p-3 bg-[#3d2516]">
        <div className="text-[11px] text-white mb-2">أحجارك ({myHand.length}):</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {myHand.map((idx) => {
            const [a, b] = state.allBones[idx];
            let playable = false;
            if (myTurn && !isDone) {
              if (state.board.length === 0) playable = true;
              else if (a === state.leftEnd || b === state.leftEnd || a === state.rightEnd || b === state.rightEnd) playable = true;
            }
            return (
              <button
                key={idx}
                onClick={() => playBone(idx)}
                disabled={!playable}
                className={`transition-all ${playable ? "hover:-translate-y-1 cursor-pointer ring-2 ring-[#00d26a]" : "opacity-50 cursor-not-allowed"}`}
              >
                {renderDomino(idx, true)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
