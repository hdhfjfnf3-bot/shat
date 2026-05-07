import { useMemo, useState, useEffect } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown } from "lucide-react";

type SeegaStartPayload = { kind: "seega_start"; gameId: string; createdBy: string; createdAt: string; };
type SeegaMovePayload = { kind: "seega_move"; gameId: string; by: string; from: number | null; to: number; at: string; };
type SeegaPayload = SeegaStartPayload | SeegaMovePayload;

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

export function SeegaInline({ gameMessage, otherUserId, conversationId, allMessages, participants }: { gameMessage: Message; otherUserId: string; conversationId: string; allMessages: Message[]; participants?: import("@/lib/types").User[] }) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();

  const start = useMemo(() => safeJsonParse<SeegaStartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "seega_start" ? start.gameId : null;

  const moves = useMemo(() => {
    if (!gameId) return [] as SeegaMovePayload[];
    return allMessages
      .filter((m) => m.type === "game")
      .map((m) => safeJsonParse<SeegaPayload>(m.content))
      .filter((p): p is SeegaMovePayload => p !== null && p.kind === "seega_move" && p.gameId === gameId)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [allMessages, gameId]);

  const { board, phase, turn, winner, whitePlayer, blackPlayer, wCount, bCount } = useMemo(() => {
    const wPlayer = start?.createdBy.toLowerCase() || "";
    const bPlayer = wPlayer === me ? otherUserId.toLowerCase() : me;
    
    let currentBoard = Array(25).fill(null) as ("w" | "b" | null)[];
    let currentTurn: "w" | "b" = "w";
    let piecesPlaced = 0;
    
    for (const move of moves) {
      const isWhiteMove = move.by === wPlayer;
      const pieceColor = isWhiteMove ? "w" : "b";
      
      if (move.from === null) {
        // Placement phase
        currentBoard[move.to] = pieceColor;
        piecesPlaced++;
        currentTurn = currentTurn === "w" ? "b" : "w";
      } else {
        // Movement phase
        currentBoard[move.from] = null;
        currentBoard[move.to] = pieceColor;
        
        // Check captures
        const row = Math.floor(move.to / 5);
        const col = move.to % 5;
        const enemy = pieceColor === "w" ? "b" : "w";
        
        // Up
        if (row >= 2 && currentBoard[move.to - 5] === enemy && currentBoard[move.to - 10] === pieceColor) {
          currentBoard[move.to - 5] = null;
        }
        // Down
        if (row <= 2 && currentBoard[move.to + 5] === enemy && currentBoard[move.to + 10] === pieceColor) {
          currentBoard[move.to + 5] = null;
        }
        // Left
        if (col >= 2 && currentBoard[move.to - 1] === enemy && currentBoard[move.to - 2] === pieceColor) {
          currentBoard[move.to - 1] = null;
        }
        // Right
        if (col <= 2 && currentBoard[move.to + 1] === enemy && currentBoard[move.to + 2] === pieceColor) {
          currentBoard[move.to + 1] = null;
        }
        currentTurn = currentTurn === "w" ? "b" : "w";
      }
    }

    const currentPhase = piecesPlaced < 24 ? "placement" : "movement";
    
    let wLeft = 0;
    let bLeft = 0;
    for (let i = 0; i < 25; i++) {
      if (currentBoard[i] === "w") wLeft++;
      if (currentBoard[i] === "b") bLeft++;
    }

    let win = null;
    if (currentPhase === "movement") {
      if (bLeft === 0) win = "white";
      else if (wLeft === 0) win = "black";
    }

    const turnUsername = currentTurn === "w" ? wPlayer : bPlayer;

    return { 
      board: currentBoard, 
      phase: currentPhase, 
      turn: turnUsername, 
      winner: win,
      whitePlayer: wPlayer,
      blackPlayer: bPlayer,
      wCount: wLeft,
      bCount: bLeft
    };
  }, [moves, start, me, otherUserId]);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const myTurn = turn === me && !winner;
  const amIWhite = whitePlayer === me;
  const myColor = amIWhite ? "w" : "b";

  function handleClick(idx: number) {
    if (!myTurn || winner) return;

    if (phase === "placement") {
      if (board[idx] !== null) return;
      if (idx === 12) return; // Cannot place in center
      
      if (window.navigator?.vibrate) window.navigator.vibrate(10);
      sendMessage(conversationId, JSON.stringify({ kind: "seega_move", gameId, by: me, from: null, to: idx, at: new Date().toISOString() }), "game");
    } else {
      // Movement phase
      if (selectedIdx === null) {
        if (board[idx] === myColor) setSelectedIdx(idx);
      } else {
        if (board[idx] === myColor) {
          setSelectedIdx(idx);
        } else if (board[idx] === null) {
          // Is it adjacent?
          const sr = Math.floor(selectedIdx / 5);
          const sc = selectedIdx % 5;
          const tr = Math.floor(idx / 5);
          const tc = idx % 5;
          if ((Math.abs(sr - tr) === 1 && sc === tc) || (Math.abs(sc - tc) === 1 && sr === tr)) {
            if (window.navigator?.vibrate) window.navigator.vibrate([15, 10]);
            sendMessage(conversationId, JSON.stringify({ kind: "seega_move", gameId, by: me, from: selectedIdx, to: idx, at: new Date().toISOString() }), "game");
            setSelectedIdx(null);
          }
        }
      }
    }
  }

  if (!start || !gameId) return <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">لعبة سيجا غير صالحة.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-[95vw] sm:w-[85vw] md:w-[400px] max-w-full rounded-[32px] border border-white/10 bg-[#2d1b10] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] font-sans relative isolate mx-auto"
    >
      <div className="bg-gradient-to-r from-[#4a2c1a] to-[#3a2012] p-4 flex justify-between items-center shadow-lg relative z-10 border-b border-[#5a3a25]">
        <div>
          <div className="text-[16px] font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-amber-500 tracking-wide uppercase flex items-center gap-2">
            <span>🏜️</span> سيجا السيناوية
          </div>
          <div className={`text-[12px] font-bold mt-1.5 ${winner ? "text-amber-400" : myTurn ? "text-emerald-400" : "text-white/40"}`}>
            {winner ? (winner === (amIWhite ? "white" : "black") ? "لقد فزت! 👑" : "الخصم فاز!") : myTurn ? "دورك الآن!" : "في انتظار الخصم..."}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-[10px] font-bold text-white/50 bg-black/20 px-2 py-1 rounded-md">{phase === "placement" ? "مرحلة الرص" : "مرحلة الهجوم"}</div>
        </div>
      </div>

      <div className="p-5 bg-[#3a2214] relative flex justify-center">
        <div className="grid grid-cols-5 gap-1.5 bg-[#1a0e07] p-2 rounded-xl shadow-inner border border-white/5">
          {Array.from({ length: 25 }).map((_, i) => {
            const isCenter = i === 12;
            const piece = board[i];
            const isSelected = selectedIdx === i;
            // Highlight possible moves
            let isPossibleMove = false;
            if (phase === "movement" && selectedIdx !== null && piece === null) {
              const sr = Math.floor(selectedIdx / 5);
              const sc = selectedIdx % 5;
              const tr = Math.floor(i / 5);
              const tc = i % 5;
              if ((Math.abs(sr - tr) === 1 && sc === tc) || (Math.abs(sc - tc) === 1 && sr === tr)) {
                isPossibleMove = true;
              }
            }

            return (
              <motion.div
                key={i}
                onClick={() => handleClick(i)}
                whileHover={myTurn && (phase === "placement" && piece === null && !isCenter) || isPossibleMove || piece === myColor ? { scale: 0.95 } : {}}
                className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center rounded-lg cursor-pointer transition-all ${
                  isCenter && phase === "placement" ? "bg-[#2a1207] opacity-50" : 
                  isPossibleMove ? "bg-[#5a3a25] ring-2 ring-emerald-500 shadow-[inset_0_0_10px_rgba(16,185,129,0.3)]" :
                  isSelected ? "bg-[#4a2a15] ring-2 ring-amber-500" :
                  "bg-[#2d1b10] hover:bg-[#3d2516]"
                } border border-white/5 shadow-sm`}
              >
                {isCenter && piece === null && phase === "placement" && <span className="text-white/10 text-xl font-bold">X</span>}
                <AnimatePresence mode="popLayout">
                  {piece && (
                    <motion.div
                      key={`piece-${piece}-${i}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className={`w-[70%] h-[70%] rounded-full shadow-[inset_0_-2px_5px_rgba(0,0,0,0.5),0_4px_8px_rgba(0,0,0,0.6)] border-2 ${
                        piece === "w" ? "bg-gradient-to-br from-neutral-200 to-neutral-500 border-white/50" : "bg-gradient-to-br from-neutral-700 to-black border-neutral-600"
                      }`}
                    />
                  )}
                  {isPossibleMove && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#2d1a0f] border-t border-white/5 p-4 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-sm font-bold">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-br from-neutral-200 to-neutral-400 rounded-full shadow-md border border-white/20"></div>
          <span className={amIWhite ? "text-white" : "text-white/50"}>{whitePlayer === me ? "أنت" : whitePlayer.split(" ")[0]} ({wCount})</span>
        </div>
        <div className="text-white/20">VS</div>
        <div className="flex items-center gap-2">
          <span className={!amIWhite ? "text-white" : "text-white/50"}>{blackPlayer === me ? "أنت" : blackPlayer.split(" ")[0]} ({bCount})</span>
          <div className="w-4 h-4 bg-gradient-to-br from-neutral-700 to-black rounded-full shadow-md border border-white/10"></div>
        </div>
      </div>

      <AnimatePresence>
        {winner && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
            className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="flex flex-col items-center p-8 bg-[#3a2214] border border-[#ffcc00]/30 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative"
            >
              <Crown className={`w-20 h-20 mb-4 ${(winner === (amIWhite ? "white" : "black")) ? "text-amber-400" : "text-neutral-500"} drop-shadow-[0_0_30px_rgba(251,191,36,0.4)]`} />
              <div className="text-3xl font-black text-white drop-shadow-lg text-center mb-2">
                {winner === (amIWhite ? "white" : "black") ? "فزت بالسيجا! 🎉" : "خسرت اللعبة"}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
