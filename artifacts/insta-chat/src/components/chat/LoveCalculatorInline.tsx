import { useState, useMemo, useEffect } from "react";
import { Message } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import { Heart, Sparkles, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  gameMessage: Message;
  conversationId: string;
  allMessages: Message[];
}

export function LoveCalculatorInline({ gameMessage, conversationId, allMessages }: Props) {
  const { sendMessage } = useChatStore();
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);

  const gameStateMsg = allMessages.find(
    (m) => m.replyToId === gameMessage.id && m.content.startsWith('{"kind":"lovecalc_state"')
  );

  const state = useMemo(() => {
    if (!gameStateMsg) return null;
    try { return JSON.parse(gameStateMsg.content); } catch { return null; }
  }, [gameStateMsg]);

  // Use a stable, deterministic way to calculate percentage based on names
  const calculateLove = (n1: string, n2: string) => {
    const combined = (n1.toLowerCase().trim() + n2.toLowerCase().trim()).replace(/\s+/g, '');
    let sum = 0;
    for (let i = 0; i < combined.length; i++) {
      sum += combined.charCodeAt(i);
    }
    return sum % 101;
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name1.trim() || !name2.trim()) return;
    
    setIsCalculating(true);
    setTimeout(() => {
      const percentage = calculateLove(name1, name2);
      
      let message = "";
      if (percentage > 90) message = "توأم روح! مستحيل يسيبوا بعض 💍✨";
      else if (percentage > 75) message = "قصة حب جامدة جداً! ❤️🔥";
      else if (percentage > 50) message = "في إعجاب، محتاجين شوية مجهود 😉";
      else if (percentage > 30) message = "فريندز زون قوي، بلاش عشم 😅";
      else message = "مفيش أمل خالص! بلوك أريح 💔🏃‍♂️";

      const newState = { kind: "lovecalc_state", name1: name1.trim(), name2: name2.trim(), percentage, message };
      sendMessage(conversationId, JSON.stringify(newState), "game", gameMessage.id);
      setIsCalculating(false);
      setName1("");
      setName2("");
    }, 1500); // Dramatic pause
  };

  if (!state) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-[85vw] sm:w-[70vw] md:w-[320px] rounded-[24px] p-[2px] bg-gradient-to-br from-[#ff0844]/50 to-[#ffb199]/50 shadow-[0_20px_50px_rgba(255,8,68,0.3)] relative overflow-hidden isolate hardware-accelerated"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff0844] to-[#ffb199] blur-xl opacity-30 -z-10" />
        <div className="bg-black/40 backdrop-blur-3xl rounded-[22px] p-6 text-white relative z-10 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }} 
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex justify-center mb-3 drop-shadow-[0_0_15px_rgba(255,8,68,0.8)]"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ff0844] to-[#ffb199] flex items-center justify-center border-2 border-white/20 shadow-[0_0_30px_rgba(255,8,68,0.5)]">
              <Heart className="w-8 h-8 fill-white text-white drop-shadow-md" />
            </div>
          </motion.div>
          
          <div className="text-center mb-5">
            <h3 className="text-[18px] font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-[#ffb199] mb-1 drop-shadow-sm">مقياس الحب</h3>
            <p className="text-[13px] text-white/70 font-bold">عايز تعرف نسبة التوافق بينكم؟</p>
          </div>
          
          <form onSubmit={handleCalculate} className="w-full flex flex-col gap-3">
            <div className="relative group">
              <input
                type="text"
                value={name1}
                onChange={(e) => setName1(e.target.value)}
                placeholder="الاسم الأول"
                className="w-full bg-black/30 border border-white/10 placeholder:text-white/40 rounded-[14px] px-4 py-3.5 text-white font-bold text-[15px] focus:outline-none focus:border-[#ff0844]/50 focus:bg-white/5 transition-all text-center shadow-inner"
              />
              <div className="absolute inset-0 rounded-[14px] pointer-events-none border border-[#ff0844]/0 group-focus-within:border-[#ff0844]/50 group-focus-within:shadow-[0_0_15px_rgba(255,8,68,0.3)] transition-all" />
            </div>

            <div className="flex justify-center -my-3 relative z-10">
              <motion.div 
                animate={name1 && name2 ? { scale: [1, 1.2, 1], filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(0deg)"] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff0844] to-[#ffb199] border-2 border-black flex items-center justify-center text-white shadow-[0_0_10px_rgba(255,8,68,0.5)]"
              >
                <Sparkles className="w-4 h-4 fill-white" />
              </motion.div>
            </div>

            <div className="relative group">
              <input
                type="text"
                value={name2}
                onChange={(e) => setName2(e.target.value)}
                placeholder="الاسم التاني"
                className="w-full bg-black/30 border border-white/10 placeholder:text-white/40 rounded-[14px] px-4 py-3.5 text-white font-bold text-[15px] focus:outline-none focus:border-[#ff0844]/50 focus:bg-white/5 transition-all text-center shadow-inner"
              />
              <div className="absolute inset-0 rounded-[14px] pointer-events-none border border-[#ff0844]/0 group-focus-within:border-[#ff0844]/50 group-focus-within:shadow-[0_0_15px_rgba(255,8,68,0.3)] transition-all" />
            </div>

            <motion.button
              whileHover={name1.trim() && name2.trim() && !isCalculating ? { scale: 1.03, boxShadow: "0 0 20px rgba(255,8,68,0.4)" } : {}}
              whileTap={name1.trim() && name2.trim() && !isCalculating ? { scale: 0.95 } : {}}
              type="submit"
              disabled={!name1.trim() || !name2.trim() || isCalculating}
              className={[
                "mt-2 w-full py-3.5 font-black text-[15px] rounded-[14px] transition-all relative overflow-hidden",
                name1.trim() && name2.trim() && !isCalculating
                  ? "bg-gradient-to-r from-[#ff0844] to-[#ffb199] text-white shadow-[0_10px_20px_rgba(255,8,68,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]"
                  : "bg-white/5 text-white/30 cursor-not-allowed border border-white/10"
              ].join(" ")}
            >
              {isCalculating ? (
                <div className="flex items-center justify-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                  <span>جاري الحساب...</span>
                </div>
              ) : (
                "احسب نسبة الحب!"
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    );
  }

  const { name1: n1, name2: n2, percentage, message } = state;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 20 }}
      className="w-[85vw] sm:w-[70vw] md:w-[320px] rounded-[24px] p-[2px] bg-gradient-to-br from-[#ff0844] to-[#ffb199] relative overflow-hidden shadow-[0_20px_50px_rgba(255,8,68,0.4)] isolate hardware-accelerated"
    >
      <div className="absolute inset-0 bg-[#0a0004] -z-10" />
      
      {/* Animated glowing background */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} 
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,8,68,0.5),transparent_60%)] blur-2xl -z-10"
      />

      <div className="bg-black/50 backdrop-blur-2xl rounded-[22px] p-6 flex flex-col items-center text-center relative z-10 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        
        <div className="text-[11px] font-black tracking-widest text-[#ffb199] uppercase mb-5 bg-white/5 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
          النتيجة النهائية
        </div>
        
        <div className="flex items-center gap-4 w-full justify-center mb-8 relative z-10">
          <div className="flex-1 bg-gradient-to-br from-white/10 to-transparent border border-white/20 rounded-[14px] p-2.5 text-white font-black truncate shadow-inner drop-shadow-md text-[14px]">
            {n1}
          </div>
          <motion.div 
            animate={{ scale: [1, 1.3, 1] }} 
            transition={{ repeat: Infinity, duration: percentage > 50 ? 0.8 : 2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-[#ff0844] blur-lg opacity-60 rounded-full" />
            <Heart className={`w-8 h-8 relative z-10 drop-shadow-lg ${percentage > 50 ? 'fill-[#ff0844] text-[#ff0844]' : 'text-white/30 fill-transparent'}`} />
          </motion.div>
          <div className="flex-1 bg-gradient-to-br from-white/10 to-transparent border border-white/20 rounded-[14px] p-2.5 text-white font-black truncate shadow-inner drop-shadow-md text-[14px]">
            {n2}
          </div>
        </div>

        {/* 3D Circular Progress */}
        <div className="relative mb-8 z-10 flex justify-center items-center w-32 h-32 mx-auto preserve-3d">
          <svg viewBox="0 0 36 36" className="w-full h-full absolute inset-0 -rotate-90 filter drop-shadow-[0_0_10px_rgba(255,8,68,0.5)]">
            <path
              className="stroke-black/50"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <motion.path
              initial={{ strokeDasharray: "0, 100" }}
              animate={{ strokeDasharray: `${percentage}, 100` }}
              transition={{ duration: 2, ease: "easeOut", delay: 0.2 }}
              className="stroke-[url(#gradient)]"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff0844" />
                <stop offset="100%" stopColor="#ffb199" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] m-3 border border-white/10 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ type: "spring", delay: 1 }}
              className="text-[32px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-[#ffb199] leading-none drop-shadow-md"
            >
              {percentage}<span className="text-[16px]">%</span>
            </motion.div>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="text-[15px] text-white font-black bg-gradient-to-r from-white/10 to-white/5 border border-white/10 px-5 py-3 rounded-[14px] w-full relative z-10 shadow-lg backdrop-blur-md"
        >
          {message}
        </motion.div>
      </div>
    </motion.div>
  );
}
