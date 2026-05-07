import { useMemo, useState, useEffect } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { Trophy, Crown, Check } from "lucide-react";

type ChessStartPayload = { kind: "chess_start"; gameId: string; createdBy: string; createdAt: string; };
type ChessMovePayload = { kind: "chess_move"; gameId: string; by: string; from: string; to: string; promotion?: string; at: string; };
type ChessPayload = ChessStartPayload | ChessMovePayload;

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

export function ChessInline({ gameMessage, otherUserId, conversationId, allMessages, participants }: { gameMessage: Message; otherUserId: string; conversationId: string; allMessages: Message[]; participants?: import("@/lib/types").User[] }) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();

  const start = useMemo(() => safeJsonParse<ChessStartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "chess_start" ? start.gameId : null;

  const moves = useMemo(() => {
    if (!gameId) return [] as ChessMovePayload[];
    return allMessages
      .filter((m) => m.type === "game")
      .map((m) => safeJsonParse<ChessPayload>(m.content))
      .filter((p): p is ChessMovePayload => p !== null && p.kind === "chess_move" && p.gameId === gameId)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [allMessages, gameId]);

  const { chess, isGameOver, winner, turn, whitePlayer, blackPlayer, isCheck, isDraw } = useMemo(() => {
    const game = new Chess();
    for (const move of moves) {
      try { game.move({ from: move.from, to: move.to, promotion: move.promotion }); } catch (e) {}
    }
    
    const wPlayer = start?.createdBy.toLowerCase() || "";
    const bPlayer = wPlayer === me ? otherUserId.toLowerCase() : me;
    
    const turnColor = game.turn() === "w" ? "white" : "black";
    const turnUsername = turnColor === "white" ? wPlayer : bPlayer;

    let win = null;
    if (game.isCheckmate()) win = turnColor === "w" ? "black" : "white";

    return { 
      chess: game, 
      isGameOver: game.isGameOver(), 
      winner: win,
      isCheck: game.isCheck(),
      isDraw: game.isDraw() || game.isStalemate() || game.isThreefoldRepetition(),
      turn: turnUsername,
      whitePlayer: wPlayer,
      blackPlayer: bPlayer
    };
  }, [moves, start, me, otherUserId]);

  const myTurn = turn === me;
  const amIWhite = whitePlayer === me;
  const boardOrientation = amIWhite ? "white" : "black";

  const [moveFrom, setMoveFrom] = useState("");
  const [optionSquares, setOptionSquares] = useState({});

  function getMoveOptions(square: string) {
    const gameMoves = chess.moves({ square, verbose: true });
    if (gameMoves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    gameMoves.map((move) => {
      newSquares[move.to] = {
        background:
          chess.get(move.to as any) && chess.get(move.to as any).color !== chess.get(square as any).color
            ? "radial-gradient(circle, rgba(237,73,86,.4) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,210,106,.4) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });
    newSquares[square] = { background: "rgba(255, 204, 0, 0.4)" };
    setOptionSquares(newSquares);
    return true;
  }

  function onSquareClick(square: string) {
    if (isGameOver || !myTurn) return;

    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }

    const gameCopy = new Chess(chess.fen());
    try {
      const move = gameCopy.move({ from: moveFrom, to: square, promotion: "q" });
      if (move) {
        if (window.navigator?.vibrate) window.navigator.vibrate([10, 5, 10]);
        sendMessage(conversationId, JSON.stringify({ kind: "chess_move", gameId, by: me, from: moveFrom, to: square, promotion: "q", at: new Date().toISOString() }), "game");
        setMoveFrom("");
        setOptionSquares({});
        return;
      }
    } catch(e) {}
    
    const hasMoveOptions = getMoveOptions(square);
    if (hasMoveOptions) setMoveFrom(square);
    else { setMoveFrom(""); setOptionSquares({}); }
  }

  function onPieceDrop(sourceSquare: string, targetSquare: string, piece: string) {
    if (isGameOver || !myTurn) return false;
    
    const gameCopy = new Chess(chess.fen());
    try {
      const move = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: piece[1].toLowerCase() ?? "q" });
      if (move) {
        if (window.navigator?.vibrate) window.navigator.vibrate([15]);
        sendMessage(conversationId, JSON.stringify({ kind: "chess_move", gameId, by: me, from: sourceSquare, to: targetSquare, promotion: move.promotion, at: new Date().toISOString() }), "game");
        setMoveFrom("");
        setOptionSquares({});
        return true;
      }
    } catch(e) { return false; }
    return false;
  }

  if (!start || !gameId) return <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">لعبة شطرنج غير صالحة.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-[95vw] sm:w-[85vw] md:w-[460px] max-w-full rounded-[32px] border border-white/10 bg-[#1a1a1a] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] font-sans relative isolate mx-auto"
    >
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 p-4 flex justify-between items-center shadow-lg relative z-10 border-b border-white/[0.05]">
        <div>
          <div className="text-[16px] font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 to-amber-400 tracking-wide uppercase drop-shadow-md flex items-center gap-2">
            <span>♟️</span> شطرنج كلاسيكي
          </div>
          <div className={`text-[12px] font-bold mt-1.5 ${isGameOver ? "text-rose-400" : myTurn ? "text-emerald-400" : "text-white/40"}`}>
            {isGameOver ? (winner ? (winner === (amIWhite ? "white" : "black") ? "لقد فزت! 👑" : "الخصم فاز! 👑") : "تعادل!") : myTurn ? "دورك الآن!" : "في انتظار الخصم..."}
          </div>
        </div>
        {!isGameOver && isCheck && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1, color: ["#ef4444", "#fca5a5", "#ef4444"] }} transition={{ repeat: Infinity, duration: 1 }} className="bg-red-500/20 px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 text-xs font-black shadow-[0_0_15px_rgba(239,68,68,0.4)]">
            كش ملك!
          </motion.div>
        )}
      </div>

      <div className="p-4 bg-black/60 relative">
        <div className="rounded-[8px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.8)] border-4 border-neutral-800">
          <Chessboard 
            position={chess.fen()} 
            onPieceDrop={onPieceDrop}
            onSquareClick={onSquareClick}
            boardOrientation={boardOrientation}
            customSquareStyles={optionSquares}
            customDarkSquareStyle={{ backgroundColor: "#769656" }}
            customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
            animationDuration={300}
          />
        </div>
      </div>

      {/* Info Footer */}
      <div className="bg-neutral-900 border-t border-white/[0.05] p-4 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-sm font-bold">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
          <span className={amIWhite ? "text-white" : "text-white/50"}>{whitePlayer === me ? "أنت" : whitePlayer.split(" ")[0]}</span>
        </div>
        <div className="text-white/20">VS</div>
        <div className="flex items-center gap-2">
          <span className={!amIWhite ? "text-white" : "text-white/50"}>{blackPlayer === me ? "أنت" : blackPlayer.split(" ")[0]}</span>
          <div className="w-3 h-3 bg-neutral-950 border border-white/20 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.8)]"></div>
        </div>
      </div>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
            className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="flex flex-col items-center p-8 bg-neutral-900 border border-white/10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative"
            >
              <Crown className={`w-20 h-20 mb-4 ${(winner === (amIWhite ? "white" : "black")) ? "text-amber-400" : "text-neutral-500"} drop-shadow-[0_0_30px_rgba(251,191,36,0.4)]`} />
              <div className="text-3xl font-black text-white drop-shadow-lg text-center mb-2">
                {isDraw ? "تعادل!" : (winner === (amIWhite ? "white" : "black") ? "كش مات! فزت 🎉" : "خسرت اللعبة")}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
