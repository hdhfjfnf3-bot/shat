import { useMemo } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";

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
  
  // Creator is always X, Other is O
  const getSymbol = (player: string) => player.toLowerCase() === start.createdBy.toLowerCase() ? "❌" : "⭕";
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

  const statusText = state.winner 
    ? (state.winner === me.toLowerCase() ? "كسبت! 🎉" : "خسرت 😢")
    : state.isDraw 
      ? "تعادل 🤝"
      : myTurn 
        ? "دورك العب" 
        : "دور الطرف التاني";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-4 flex flex-col items-center">
      <div className="text-white font-bold mb-1">إكس أو (X O)</div>
      <div className={`text-[12px] mb-4 font-medium ${isDone ? (state.winner === me.toLowerCase() ? "text-[#00d26a]" : "text-[#ed4956]") : "text-[#a8a8a8]"}`}>
        {statusText}
      </div>

      <div className="grid grid-cols-3 gap-2 bg-white/10 p-2 rounded-xl">
        {state.board.map((cell, i) => {
          const isWinningCell = state.winningLine?.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              disabled={isDone || !myTurn || cell !== null}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg text-2xl flex items-center justify-center transition-all ${
                isWinningCell ? "bg-[#00d26a]/20 shadow-[0_0_15px_rgba(0,210,106,0.3)]" : 
                cell ? "bg-[#262626]" : "bg-[#141414] hover:bg-white/10"
              }`}
            >
              {cell ? getSymbol(cell) : ""}
            </button>
          );
        })}
      </div>
      
      {!isDone && (
        <div className="mt-4 flex items-center gap-2 text-[12px] text-[#555]">
          أنت تلعب كـ <span className="text-white">{mySymbol}</span>
        </div>
      )}
    </div>
  );
}
