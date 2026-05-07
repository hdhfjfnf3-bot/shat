import { useState, useMemo } from "react";
import { Message, CURRENT_USER } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import { Send, Zap, Shuffle, Trophy, Clock, SearchCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  gameMessage: Message;
  conversationId: string;
  allMessages: Message[];
}

const WORDS = [
  "فراولة", "تلفزيون", "مبرمج", "سفينة", "مكتبة", "مستشفى", "طيارة", "بحرية",
  "خوارزمية", "ميكروفون", "كيبورد", "انستجرام", "سيارة", "اسكندرية", "عنكبوت"
];

function shuffleString(str: string) {
  const arr = str.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join(" ");
}

export function ScrambledWordInline({ gameMessage, conversationId, allMessages }: Props) {
  const { sendMessage } = useChatStore();
  const [guess, setGuess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const gameStateMsg = allMessages.find(
    (m) => m.replyToId === gameMessage.id && m.content.startsWith('{"kind":"scramble_state"')
  );

  const state = useMemo(() => {
    if (!gameStateMsg) return null;
    try {
      return JSON.parse(gameStateMsg.content);
    } catch {
      return null;
    }
  }, [gameStateMsg]);

  const initializeGame = () => {
    setIsLoading(true);
    setTimeout(() => {
      const w = WORDS[Math.floor(Math.random() * WORDS.length)];
      const scrambled = shuffleString(w);
      const initialState = {
        kind: "scramble_state",
        word: w,
        scrambled,
        winner: null,
        winnerTime: null,
        startTime: Date.now(),
      };
      sendMessage(conversationId, JSON.stringify(initialState), "game", gameMessage.id);
      setIsLoading(false);
    }, 400);
  };

  if (!state) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-[85vw] sm:w-[70vw] md:w-[320px] rounded-[24px] p-[2px] bg-gradient-to-br from-[#11998e] to-[#38ef7d] shadow-[0_20px_50px_rgba(17,153,142,0.4)] relative overflow-hidden isolate hardware-accelerated mx-auto"
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl rounded-[22px] -z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(17,153,142,0.5),transparent_70%)] rounded-[22px] -z-10 blur-xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center p-6 border border-white/10 rounded-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          
          <motion.div 
            animate={{ rotate: [-5, 5, -5], scale: [1, 1.1, 1] }} 
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="mb-4 relative"
          >
            <div className="absolute inset-0 bg-[#38ef7d] blur-xl opacity-50 rounded-full" />
            <SearchCode className="w-14 h-14 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] relative z-10" />
          </motion.div>
          
          <h3 className="text-[19px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a8ff78] uppercase mb-1.5 drop-shadow-sm">فك الشفرة</h3>
          <p className="text-[13px] text-white/80 font-bold mb-6">كلمة حروفها ملخبطة، أسرع واحد يرتبها يكسب!</p>
          
          <motion.button
            whileHover={!isLoading ? { scale: 1.05, boxShadow: "0 10px 25px rgba(17,153,142,0.5)" } : {}}
            whileTap={!isLoading ? { scale: 0.95 } : {}}
            onClick={initializeGame}
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white font-black text-[15px] rounded-[16px] transition-all relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <Zap className="w-4 h-4" />
                ابدأ اللغز
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    );
  }

  const { word, scrambled, winner, startTime, winnerTime } = state;
  const isFinished = !!winner;

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFinished || !guess.trim()) return;

    if (guess.trim() === word) {
      // Won!
      const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
      const newState = {
        ...state,
        winner: CURRENT_USER.username,
        winnerTime: timeTaken,
      };
      useChatStore.getState().editMessage(conversationId, gameStateMsg!.id, JSON.stringify(newState));
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setGuess("");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`w-[85vw] sm:w-[70vw] md:w-[340px] rounded-[24px] border ${isFinished ? "border-[#00d26a]/30" : "border-white/10"} overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] relative isolate hardware-accelerated mx-auto bg-black/60 backdrop-blur-3xl`}
    >
      {/* Background glow when finished */}
      <AnimatePresence>
        {isFinished && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.2 }} 
            className="absolute inset-0 bg-[#00d26a] blur-[60px] -z-10 pointer-events-none" 
          />
        )}
      </AnimatePresence>

      <div className={`bg-gradient-to-br ${isFinished ? "from-[#00d26a]/20 to-[#00b25a]/20" : "from-[#11998e]/20 to-[#38ef7d]/20"} border-b border-white/[0.05] px-4 py-3 relative overflow-hidden backdrop-blur-md`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <Shuffle className={`w-5 h-5 ${isFinished ? "text-[#00d26a]" : "text-[#38ef7d]"} drop-shadow-[0_0_8px_rgba(56,239,125,0.8)]`} />
            <span className={`text-[13px] font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-${isFinished ? "[#00d26a]" : "[#a8ff78]"} drop-shadow-md`}>فك الشفرة</span>
          </div>
          {isFinished && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[11px] font-bold bg-[#00d26a]/20 text-[#00d26a] px-2 py-0.5 rounded-full border border-[#00d26a]/30 flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              تم الحل
            </motion.div>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col items-center relative z-10">
        
        <AnimatePresence mode="wait">
          {!isFinished ? (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              className="w-full flex flex-col items-center"
            >
              <div className="text-[12px] font-bold text-[#a8a8a8] mb-3 text-center">
                رتب الحروف دي عشان تطلّع الكلمة الصح:
              </div>
              
              <div className="relative w-full mb-5 preserve-3d">
                <div className="absolute inset-0 bg-[#38ef7d]/10 blur-xl rounded-xl" />
                <motion.div 
                  animate={{ rotateY: [-2, 2, -2], rotateX: [2, -2, 2] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                  className="text-[32px] font-black tracking-[12px] text-white bg-white/5 py-5 px-6 rounded-2xl border border-white/10 w-full text-center relative z-10 shadow-[0_10px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]" dir="ltr"
                >
                  {scrambled}
                </motion.div>
              </div>

              <form onSubmit={handleGuess} className="w-full flex gap-2 relative">
                <motion.div animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}} transition={{ duration: 0.4 }} className="flex-1">
                  <input
                    type="text"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="اكتب الكلمة هنا..."
                    className={`w-full bg-black/40 border rounded-[16px] px-4 py-3.5 text-white text-[15px] font-bold focus:outline-none transition-all shadow-inner ${shake ? "border-[#ff4d4f] shadow-[inset_0_0_10px_rgba(255,77,79,0.5)]" : "border-white/10 focus:border-[#38ef7d]/50 focus:bg-white/5"}`}
                  />
                </motion.div>
                <motion.button
                  whileHover={guess.trim() ? { scale: 1.05 } : {}}
                  whileTap={guess.trim() ? { scale: 0.95 } : {}}
                  type="submit"
                  disabled={!guess.trim()}
                  className={`w-[54px] h-[54px] flex items-center justify-center rounded-[16px] text-white transition-all border ${
                    guess.trim()
                      ? "bg-gradient-to-br from-[#11998e] to-[#38ef7d] border-[#38ef7d]/50 shadow-[0_5px_15px_rgba(56,239,125,0.3)]"
                      : "bg-white/5 border-white/5 text-white/30 cursor-not-allowed"
                  }`}
                >
                  <Send className="w-5 h-5 -ml-1 translate-y-[1px]" />
                </motion.button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="won"
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-full bg-gradient-to-b from-[#00d26a]/20 to-transparent border border-[#00d26a]/30 rounded-[20px] p-5 text-center relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d26a]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              
              <motion.div animate={{ rotateY: 360 }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }} className="text-[40px] mb-2 drop-shadow-[0_0_15px_rgba(0,210,106,0.8)]">🏆</motion.div>
              
              <div className="text-[14px] font-bold text-white/80 mb-1">الكلمة كانت:</div>
              <div className="text-[26px] font-black text-[#00d26a] mb-4 tracking-wider drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]">{word}</div>
              
              <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center justify-center gap-3">
                <img src={allMessages.find(m => m.senderId === winner)?.senderId === CURRENT_USER.id ? CURRENT_USER.avatarUrl : `https://api.dicebear.com/7.x/avataaars/svg?seed=${winner}`} className="w-8 h-8 rounded-full border border-white/20" alt="winner" />
                <div className="text-right">
                  <div className="text-[13px] font-black text-white">{winner}</div>
                  <div className="text-[11px] font-bold text-[#a8a8a8] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#00d26a]" />
                    حلها في {winnerTime} ثانية
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={initializeGame}
                className="mt-5 w-full py-3 bg-gradient-to-r from-[#00d26a] to-[#00b25a] text-black font-black text-[14px] rounded-[14px] transition-all flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(0,210,106,0.3)]"
              >
                <Shuffle className="w-4 h-4" />
                لغز جديد
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
