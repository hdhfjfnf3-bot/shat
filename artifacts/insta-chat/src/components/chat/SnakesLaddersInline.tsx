import { useMemo } from "react";

import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";

type SlStartPayload = {
  kind: "sl_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
};

type SlRollPayload = {
  kind: "sl_roll";
  gameId: string;
  by: string;
  value: 1 | 2 | 3 | 4 | 5 | 6;
  at: string;
};

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

const JUMPS: Record<number, number> = {
  2: 38,
  7: 14,
  8: 31,
  15: 26,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  78: 98,
  87: 94,
  16: 6,
  46: 25,
  49: 11,
  62: 19,
  64: 60,
  74: 53,
  89: 68,
  92: 88,
  95: 75,
  99: 80,
};

function isLadder(from: number): boolean {
  const to = JUMPS[from];
  return typeof to === "number" && to > from;
}

function isSnake(from: number): boolean {
  const to = JUMPS[from];
  return typeof to === "number" && to < from;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function nextPos(pos: number, roll: number): { landed: number; final: number; jumpTo?: number } {
  const landed = clamp(pos + roll, 1, 100);
  const jumpTo = JUMPS[landed];
  if (typeof jumpTo === "number") {
    return { landed, final: jumpTo, jumpTo };
  }
  return { landed, final: landed };
}

export function SnakesLaddersInline({
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

  const start = useMemo(() => safeJsonParse<SlStartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "sl_start" ? start.gameId : null;

  const rolls = useMemo(() => {
    if (!gameId) return [] as SlRollPayload[];
    const out: SlRollPayload[] = [];
    for (const m of allMessages) {
      if (m.type !== "game") continue;
      const p = safeJsonParse<SlRollPayload>(m.content);
      if (!p || p.kind !== "sl_roll" || p.gameId !== gameId) continue;
      out.push(p);
    }
    return out;
  }, [allMessages, gameId]);

  const state = useMemo(() => {
    if (!gameId) {
      return {
        mePos: 1,
        otherPos: 1,
        turn: me,
        winner: null as string | null,
        lastMove: null as null | { by: string; from: number; landed: number; final: number; roll: number },
      };
    }

    let mePos = 1;
    let otherPos = 1;
    let turn = (start?.createdBy ?? me).toLowerCase();
    let winner: string | null = null;
    let lastMove: null | { by: string; from: number; landed: number; final: number; roll: number } = null;

    for (const r of rolls) {
      if (winner) break;
      const by = r.by.toLowerCase();
      const isMe = by === me.toLowerCase();
      const from = isMe ? mePos : otherPos;
      const { landed, final } = nextPos(from, r.value);
      if (isMe) mePos = final;
      else otherPos = final;
      lastMove = { by, from, landed, final, roll: r.value };
      if (final >= 100) {
        winner = by;
        break;
      }
      turn = by === me.toLowerCase() ? otherUserId : me.toLowerCase();
    }

    return { mePos, otherPos, turn, winner, lastMove };
  }, [gameId, me, otherUserId, rolls, start?.createdBy]);

  if (!start || !gameId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
        رسالة لعبة السلم والثعبان غير صالحة.
      </div>
    );
  }

  const myTurn = state.turn === me.toLowerCase();
  const isDone = Boolean(state.winner);

  const rollDice = () => {
    if (!gameId) return;
    if (isDone) return;
    if (!myTurn) return;
    const value = (Math.floor(Math.random() * 6) + 1) as SlRollPayload["value"];
    const payload: SlRollPayload = {
      kind: "sl_roll",
      gameId,
      by: me.toLowerCase(),
      value,
      at: new Date().toISOString(),
    };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  const headline = isDone
    ? state.winner === me.toLowerCase()
      ? "أنت كسبت! 👑"
      : "الطرف التاني كسب! 👑"
    : myTurn
      ? "دورك ترمي النرد"
      : "مستني الطرف التاني";

  const last = state.lastMove
    ? `آخر رمية: ${state.lastMove.roll} — ${state.lastMove.from} → ${state.lastMove.landed}${
        state.lastMove.final !== state.lastMove.landed ? ` → ${state.lastMove.final}` : ""
      }`
    : "محدش رمى لسه.";

  const BOARD_CELLS = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const row = Math.floor(i / 10);
      const realRow = 9 - row;
      const col = i % 10;
      return realRow % 2 !== 0 ? realRow * 10 + 10 - col : realRow * 10 + col + 1;
    });
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden sm:w-[320px] w-[260px]">
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-white tracking-wide">🐍🪜 السلم والثعبان</div>
            <div className="text-[12px] text-[#a8a8a8] mt-0.5">{headline}</div>
          </div>
          <button
            onClick={rollDice}
            disabled={!myTurn || isDone}
            className={`px-3 py-1.5 rounded-xl font-bold text-[13px] transition-all ${
              myTurn && !isDone
                ? "bg-[#00d26a] text-black shadow-[0_0_15px_rgba(0,210,106,0.3)] active:scale-95"
                : "bg-white/5 text-[#555] cursor-not-allowed"
            }`}
          >
            🎲 إرمي
          </button>
        </div>
        <div className="mt-2 text-[11px] text-[#888]">{last}</div>
      </div>

      <div className="p-2 pt-0">
        <div className="grid grid-cols-10 gap-0.5 bg-black/40 p-1 rounded-xl border border-white/[0.04] relative">
          {BOARD_CELLS.map((cell) => {
            const hasMe = state.mePos === cell;
            const hasOther = state.otherPos === cell;
            const isLadd = isLadder(cell);
            const isSnk = isSnake(cell);
            
            return (
              <div
                key={cell}
                className={`relative aspect-square flex items-center justify-center rounded-[4px] text-[8px] sm:text-[10px] font-medium transition-colors ${
                  isLadd ? "bg-blue-500/20 text-blue-300" :
                  isSnk ? "bg-red-500/20 text-red-300" :
                  cell % 2 === 0 ? "bg-white/[0.03] text-[#555]" : "bg-white/[0.06] text-[#777]"
                }`}
              >
                {cell}
                
                {/* Player Pins */}
                <div className="absolute inset-0 flex items-center justify-center gap-0.5 pointer-events-none">
                  {hasOther && (
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ed4956] shadow-[0_0_8px_rgba(237,73,86,0.8)] z-10" />
                  )}
                  {hasMe && (
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#0095f6] shadow-[0_0_8px_rgba(0,149,246,0.8)] z-20 border-[1.5px] border-black" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-3 pb-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-white">
          <div className="w-2.5 h-2.5 rounded-full bg-[#0095f6]" /> إنت
        </div>
        <div className="flex items-center gap-1.5 text-[#a8a8a8]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ed4956]" /> الطرف التاني
        </div>
      </div>
    </div>
  );
}

