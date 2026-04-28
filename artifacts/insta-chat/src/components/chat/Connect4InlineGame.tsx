import { useMemo } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";

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
  }, [events, otherUserId, start]);

  if (!start || !state) return <div className="text-white">لعبة أربعة في صف غير صالحة</div>;

  const myTurn = state.turn === me;
  const isDone = state.winner !== null || state.isDraw;

  const dropToken = (col: number) => {
    if (!myTurn || isDone || state.board[0][col] !== null) return;
    const payload: C4MovePayload = { kind: "c4_move", gameId: start.gameId, by: me, col };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1a2b4c] overflow-hidden w-full shadow-xl">
      <div className="bg-[#0f192e] px-3 py-2 flex justify-between items-center border-b border-white/10">
        <div className="font-bold text-white text-[13px]">🔵🔴 4 في صف (Connect 4)</div>
        <div className="text-[11px] text-[#ddd]">
          {isDone ? (state.winner === me ? "أنت فزت! 🎉" : state.winner === state.p2 ? "الخصم فاز 😢" : "تعادل!") : (myTurn ? "دورك" : "دور الخصم")}
        </div>
      </div>

      <div className="p-3">
        <div className="bg-blue-600/20 p-2 rounded-xl shadow-inner border border-blue-500/30 backdrop-blur-sm">
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {/* Headers for clicking */}
            {Array.from({ length: COLS }).map((_, col) => (
              <button
                key={`btn-${col}`}
                onClick={() => dropToken(col)}
                disabled={!myTurn || isDone || state.board[0][col] !== null}
                className="h-6 flex justify-center items-center group mb-1"
              >
                {!isDone && myTurn && state.board[0][col] === null && (
                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            ))}

            {/* Board Cells */}
            {state.board.map((row, rIdx) => 
              row.map((cell, cIdx) => {
                const isWinning = state.winningCells.some(w => w.r === rIdx && w.c === cIdx);
                const isMe = cell === me;
                const isP1 = cell === state.p1;
                
                return (
                  <div key={`${rIdx}-${cIdx}`} className="aspect-square bg-[#0a1526] rounded-full flex items-center justify-center p-0.5 sm:p-1 shadow-inner relative">
                    {cell && (
                      <div className={`w-full h-full rounded-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.5)] transition-transform animate-in slide-in-from-top-4 duration-300 ${
                        isP1 ? "bg-[#ef4444]" : "bg-[#eab308]"
                      } ${isWinning ? "ring-2 ring-white animate-pulse" : ""}`} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center text-[11px]">
          <div className="flex items-center gap-1.5 text-white bg-black/20 px-2 py-1 rounded-md border border-white/5">
            <div className={`w-3 h-3 rounded-full ${state.p1 === me ? "bg-[#ef4444]" : "bg-[#eab308]"}`} /> 
            إنت {state.p1 === me ? "(أحمر)" : "(أصفر)"}
          </div>
          <div className="flex items-center gap-1.5 text-[#a8a8a8] bg-black/20 px-2 py-1 rounded-md border border-white/5">
            <div className={`w-3 h-3 rounded-full ${state.p1 !== me ? "bg-[#ef4444]" : "bg-[#eab308]"}`} /> 
            الطرف الآخر
          </div>
        </div>
      </div>
    </div>
  );
}
