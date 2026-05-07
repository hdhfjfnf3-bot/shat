import { useMemo, useState } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, HeartPulse } from "lucide-react";

type HangmanStartPayload = { kind: "hangman_start"; gameId: string; createdBy: string; createdAt: string; word: string; category: string; };
type HangmanGuessPayload = { kind: "hangman_guess"; gameId: string; by: string; letter: string; at: string; };
type HangmanPayload = HangmanStartPayload | HangmanGuessPayload;

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

const ARABIC_LETTERS = "ابتثجحخدذرزسشصضطظعغفقكلمنهويأإآؤئءةى".split("");

export function HangmanInline({ gameMessage, conversationId, allMessages }: { gameMessage: Message; conversationId: string; allMessages: Message[]; }) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();

  const start = useMemo(() => safeJsonParse<HangmanStartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "hangman_start" ? start.gameId : null;
  const word = start?.kind === "hangman_start" ? start.word : "";
  const category = start?.kind === "hangman_start" ? start.category : "";

  const guesses = useMemo(() => {
    if (!gameId) return [] as HangmanGuessPayload[];
    return allMessages
      .filter((m) => m.type === "game")
      .map((m) => safeJsonParse<HangmanPayload>(m.content))
      .filter((p): p is HangmanGuessPayload => p !== null && p.kind === "hangman_guess" && p.gameId === gameId)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [allMessages, gameId]);

  const { guessedLetters, wrongCount, isWin, isLoss } = useMemo(() => {
    const letters = new Set<string>();
    let mistakes = 0;
    
    // Spaces are automatically "guessed"
    const targetChars = new Set(word.split("").filter(c => c !== " "));
    let correctCount = 0;

    for (const guess of guesses) {
      if (letters.has(guess.letter)) continue;
      letters.add(guess.letter);
      
      if (word.includes(guess.letter)) {
        correctCount++;
      } else {
        mistakes++;
      }
    }

    const won = correctCount === targetChars.size && targetChars.size > 0;
    const lost = mistakes >= 6;

    return {
      guessedLetters: letters,
      wrongCount: mistakes,
      isWin: won,
      isLoss: lost,
    };
  }, [guesses, word]);

  const handleGuess = (letter: string) => {
    if (isWin || isLoss || guessedLetters.has(letter)) return;
    
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
    sendMessage(conversationId, JSON.stringify({ kind: "hangman_guess", gameId, by: me, letter, at: new Date().toISOString() }), "game");
  };

  if (!start || !gameId) return <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[#a8a8a8]">لعبة المشنقة غير صالحة.</div>;

  const MAX_MISTAKES = 6;
  const hpPercent = Math.max(0, 100 - (wrongCount / MAX_MISTAKES) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-[95vw] sm:w-[85vw] md:w-[420px] max-w-full rounded-[32px] border border-white/10 bg-[#1c1917] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] font-sans relative isolate mx-auto"
    >
      <div className="bg-gradient-to-r from-[#292524] to-[#44403c] p-4 flex justify-between items-center shadow-lg relative z-10 border-b border-white/[0.05]">
        <div>
          <div className="text-[16px] font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-red-400 tracking-wide flex items-center gap-2">
            <span>🪢</span> المشنقة التعاونية
          </div>
          <div className="text-[12px] font-bold text-orange-200 mt-1">تلميح: {category}</div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="text-[10px] text-white/50 mb-1">الفرص المتبقية</div>
          <div className="flex items-center gap-1">
            {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
              <HeartPulse key={i} className={`w-4 h-4 ${i < (MAX_MISTAKES - wrongCount) ? "text-red-500" : "text-white/10"}`} strokeWidth={3} />
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 relative flex flex-col items-center bg-[#1c1917]">
        {/* Draw Area (Optional, using simple shapes or just HP bar) */}
        <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden mb-8 border border-white/10">
          <motion.div 
            className="h-full bg-gradient-to-r from-red-600 to-orange-500"
            initial={{ width: "100%" }}
            animate={{ width: `${hpPercent}%` }}
            transition={{ type: "spring", stiffness: 100 }}
          />
        </div>

        {/* Word Display */}
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mb-8" dir="ltr">
          {word.split("").map((char, i) => {
            if (char === " ") return <div key={i} className="w-4" />; // Space
            const isGuessed = guessedLetters.has(char) || isLoss;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-8 h-10 sm:w-10 sm:h-12 flex items-center justify-center text-2xl sm:text-3xl font-black ${isGuessed ? (word.includes(char) ? "text-emerald-400" : "text-red-400") : "text-transparent"} transition-all`}>
                  {isGuessed ? char : "?"}
                </div>
                <div className={`w-full h-1 ${isGuessed && word.includes(char) ? "bg-emerald-500" : "bg-white/20"} rounded-full shadow-sm`} />
              </div>
            );
          })}
        </div>

        {/* Keyboard */}
        <div className="w-full max-w-[360px] mx-auto bg-black/30 p-3 rounded-2xl border border-white/5">
          <div className="flex flex-wrap justify-center gap-1.5" dir="rtl">
            {ARABIC_LETTERS.map(letter => {
              const isGuessed = guessedLetters.has(letter);
              const isCorrect = isGuessed && word.includes(letter);
              const isWrong = isGuessed && !word.includes(letter);

              return (
                <button
                  key={letter}
                  onClick={() => handleGuess(letter)}
                  disabled={isGuessed || isWin || isLoss}
                  className={`w-7 h-9 sm:w-8 sm:h-10 rounded-lg text-[14px] sm:text-[16px] font-bold transition-all ${
                    isCorrect ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" :
                    isWrong ? "bg-red-500/10 text-red-500/50 border border-red-500/20 opacity-50" :
                    "bg-white/5 text-white/90 border border-white/10 hover:bg-white/20 active:scale-95"
                  } disabled:cursor-not-allowed`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(isWin || isLoss) && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
            className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="flex flex-col items-center p-8 bg-[#292524] border border-[#ffcc00]/30 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative"
            >
              {isWin ? (
                <>
                  <div className="text-[60px] drop-shadow-[0_0_30px_rgba(16,185,129,0.6)] mb-2">🎉</div>
                  <div className="text-3xl font-black text-emerald-400 drop-shadow-lg text-center mb-1">عاش جداً!</div>
                  <div className="text-white/60">لقد خمنتم الكلمة الصحيحة</div>
                </>
              ) : (
                <>
                  <Skull className="w-20 h-20 text-red-500 mb-4 drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]" />
                  <div className="text-3xl font-black text-red-500 drop-shadow-lg text-center mb-1">مشنوق!</div>
                  <div className="text-white/60 text-center">الكلمة كانت:<br/><span className="text-white font-bold text-xl mt-2 block">{word}</span></div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
