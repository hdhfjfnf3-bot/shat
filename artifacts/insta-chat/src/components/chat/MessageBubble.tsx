import { memo, useEffect, useRef, useState, useMemo } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { Copy, CornerUpLeft, Trash2, Smile, Edit2 } from "lucide-react";
import { Message, CURRENT_USER, User } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import { EmojiText } from "./EmojiText";
import { VoiceMessage } from "./VoiceMessage";
import { RpsInlineGame } from "./RpsInlineGame";
import { XoInlineGame } from "./XoInlineGame";
import { GameHubInline } from "./GameHubInline";
import { SnakesLaddersInline } from "./SnakesLaddersInline";
import { BankElHazInline } from "./BankElHazInline";
import { CardsInlineGame } from "./CardsInlineGame";
import { DominoesInlineGame } from "./DominoesInlineGame";
import { Connect4InlineGame } from "./Connect4InlineGame";
import { DotsBoxesInlineGame } from "./DotsBoxesInlineGame";
import { QnDInlineGame } from "./QnDInlineGame";
import { EmojiPictionaryInline } from "./EmojiPictionaryInline";
import { FastTapInline } from "./FastTapInline";
import { SpinWheelInline } from "./SpinWheelInline";
import { WordChainInline } from "./WordChainInline";
import { WouldYouRatherInline } from "./WouldYouRatherInline";
import { NeverHaveIEverInline } from "./NeverHaveIEverInline";
import { ScrambledWordInline } from "./ScrambledWordInline";
import { LoveCalculatorInline } from "./LoveCalculatorInline";
import { PollInline } from "./PollInline";
import { ChessInline } from "./ChessInline";
import { SeegaInline } from "./SeegaInline";
import { MemoryInline } from "./MemoryInline";
import { HangmanInline } from "./HangmanInline";
import { playDoorSlam, playBomb, playSlap, playKiss, playGlassShatter, playMagicSparkle, playGlitch, playVinylMusic } from "@/lib/audioUtils";
import emojiRegex from "emoji-regex";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍", "✨", "🔥"];

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

const BombMessage = ({ msg, conversationId }: { msg: Message, conversationId: string }) => {
  const [timeLeft, setTimeLeft] = useState(5);
  const { unsendMessage } = useChatStore();

  useEffect(() => {
    if (timeLeft <= 0) {
      playBomb();
      unsendMessage(conversationId, msg.id);
      return;
    }
    const t = setTimeout(() => setTimeLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, conversationId, msg.id, unsendMessage]);

  return (
    <HologramProjector color="orange">
    <div className="flex items-center gap-3 pr-2 select-none w-full bg-black/50 p-4 rounded-2xl border border-[#ed4956]/30">
      <motion.div
        animate={timeLeft <= 2 ? { scale: [1, 1.3, 1], rotate: [-10, 10, -10] } : { scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: timeLeft <= 2 ? 0.2 : 1 }}
        className="text-[28px] drop-shadow-[0_0_15px_rgba(237,73,86,0.8)]"
      >
        💣
      </motion.div>
      <div className="flex flex-col">
        <span className="font-black text-[#ed4956] text-[11px] uppercase tracking-widest mb-0.5 animate-pulse">رسالة مفخخة ستدمر في {timeLeft}</span>
        <span className="font-bold text-white"><EmojiText text={msg.content} /></span>
      </div>
    </div>
    </HologramProjector>
  );
};

const LoveLetterMessage = ({ msg }: { msg: Message }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!isOpen) {
    return (
      <motion.div 
        onClick={() => setIsOpen(true)}
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="cursor-pointer flex flex-col items-center justify-center p-4 min-w-[120px] select-none group"
      >
        <span className="text-[64px] drop-shadow-[0_10px_20px_rgba(255,50,100,0.4)] group-hover:scale-110 transition-transform">💌</span>
        <span className="text-[12px] font-bold text-pink-300 mt-2 tracking-wide drop-shadow-md">انقر للفتح</span>
      </motion.div>
    );
  }

  return (
    <HologramProjector color="pink">
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, rotateX: -90 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="p-5 min-w-[200px] max-w-[280px] bg-[#fffaf0] rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_0_40px_rgba(200,150,100,0.1)] border border-[#e8d5b7] text-center relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-4 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 pointer-events-none" />
      <span className="text-[32px] absolute top-[-10px] right-[-10px] opacity-20">🌹</span>
      <span className="text-[32px] absolute bottom-[-10px] left-[-10px] opacity-20">🌹</span>
      <p className="text-[#5a3a22] font-medium leading-relaxed" style={{ fontFamily: "'Tajawal', 'Comic Sans MS', cursive", fontSize: "16px" }}>
        <EmojiText text={msg.content} />
      </p>
    </motion.div>
    </HologramProjector>
  );
};

const HoldHandMessage = () => {
  const [holding, setHolding] = useState(false);
  const [syncHold, setSyncHold] = useState(false);
  
  useEffect(() => {
    let t: number;
    let syncTimer: number;

    if (holding) {
      if (window.navigator?.vibrate) window.navigator.vibrate([50, 50, 50]);
      
      t = window.setInterval(() => {
        if (window.navigator?.vibrate) window.navigator.vibrate(50);
      }, 500);

      syncTimer = window.setTimeout(() => {
        setSyncHold(true);
        if (window.navigator?.vibrate) window.navigator.vibrate([200, 100, 200, 100, 500]);
      }, 3000); // Simulate other person grabbing back after 3 seconds
    } else {
      setSyncHold(false);
    }

    return () => {
      clearInterval(t);
      clearTimeout(syncTimer);
    };
  }, [holding]);

  return (
    <HologramProjector color="orange">
    <div 
      className={cn("relative w-full min-h-[160px] p-8 rounded-[30px] border flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-1000 overflow-hidden", 
        syncHold ? "bg-[#f59e0b] border-[#fbbf24] shadow-[0_0_80px_rgba(245,158,11,1)] scale-[1.02]" 
        : holding ? "bg-[#d97706] border-[#f59e0b] shadow-[0_0_30px_rgba(217,119,6,0.6)]" 
        : "bg-black/40 border-white/10"
      )}
      onPointerDown={() => setHolding(true)}
      onPointerUp={() => setHolding(false)}
      onPointerLeave={() => setHolding(false)}
      onTouchStart={(e) => { e.preventDefault(); setHolding(true); }}
      onTouchEnd={(e) => { e.preventDefault(); setHolding(false); }}
    >
      <motion.div animate={syncHold ? { scale: [1, 1.2, 1] } : holding ? { scale: [1, 1.05, 1] } : {}} transition={{ repeat: Infinity, duration: syncHold ? 0.8 : 2 }} className="text-[64px] z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] relative">
        {syncHold ? "💞" : "🤝"}
      </motion.div>
      <div className={cn("mt-4 font-black tracking-wide text-[14px] z-10 transition-colors duration-500", syncHold ? "text-white text-[16px] drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" : holding ? "text-white/80 drop-shadow-md" : "text-white/40")}>
        {syncHold ? "أيديكم متشابكة الآن ✨" : holding ? "انتظر لتتشابك الأيادي..." : "اضغط باستمرار لتمسك يدي"}
      </div>
      
      {syncHold && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: [0.2, 0.8, 0.2] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0%,transparent_70%)] pointer-events-none" 
        />
      )}
    </div>
    </HologramProjector>
  );
};

const CheersMessage = () => {
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (window.navigator?.vibrate) window.navigator.vibrate([20, 20, 20]);
    setTimeout(() => setPlayed(true), 1500);
  }, []);

  return (
    <HologramProjector color="orange">
    <div className="relative flex items-center justify-center p-8 overflow-hidden rounded-[30px] bg-gradient-to-br from-[#fcd34d]/20 to-[#fbbf24]/20 border border-[#fcd34d]/50 w-full min-h-[150px]">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
      <motion.div 
        initial={{ x: -100, rotate: -30, opacity: 0 }}
        animate={{ x: played ? -10 : 0, rotate: played ? -10 : 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 10 }}
        className="text-[64px] absolute left-[20%] drop-shadow-xl z-10"
      >
        🍻
      </motion.div>
      <motion.div 
        initial={{ x: 100, rotate: 30, opacity: 0 }}
        animate={{ x: played ? 10 : 0, rotate: played ? 10 : 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 10 }}
        className="text-[64px] absolute right-[20%] drop-shadow-xl z-10"
      >
        🍻
      </motion.div>
      {played && (
        <motion.div 
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute w-20 h-20 rounded-full bg-white/50 blur-md pointer-events-none"
        />
      )}
      <div className="absolute bottom-2 font-bold text-[#b45309] text-[12px] tracking-widest drop-shadow-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">نخب الصداقة!</div>
    </div>
    </HologramProjector>
  );
};

const FeedMessage = ({ msg, conversationId }: { msg: Message, conversationId: string }) => {
  const { editMessage } = useChatStore();
  const bites = Number(msg.content) || 0;
  
  const handleBite = () => {
    if (bites >= 5) return;
    if (window.navigator?.vibrate) window.navigator.vibrate(20);
    editMessage(conversationId, msg.id, String(bites + 1));
  };

  const foodStages = ["🍕", "🌮", "🍔", "🍖", "🍗", "🦴"];
  
  return (
    <HologramProjector color="orange">
    <div className="relative min-h-[160px] p-6 bg-[#fff7ed] rounded-[30px] border border-[#fed7aa] flex flex-col items-center cursor-pointer select-none overflow-hidden w-full" onClick={handleBite}>
      <motion.div 
        key={bites}
        initial={{ scale: 1.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-[80px] drop-shadow-xl z-10"
      >
        {bites < 5 ? foodStages[bites] : "🍽️"}
      </motion.div>
      <div className="mt-2 font-bold text-[#c2410c] bg-white/50 px-4 py-1 rounded-full backdrop-blur-md border border-white/40 shadow-sm z-10 text-center text-[13px]">
        {bites < 5 ? `عزومة أكل.. دوس عشان تاكل (${5 - bites} باقية)` : "بالهنا والشفا! 😋"}
      </div>
      {bites > 0 && bites < 5 && (
        <motion.div 
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[32px] pointer-events-none"
        >
          ✨
        </motion.div>
      )}
    </div>
    </HologramProjector>
  );
};

const SlapMessage = () => {
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (!played) {
      playSlap();
      setPlayed(true);
    }
  }, [played]);

  return (
    <HologramProjector color="pink" pulse>
    <div className="relative p-6 overflow-hidden rounded-[24px] bg-red-500/20 border border-red-500/50 flex items-center justify-center min-h-[120px] w-full">
      <motion.div
        initial={{ x: 500, rotate: 45, scale: 2 }}
        animate={{ x: 0, rotate: -20, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="text-[100px] drop-shadow-[0_20px_50px_rgba(239,68,68,0.8)] z-10"
      >
        ✋
      </motion.div>
      <div className="absolute font-black text-[80px] text-red-500 opacity-20 -rotate-12 italic pointer-events-none">SLAP!</div>
      <div className="absolute bottom-2 bg-black/50 px-3 py-1 rounded-full text-white text-[12px] font-bold backdrop-blur-md">أخدت قلم يفوقك!</div>
    </div>
    </HologramProjector>
  );
};

const WeatherMessage = () => {
  return (
    <HologramProjector color="blue">
    <div 
      onClick={() => useChatStore.getState().setActive3DExperience({ type: "weather" })}
      className="relative p-8 rounded-[30px] overflow-hidden bg-gradient-to-b from-[#1e293b] to-[#0f172a] border border-[#334155] flex flex-col items-center min-h-[200px] w-full cursor-pointer shadow-[0_0_30px_rgba(56,189,248,0.3)]"
    >
      <div className="absolute top-2 px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/70 flex items-center gap-1 backdrop-blur-md z-20">
        <span>اضغط لفتح التجربة 🌌</span>
      </div>
      <div className="absolute inset-0 opacity-40 pointer-events-none flex justify-between px-2">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className="w-[2px] h-[20px] bg-gradient-to-b from-transparent to-blue-400 rounded-full animate-[rain_1s_linear_infinite]"
            style={{ animationDelay: `${Math.random() * 2}s`, animationDuration: `${0.5 + Math.random()}s`, opacity: Math.random() }}
          />
        ))}
      </div>
      <style>{`@keyframes rain { 0% { transform: translateY(-20px); } 100% { transform: translateY(220px); } }`}</style>
      <motion.div 
        animate={{ y: [-5, 5, -5] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="text-[80px] drop-shadow-[0_10px_30px_rgba(56,189,248,0.5)] z-10"
      >
        🌧️
      </motion.div>
      <div className="mt-4 text-[12px] font-bold text-blue-300/60 uppercase tracking-widest z-10">
        حالة الطقس
      </div>
    </div>
    </HologramProjector>
  );
};

const WalkAwayMessage = () => {
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (!played) {
      playDoorSlam();
      setPlayed(true);
    }
  }, [played]);

  return (
    <HologramProjector color="purple">
    <div 
      onClick={() => useChatStore.getState().setActive3DExperience({ type: "walk_away" })}
      className="relative overflow-hidden flex flex-col items-center justify-center w-full cursor-pointer shadow-[0_0_30px_rgba(0,0,0,0.5)]" style={{ minHeight: 160, background: "#000", border: "2px solid #1a1a1a", borderRadius: 28 }}
    >
      <div className="absolute top-2 px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/70 flex items-center gap-1 backdrop-blur-md z-20">
        <span>اضغط لفتح التجربة 🌌</span>
      </div>
      <motion.div initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="text-[80px] z-10 grayscale drop-shadow-[0_0_30px_rgba(255,255,255,0.08)]">
        🚪
      </motion.div>
      <motion.div initial={{ x: 30, opacity: 1 }} animate={{ x: -180, opacity: 0 }} transition={{ duration: 2, delay: 0.6, ease: "easeIn" }}
        className="text-[38px] absolute z-20">🚶</motion.div>
      <div className="absolute inset-0 bg-black/70 pointer-events-none" />
      <div className="absolute bottom-4 z-20 text-[12px] font-bold text-gray-500/60 uppercase tracking-widest">مغادرة</div>
    </div>
    </HologramProjector>
  );
};

const ShatterMessage = () => {
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (!played) {
      const t = setTimeout(() => {
        playGlassShatter();
        setPlayed(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [played]);

  return (
    <HologramProjector color="purple">
    <div 
      onClick={() => useChatStore.getState().setActive3DExperience({ type: "shatter" })}
      className="relative overflow-hidden flex flex-col items-center justify-center w-full grayscale hover:grayscale-0 transition-all duration-1000 cursor-pointer shadow-[0_0_30px_rgba(255,0,0,0.2)]" 
      style={{ minHeight: 180, background: "linear-gradient(180deg,#111 0%,#000 100%)", border: "1px solid #222", borderRadius: 28 }}
    >
      <div className="absolute top-2 px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/70 flex items-center gap-1 backdrop-blur-md z-20">
        <span>اضغط لفتح التجربة 🌌</span>
      </div>
      {!played ? (
        <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, -8, 8, 0] }} transition={{ duration: 0.9 }}
          className="text-[80px] drop-shadow-[0_0_40px_rgba(255,50,50,0.6)]">❤️</motion.div>
      ) : (
        <div className="relative w-[80px] h-[80px]">
          <motion.div initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: -50, y: 60, rotate: -50, opacity: 0 }} transition={{ duration: 1.2 }}
            className="text-[70px] absolute">💔</motion.div>
          <motion.div initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: 50, y: 60, rotate: 50, opacity: 0 }} transition={{ duration: 1.2 }}
            className="text-[70px] absolute">💔</motion.div>
          <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.2, scale: 1 }} transition={{ delay: 1 }}
            className="text-[60px] absolute left-2">🖤</motion.div>
        </div>
      )}
      <div className="absolute bottom-4 z-20 text-[12px] font-bold text-red-500/60 uppercase tracking-widest">صدمة</div>
    </div>
    </HologramProjector>
  );
};

import { ThreeDEmotionMessage } from "./ThreeDEmotion";

const CARD_FONT = { fontFamily: "'Tajawal', 'Cairo', system-ui, sans-serif" };

const HologramProjector = ({ children, color = "cyan", pulse = false, interactive = false }: { children: React.ReactNode, color?: "cyan" | "pink" | "purple" | "orange" | "blue" | "emerald", pulse?: boolean, interactive?: boolean }) => {
  const colorMap = {
    cyan: { bg: "bg-cyan-500", glow: "rgba(34,211,238,1)", light: "from-cyan-400/40" },
    pink: { bg: "bg-pink-500", glow: "rgba(236,72,153,1)", light: "from-pink-400/40" },
    purple: { bg: "bg-purple-500", glow: "rgba(168,85,247,1)", light: "from-purple-400/40" },
    orange: { bg: "bg-orange-500", glow: "rgba(249,115,22,1)", light: "from-orange-400/40" },
    blue: { bg: "bg-blue-500", glow: "rgba(59,130,246,1)", light: "from-blue-400/40" },
    emerald: { bg: "bg-emerald-500", glow: "rgba(16,185,129,1)", light: "from-emerald-400/40" },
  };
  const c = colorMap[color];

  return (
    <div className="relative flex flex-col items-center justify-end w-full overflow-visible" style={{ minHeight: 280, perspective: interactive ? 'none' : 1000 }}>
      <motion.div
        animate={interactive ? {} : (pulse ? { y: [-10, 10, -10], rotateY: [-5, 5, -5] } : { y: [-5, 5, -5] })}
        transition={{ repeat: Infinity, duration: pulse ? 4 : 6, ease: "easeInOut" }}
        className="relative z-20 w-full flex justify-center mb-6"
        style={{ transformStyle: "preserve-3d" }}
      >
        {children}
      </motion.div>
      <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ repeat: Infinity, duration: 2 }} className={`w-32 h-6 ${c.bg}/30 rounded-[100%] blur-md mb-2 shadow-[0_0_30px_${c.glow}] absolute bottom-4`} />
      <div className="w-20 h-4 bg-gray-300 rounded-[100%] shadow-[0_5px_15px_rgba(0,0,0,0.5)] border border-gray-400 absolute bottom-4" />
      <div className={`absolute bottom-6 w-40 h-[200px] bg-gradient-to-t ${c.light} to-transparent pointer-events-none`} style={{ clipPath: "polygon(20% 100%, 80% 100%, 100% 0, 0 0)", filter: "blur(6px)" }} />
    </div>
  );
};

const BoredMessage = () => {
  return (
    <HologramProjector color="orange">
    <div 
      onClick={() => useChatStore.getState().setActive3DExperience({ type: "bored" })}
      className="relative rounded-[28px] overflow-hidden bg-[#0e0e0e] border border-white/5 flex flex-col items-center justify-center w-full cursor-pointer" style={{ minHeight: 130 }}>
      <motion.div
        animate={{ x: [-220, 320], rotate: [0, 720] }}
        transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
        className="absolute text-[36px] opacity-30 top-[42px]"
      >🍂</motion.div>
      <div className="absolute top-2 px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/70 flex items-center gap-1 backdrop-blur-md z-20">
        <span>اضغط لفتح التجربة 🌌</span>
      </div>
      <div className="relative z-10 text-[28px] mb-2">🥱</div>
      <div className="z-20 text-[12px] font-bold text-orange-500/60 uppercase tracking-widest">صمت</div>
    </div>
    </HologramProjector>
  );
};

const CryTogetherMessage = () => {
  useEffect(() => {
    if (window.navigator?.vibrate) window.navigator.vibrate([30, 100, 30, 100, 30]);
    document.documentElement.style.filter = "saturate(0.3) brightness(0.85)";
    const t = setTimeout(() => {
      document.documentElement.style.filter = "";
    }, 4000);
    return () => { clearTimeout(t); document.documentElement.style.filter = ""; };
  }, []);

  return (
    <HologramProjector color="blue" pulse>
    <div 
      onClick={() => useChatStore.getState().setActive3DExperience({ type: "cry_together" })}
      className="relative rounded-[28px] overflow-hidden flex flex-col items-center w-full cursor-pointer shadow-[0_0_30px_rgba(59,130,246,0.3)]" 
      style={{ minHeight: 220, background: "linear-gradient(180deg,#0d1f35 0%,#060c14 100%)", border: "1px solid rgba(59,130,246,0.25)" }}
    >
      <div className="absolute top-2 px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/70 flex items-center gap-1 backdrop-blur-md z-20">
        <span>اضغط لفتح التجربة 🌌</span>
      </div>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div key={i}
            initial={{ y: -20, x: Math.random() * 300, opacity: 0 }}
            animate={{ y: 230, opacity: [0, 0.6, 0] }}
            transition={{ repeat: Infinity, duration: 0.7 + Math.random() * 0.9, delay: Math.random() * 2, ease: "linear" }}
            className="absolute w-[1.5px] h-[14px] rounded-full"
            style={{ background: "linear-gradient(to bottom, transparent, #93c5fd, transparent)" }}
          />
        ))}
      </div>
      <motion.div animate={{ y: [0, -6, 0], scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="text-[70px] z-10 mt-8 drop-shadow-[0_0_30px_rgba(96,165,250,0.5)]">
        😭
      </motion.div>
      <motion.div animate={{ y: [0, 65], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.3, delay: 0.3 }}
        className="absolute top-[95px] left-[calc(50%-16px)] w-[3px] h-[12px] bg-blue-300 rounded-full blur-[1px] z-10" />
      <motion.div animate={{ y: [0, 55], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.1, delay: 0.8 }}
        className="absolute top-[100px] left-[calc(50%+12px)] w-[2px] h-[9px] bg-blue-200 rounded-full blur-[1px] z-10" />
      <div className="mt-5 z-10 text-center px-5 pb-6 text-[12px] font-bold text-blue-300/60 uppercase tracking-widest">
        مشاركة مشاعر
      </div>
    </div>
    </HologramProjector>
  );
};

const LonelinessMessage = () => {
  return (
    <HologramProjector color="purple">
    <div 
      onClick={() => useChatStore.getState().setActive3DExperience({ type: "loneliness" })}
      className="relative rounded-[30px] overflow-hidden bg-gradient-to-b from-[#0d0d1a] to-[#000] border border-[#1a1a3a] flex flex-col items-center min-h-[220px] w-full cursor-pointer shadow-[0_0_30px_rgba(168,85,247,0.3)]"
    >
      <div className="absolute top-2 z-20 px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/70 flex items-center gap-1 backdrop-blur-md">
        <span>اضغط لفتح التجربة 🌌</span>
      </div>
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ repeat: Infinity, duration: 2 + Math.random() * 3, delay: Math.random() * 3 }}
            className="absolute rounded-full bg-white"
            style={{ width: Math.random() * 2 + 1, height: Math.random() * 2 + 1, top: `${Math.random() * 70}%`, left: `${Math.random() * 100}%` }}
          />
        ))}
      </div>
      {/* Moon */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        className="text-[80px] z-10 mt-6 drop-shadow-[0_0_40px_rgba(200,200,255,0.3)] filter saturate-50"
      >
        🌙
      </motion.div>
      {/* Small lonely figure */}
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="text-[28px] z-10 mt-2 filter grayscale opacity-60"
      >
        🧍
      </motion.div>
      <div className="mt-3 mb-7 z-10 text-center px-4 text-[12px] font-bold text-purple-400/60 uppercase tracking-widest">
        وحدة
      </div>
    </div>
    </HologramProjector>
  );
};

const MissingYouMessage = () => {
  const [touching, setTouching] = useState(false);
  useEffect(() => {
    if (window.navigator?.vibrate) window.navigator.vibrate([80, 200, 80]);
  }, []);

  return (
    <HologramProjector color="pink" pulse>
    <div
      className="relative overflow-hidden flex items-center justify-center w-full select-none"
      style={{ minHeight: 240, background: "radial-gradient(ellipse at center, #0d0520 0%, #000 100%)", borderRadius: 28, border: "1px solid rgba(139,92,246,0.2)" }}
      onPointerDown={() => setTouching(true)}
      onPointerUp={() => setTouching(false)}
      onPointerLeave={() => setTouching(false)}
    >
      {/* Starfield */}
      {[...Array(50)].map((_, i) => (
        <motion.div key={i}
          animate={{ opacity: [0.1, 0.8, 0.1] }}
          transition={{ repeat: Infinity, duration: 1.5 + Math.random() * 3, delay: Math.random() * 4 }}
          className="absolute rounded-full bg-white"
          style={{ width: Math.random() * 2 + 0.5, height: Math.random() * 2 + 0.5, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
        />
      ))}
      {/* Two orbs — drifting apart */}
      <motion.div
        animate={touching ? { x: 0, opacity: 1 } : { x: -52, opacity: 0.6 }}
        transition={{ type: "spring", stiffness: 80, damping: 18 }}
        className="absolute w-16 h-16 rounded-full"
        style={{ background: "radial-gradient(circle, #c084fc 0%, #7c3aed 60%, transparent 100%)", boxShadow: "0 0 40px rgba(168,85,247,0.8), 0 0 80px rgba(139,92,246,0.4)", filter: "blur(1px)" }}
      />
      <motion.div
        animate={touching ? { x: 0, opacity: 1 } : { x: 52, opacity: 0.6 }}
        transition={{ type: "spring", stiffness: 80, damping: 18 }}
        className="absolute w-16 h-16 rounded-full"
        style={{ background: "radial-gradient(circle, #86efac 0%, #16a34a 60%, transparent 100%)", boxShadow: "0 0 40px rgba(74,222,128,0.8), 0 0 80px rgba(22,163,74,0.4)", filter: "blur(1px)" }}
      />
      {/* Bridge light when touching */}
      <AnimatePresence>
        {touching && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            className="absolute h-[2px] w-32"
            style={{ background: "linear-gradient(to right, #a855f7, #22c55e)", boxShadow: "0 0 20px rgba(255,255,255,0.5)", borderRadius: 2 }}
          />
        )}
      </AnimatePresence>
      <div className="absolute bottom-4 text-white/20 text-[11px] tracking-widest" style={CARD_FONT}>اضغط لتقترب</div>
    </div>
    </HologramProjector>
  );
};

const AnxietyMessage = () => {
  const [tick, setTick] = useState(0);
  const points = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 60; i++) {
      const isSpike = i === 25 || i === 26 || i === 27;
      pts.push(isSpike ? (i === 26 ? 10 : 40) : 50 + (Math.random() - 0.5) * 8);
    }
    return pts;
  }, [tick]);

  useEffect(() => {
    if (window.navigator?.vibrate) window.navigator.vibrate([30, 30, 100, 30, 30, 200, 30]);
    const t = setInterval(() => setTick(x => x + 1), 1200);
    return () => clearInterval(t);
  }, []);

  const svgPath = points.map((y, i) => `${i === 0 ? 'M' : 'L'} ${(i / 59) * 280} ${y}`).join(' ');

  return (
    <HologramProjector color="orange" pulse>
    <motion.div
      onClick={() => useChatStore.getState().setActive3DExperience({ type: "anxiety" })}
      animate={{ x: [-2, 2, -3, 3, -1, 1, 0] }}
      transition={{ repeat: Infinity, duration: 0.4, repeatDelay: 2 }}
      className="relative overflow-hidden w-full cursor-pointer shadow-[0_0_30px_rgba(234,88,12,0.3)]"
      style={{ minHeight: 180, background: "linear-gradient(180deg, #0c0500 0%, #000 100%)", borderRadius: 28, border: "1px solid rgba(234,88,12,0.3)" }}
    >
      <div className="absolute top-2 px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/70 flex items-center gap-1 backdrop-blur-md z-20">
        <span>اضغط لفتح التجربة 🌌</span>
      </div>
      <motion.div animate={{ opacity: [0, 0.12, 0] }} transition={{ repeat: Infinity, duration: 0.7 }}
        className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, #f97316 0%, transparent 70%)" }} />
      <svg width="100%" height="100" viewBox="0 0 280 80" className="absolute top-8" preserveAspectRatio="none">
        <motion.path key={tick} d={svgPath} fill="none" stroke="#f97316" strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "linear" }}
          style={{ filter: "drop-shadow(0 0 6px #f97316)" }}
        />
      </svg>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
        <motion.div animate={{ scale: [1, 1.4, 1, 1.4, 1], opacity: [0.4, 1, 0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.9 }}
          className="text-[28px]" style={{ filter: "drop-shadow(0 0 12px #f97316)" }}>❤️
        </motion.div>
      </div>
    </motion.div>
    </HologramProjector>
  );
};

const NostalgiaMessage = () => {
  return (
    <HologramProjector color="orange">
    <div 
      onClick={() => useChatStore.getState().setActive3DExperience({ type: "universe_share" })}
      className="relative overflow-hidden flex flex-col items-center justify-center w-full cursor-pointer shadow-[0_0_30px_rgba(180,100,0,0.3)]"
      style={{ minHeight: 240, background: "linear-gradient(180deg,#2c1a00 0%,#0f0800 100%)", borderRadius: 28, border: "1px solid rgba(180,100,0,0.25)" }}>
      <div className="absolute top-2 z-20 px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/70 flex items-center gap-1 backdrop-blur-md">
        <span>اضغط لفتح التجربة 🌌</span>
      </div>
      {/* Film grain overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundSize: "180px" }} />
      {/* Dust motes */}
      {[...Array(20)].map((_, i) => (
        <motion.div key={i}
          animate={{ y: [0, -120], x: [(Math.random()-0.5)*20, (Math.random()-0.5)*40], opacity: [0, 0.6, 0] }}
          transition={{ repeat: Infinity, duration: 5 + Math.random()*4, delay: Math.random()*5, ease: "easeOut" }}
          className="absolute rounded-full bg-amber-300"
          style={{ width: 2, height: 2, bottom: "10%", left: `${20 + Math.random()*60}%`, filter: "blur(0.5px)" }}
        />
      ))}
      {/* Polaroid frame */}
      <motion.div
        animate={{ rotate: [-1.5, 1.5, -1.5], y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        className="relative z-10 flex flex-col items-center"
        style={{ background: "#f5e6c8", borderRadius: 4, padding: "10px 10px 28px 10px", boxShadow: "0 20px 60px rgba(0,0,0,0.8)", filter: "sepia(0.6) brightness(0.8)" }}
      >
        <div className="text-[60px]" style={{ lineHeight: 1 }}>🌅</div>
      </motion.div>
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)" }} />
    </div>
    </HologramProjector>
  );
};

const ForgiveMessage = () => {
  const [accepted, setAccepted] = useState(false);
  const [pressed, setPressed] = useState(false);
  useEffect(() => { if (window.navigator?.vibrate) window.navigator.vibrate([150, 100, 150]); }, []);

  const handleAccept = () => {
    if (accepted) return;
    setAccepted(true);
    if (window.navigator?.vibrate) window.navigator.vibrate([50, 80, 100, 80, 300]);
  };

  return (
    <HologramProjector color="emerald" pulse>
    <motion.div
      onClick={handleAccept}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      className="relative overflow-hidden flex flex-col items-center justify-center w-full cursor-pointer select-none shadow-[0_0_30px_rgba(52,211,153,0.3)]"
      style={{ minHeight: 240, borderRadius: 28, border: `1px solid ${accepted ? "rgba(52,211,153,0.5)" : "rgba(180,83,9,0.3)"}`, background: accepted ? "radial-gradient(ellipse at center, #064e3b 0%, #000 100%)" : "radial-gradient(ellipse at center, #1c0a00 0%, #000 100%)", transition: "all 1.5s ease" }}
    >
      {/* Ripple on press */}
      <AnimatePresence>
        {pressed && !accepted && (
          <motion.div initial={{ scale: 0, opacity: 0.6 }} animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 0.8 }} className="absolute w-20 h-20 rounded-full bg-amber-400 pointer-events-none" />
        )}
      </AnimatePresence>
      {/* Burst on accept */}
      {accepted && (
        <>
          <motion.div className="fixed inset-0 z-[9999] pointer-events-none">
            {[...Array(24)].map((_, i) => (
              <motion.div key={i}
                initial={{ x: "50vw", y: "60vh", scale: 0, opacity: 1 }}
                animate={{ x: `${Math.random() * 100}vw`, y: `${Math.random() * 100}vh`, scale: Math.random() * 1.5 + 0.5, opacity: 0 }}
                transition={{ duration: 1.2, delay: Math.random() * 0.3 }}
                className="absolute text-[22px]">
                {["🕊️","✨","💚","🌿","⭐"][i % 5]}
              </motion.div>
            ))}
          </motion.div>
          <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }} transition={{ duration: 1 }}
            style={{ background: "radial-gradient(ellipse at center, rgba(52,211,153,0.8) 0%, transparent 70%)" }} />
        </>
      )}
      {/* Hands SVG */}
      <motion.div
        animate={!accepted ? { y: [0, -8, 0], scale: pressed ? 1.15 : 1 } : { scale: [1, 1.6, 1.3], y: -10 }}
        transition={!accepted ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : { duration: 0.5, type: "spring" }}
        className="text-[80px] z-10" style={{ filter: accepted ? "drop-shadow(0 0 30px rgba(52,211,153,0.9))" : "drop-shadow(0 0 20px rgba(251,146,60,0.5))" }}
      >
        {accepted ? "🕊️" : "🙏"}
      </motion.div>
      {!accepted && (
        <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-5 w-12 h-1 rounded-full bg-amber-400/40" />
      )}
      {accepted && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, type: "spring" }}
          className="absolute bottom-6 text-emerald-300 font-black text-[20px]" style={CARD_FONT}>عفوت 💚</motion.div>
      )}
    </motion.div>
    </HologramProjector>
  );
};

/* ── NEW SENSORY EXPERIENCES ────────────────────────────────────── */

const HeartbeatSyncMessage = () => {
  const [pressed, setPressed] = useState(false);
  const setActive3D = useChatStore(s => s.setActive3DExperience);
  
  useEffect(() => {
    let t: number;
    if (pressed) {
      t = window.setInterval(() => {
        if (window.navigator?.vibrate) window.navigator.vibrate([40, 60, 40]);
      }, 700);
    }
    return () => clearInterval(t);
  }, [pressed]);

  return (
    <HologramProjector color="pink" pulse>
    <div
      onPointerDown={() => { setPressed(true); setTimeout(() => setActive3D({ type: "heartbeat_sync" }), 500); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="relative overflow-hidden flex flex-col items-center justify-center w-full cursor-pointer select-none transition-all duration-700 shadow-[0_0_30px_rgba(244,63,94,0.3)]"
      style={{ minHeight: 220, borderRadius: 28, border: "1px solid rgba(244,63,94,0.3)", background: pressed ? "radial-gradient(ellipse at center, #881337 0%, #000 100%)" : "radial-gradient(ellipse at center, #2c0b1e 0%, #000 100%)" }}
    >
      <motion.div
        animate={{ scale: pressed ? [1, 1.4, 1.1, 1.3, 1] : [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: pressed ? 0.7 : 1.5 }}
        className="text-[80px] z-10 will-change-transform"
        style={{ filter: pressed ? "drop-shadow(0 0 40px rgba(244,63,94,1))" : "drop-shadow(0 0 15px rgba(244,63,94,0.5))" }}
      >
        ❤️
      </motion.div>
      <div className="absolute top-2 px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/70 flex items-center gap-1 backdrop-blur-md">
        <span>اضغط لفتح التجربة ثلاثية الأبعاد</span>
        <span>🌌</span>
      </div>
      <div className="absolute bottom-5 text-[13px] font-bold transition-colors" style={{ ...CARD_FONT, color: pressed ? "#fda4af" : "#f43f5e" }}>
        {pressed ? "جاري الدخول..." : "المسني لكي تنبض"}
      </div>
    </div>
    </HologramProjector>
  );
};

const ScratchRevealMessage = ({ msg }: { msg: Message }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const text = msg.content && msg.content !== "رسالة سرية..." ? msg.content : "أحبك 🖤";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set actual canvas resolution to match its CSS size (important for drawing coordinates)
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 300;
    canvas.height = rect.height || 180;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Fill with scratchable foil
    ctx.fillStyle = "#888";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Add noise pattern (optimized count to 300)
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#999" : "#777";
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }
    
    let isDrawing = false;
    let scratchedPixels = 0;
    const totalPixels = canvas.width * canvas.height;

    let lastVibe = 0;

    const scratch = (x: number, y: number) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      
      const now = Date.now();
      if (now - lastVibe > 100) {
        if (window.navigator?.vibrate) window.navigator.vibrate(5);
        lastVibe = now;
      }
      
      scratchedPixels += 400; // rough estimate
      if (!revealed && scratchedPixels > totalPixels * 0.4) {
        setRevealed(true);
        if (window.navigator?.vibrate) window.navigator.vibrate([50, 100, 50]);
        canvas.style.opacity = "0"; // fade out rest
        setTimeout(() => canvas.style.display = "none", 500);
      }
    };

    const handleDown = (e: MouseEvent | TouchEvent) => { isDrawing = true; };
    const handleUp = () => { isDrawing = false; };
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      // Use requestAnimationFrame to throttle drawing to screen refresh rate
      requestAnimationFrame(() => {
        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
        scratch(x, y);
      });
    };

    canvas.addEventListener("mousedown", handleDown);
    canvas.addEventListener("mouseup", handleUp);
    canvas.addEventListener("mouseleave", handleUp);
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("touchstart", handleDown, { passive: true });
    canvas.addEventListener("touchend", handleUp);
    canvas.addEventListener("touchmove", handleMove, { passive: true });

    return () => {
      canvas.removeEventListener("mousedown", handleDown);
      canvas.removeEventListener("mouseup", handleUp);
      canvas.removeEventListener("mouseleave", handleUp);
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("touchstart", handleDown);
      canvas.removeEventListener("touchend", handleUp);
      canvas.removeEventListener("touchmove", handleMove);
    };
  }, [revealed]);

  return (
    <HologramProjector color="cyan" interactive>
    <div className="relative overflow-hidden flex flex-col items-center justify-center w-full select-none bg-black border border-white/10 aspect-video max-w-full" style={{ borderRadius: 28 }}>
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
        <div style={{ ...CARD_FONT, fontSize: 24, fontWeight: 900, color: "#fff", textShadow: "0 0 20px rgba(255,255,255,0.5)" }}>{text}</div>
      </div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-pointer transition-opacity duration-500 z-10"
        style={{ touchAction: "none" }}
      />
      {!revealed && (
        <div className="absolute top-2 right-4 text-[10px] text-black bg-white/80 px-2 py-0.5 rounded-full z-20 pointer-events-none font-bold">
          اخربش بأصبعك
        </div>
      )}
    </div>
    </HologramProjector>
  );
};

const CoffeeShareMessage = () => {
  const [pressed, setPressed] = useState(false);
  const [steamInt, setSteamInt] = useState(1);
  const setActive3D = useChatStore(s => s.setActive3DExperience);

  useEffect(() => {
    let t: number;
    if (pressed) {
      if (window.navigator?.vibrate) window.navigator.vibrate([20, 20]); // Initial warmth
      t = window.setInterval(() => {
        setSteamInt(s => Math.min(s + 1, 5));
        if (window.navigator?.vibrate) window.navigator.vibrate(5); // Constant heat hum
      }, 500);
    } else {
      setSteamInt(1);
    }
    return () => clearInterval(t);
  }, [pressed]);

  return (
    <HologramProjector color="orange">
    <div
      onPointerDown={() => { setPressed(true); setTimeout(() => setActive3D({ type: "coffee_share" }), 500); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="relative overflow-hidden flex flex-col items-center justify-center w-full cursor-pointer select-none transition-all duration-1000"
      style={{ minHeight: 220, borderRadius: 28, border: "1px solid rgba(217,119,6,0.3)", background: pressed ? "linear-gradient(180deg, #451a03 0%, #000 100%)" : "linear-gradient(180deg, #1c0a00 0%, #000 100%)" }}
    >
      {/* Steam - optimized: removed blur-md which kills mobile performance */}
      <div className="absolute bottom-[100px] flex gap-2 pointer-events-none">
        {[...Array(steamInt * 2)].map((_, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.4, 0], y: -80 - Math.random() * 40, scale: 1.5 + Math.random() }}
            transition={{ repeat: Infinity, duration: 2 + Math.random(), delay: Math.random() }}
            className="w-2 h-10 rounded-full will-change-transform"
            style={{ transformOrigin: "bottom", background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)" }}
          />
        ))}
      </div>
      <motion.div animate={{ scale: pressed ? 1.1 : 1 }} transition={{ duration: 0.3 }} className="text-[70px] z-10 mt-8 drop-shadow-[0_10px_20px_rgba(217,119,6,0.5)] will-change-transform">
        ☕
      </motion.div>
      <div className="absolute bottom-5 text-[14px] font-bold" style={{ ...CARD_FONT, color: pressed ? "#fde68a" : "#d97706" }}>
        {pressed ? "جارِ التدفئة..." : "المس لتدفئة القهوة"}
      </div>
    </div>
    </HologramProjector>
  );
};

const StaringContestMessage = () => {
  const [holding, setHolding] = useState(false);
  const [lost, setLost] = useState(false);
  const timerRef = useRef<number | null>(null);
  const setActive3D = useChatStore(s => s.setActive3DExperience);

  const startContest = () => {
    if (lost) return;
    setHolding(true);
    if (window.navigator?.vibrate) window.navigator.vibrate([10, 10]);
    timerRef.current = window.setTimeout(() => {
      setActive3D({ type: "staring_contest" });
      setHolding(false);
    }, 1000); // Enter 3D after 1s hold
  };

  const endContest = () => {
    if (!holding || lost) return;
    setHolding(false);
    setLost(true);
    if (window.navigator?.vibrate) window.navigator.vibrate([200, 100, 300]); // Losing buzz
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <HologramProjector color="blue" pulse={holding}>
    <div
      onPointerDown={startContest}
      onPointerUp={endContest}
      onPointerLeave={endContest}
      className="relative overflow-hidden flex flex-col items-center justify-center w-full cursor-pointer select-none transition-all duration-300"
      style={{ minHeight: 220, borderRadius: 28, border: `1px solid ${lost ? "rgba(239,68,68,0.5)" : "rgba(99,102,241,0.3)"}`, background: lost ? "#1e0505" : (holding ? "#0e0e2e" : "#000") }}
    >
      <motion.div
        animate={lost ? { scaleY: 0.1, opacity: 0.5 } : { scaleY: holding ? 1.2 : 1 }}
        transition={lost ? { duration: 0.1 } : { type: "spring", stiffness: 300 }}
        className="text-[90px] z-10 will-change-transform"
        style={{ filter: holding ? "drop-shadow(0 0 30px rgba(99,102,241,0.8))" : "none", transformOrigin: "center" }}
      >
        👁️
      </motion.div>
      
      {/* Intense vignette when holding */}
      {holding && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 pointer-events-none will-change-[opacity]" style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.9) 100%)" }} />}
      
      <div className="absolute bottom-5 text-[14px] font-bold" style={{ ...CARD_FONT, color: lost ? "#ef4444" : (holding ? "#a5b4fc" : "#6366f1") }}>
        {lost ? "رمشت! خسرت التحدي 😂" : (holding ? "لا تشيل صباعك..." : "اضغط مطولاً لتحدي النظرات")}
      </div>
    </div>
    </HologramProjector>
  );
};

const KissMessage = () => {
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (!played) {
      playKiss();
      const t = setTimeout(() => setPlayed(true), 2000);
      return () => clearTimeout(t);
    }
  }, [played]);

  return (
    <HologramProjector color="pink">
    <div className="flex items-center justify-center gap-2 p-4 bg-pink-500/10 rounded-2xl border border-pink-500/30 w-full min-h-[100px]">
      <span className="text-[24px]">💋</span>
      <span className="font-bold text-[#ec4899] italic drop-shadow-md">بوسة طايرة</span>
      
      {!played && (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
          <motion.div
            initial={{ y: -500, scale: 0, opacity: 0, rotate: -20 }}
            animate={{ y: 0, scale: [0, 5, 5, 5, 0], opacity: [0, 1, 1, 1, 0], rotate: 0 }}
            transition={{ duration: 2, times: [0, 0.2, 0.8, 0.9, 1] }}
            className="text-[100px] drop-shadow-[0_20px_50px_rgba(236,72,153,0.8)]"
          >
            💋
          </motion.div>
        </div>
      )}
    </div>
    </HologramProjector>
  );
};

const KnockMessage = () => {
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    if (!played) {
      playDoorSlam();
      setPlayed(true);
    }
  }, [played]);

  return (
    <HologramProjector color="orange" pulse={!played}>
    <motion.div
      animate={!played ? { x: [-20, 20, -15, 15, -10, 10, -5, 5, 0], y: [-10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center gap-2 p-4 bg-orange-500/10 rounded-2xl border border-orange-500/30 w-full min-h-[120px] relative"
    >
      <span className="text-[40px] drop-shadow-[0_10px_20px_rgba(239,68,68,0.8)]">✊</span>
      <span className="font-black text-[#ef4444] text-[14px] uppercase tracking-widest drop-shadow-md">طرق على الشاشة!</span>
      
      {!played && (
        <div className="fixed inset-0 z-[99999] pointer-events-none border-[15px] border-transparent animate-[flashBorder_0.6s_ease-out]">
          <style>{`
            @keyframes flashBorder {
              0% { border-color: rgba(239,68,68,0.8); background: rgba(239,68,68,0.2); }
              100% { border-color: transparent; background: transparent; }
            }
          `}</style>
        </div>
      )}
    </motion.div>
    </HologramProjector>
  );
};

const HologramMessage = ({ msg }: { msg: Message }) => {
  return (
    <div className="relative flex flex-col items-center justify-end w-full cursor-pointer overflow-visible" style={{ minHeight: 200, perspective: 800 }}>
      <motion.div
        animate={{ rotateY: [0, 360] }}
        transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
        className="absolute top-4 w-full flex justify-center z-20"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 px-6 py-4 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.6)] backdrop-blur-sm"
             style={{ textShadow: "0 0 10px rgba(34,211,238,1)", fontWeight: "bold" }}>
          <EmojiText text={msg.content} />
        </div>
      </motion.div>
      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="w-24 h-6 bg-cyan-500/30 rounded-[100%] blur-md mb-2 shadow-[0_0_30px_rgba(34,211,238,1)]" />
      <div className="w-16 h-4 bg-gray-300 rounded-[100%] shadow-[0_5px_15px_rgba(0,0,0,0.5)] border border-gray-400" />
      {/* Light beams */}
      <div className="absolute bottom-6 w-32 h-[150px] bg-gradient-to-t from-cyan-400/40 to-transparent pointer-events-none" style={{ clipPath: "polygon(20% 100%, 80% 100%, 100% 0, 0 0)", filter: "blur(4px)" }} />
    </div>
  );
};

const TimeCapsuleMessage = ({ msg }: { msg: Message }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shake, setShake] = useState(0);
  
  // Real check would be based on timestamp, but for demo:
  const isTimePassed = (new Date().getTime() - new Date(msg.timestamp).getTime()) > 60000; // Opens after 1 minute for demo (in prod 24h)
  
  return (
    <HologramProjector color="purple">
    <motion.div 
      animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
      transition={{ duration: 0.4 }}
      onClick={() => {
        if (!isOpen) {
          if (isTimePassed) {
            playMagicSparkle();
            setIsOpen(true);
            if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
          } else {
            setShake(s => s + 1);
            if (window.navigator?.vibrate) window.navigator.vibrate([50]);
          }
        }
      }}
      className="relative p-6 bg-[#1e1b4b] rounded-3xl border border-indigo-500/30 flex flex-col items-center justify-center cursor-pointer min-h-[140px] shadow-[inset_0_0_30px_rgba(79,70,229,0.2)] w-full"
    >
      {!isOpen ? (
        <>
          <div className="text-[60px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] z-10">⏳</div>
          <div className="absolute top-2 px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/70 font-bold backdrop-blur-md z-20">
            {isTimePassed ? "اضغط للفتح!" : "مقفولة (تفتح بعد 1 دقيقة)"}
          </div>
          <div className="mt-3 text-indigo-300 font-bold text-[13px]">{isTimePassed ? "حان الوقت!" : "كبسولة زمنية سرية"}</div>
        </>
      ) : (
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="text-[30px] mb-2">🌟</div>
          <div className="text-white font-bold leading-relaxed"><EmojiText text={msg.content} /></div>
        </motion.div>
      )}
    </motion.div>
    </HologramProjector>
  );
};

const VIBES = ["رايق 😌", "محتاج قهوة ☕", "مفرهد 🫠", "طاقة إيجابية ✨", "عايز ينام 🥱", "مبسوط جداً 🥳", "مكتئب شوية 🌧️", "عايز يسافر ✈️"];

const VibeCheckMessage = ({ msg }: { msg: Message }) => {
  const [scanning, setScanning] = useState(false);
  const [vibe, setVibe] = useState("");
  
  // Consistent random vibe based on message ID
  const targetVibe = useMemo(() => VIBES[msg.id.charCodeAt(0) % VIBES.length], [msg.id]);

  const doScan = () => {
    if (scanning || vibe) return;
    setScanning(true);
    if (window.navigator?.vibrate) window.navigator.vibrate([50, 50, 50, 50, 50]);
    setTimeout(() => {
      setScanning(false);
      setVibe(targetVibe);
      playMagicSparkle();
      if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 200]);
    }, 2000);
  };

  return (
    <HologramProjector color="pink">
    <div onClick={doScan} className="relative p-6 rounded-3xl bg-neutral-900 border border-pink-500/30 overflow-hidden flex flex-col items-center justify-center cursor-pointer min-h-[160px] w-full">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')]" />
      
      {!scanning && !vibe && (
        <div className="z-10 flex flex-col items-center">
          <div className="text-[60px] drop-shadow-xl animate-pulse text-pink-400">🫀</div>
          <div className="mt-3 font-bold text-pink-300 bg-pink-500/20 px-4 py-1 rounded-full border border-pink-500/30">اضغط لفحص المزاج</div>
        </div>
      )}
      
      {scanning && (
        <div className="z-10 w-full flex flex-col items-center">
          <div className="text-[40px] mb-4">🔍</div>
          <div className="w-[80%] h-2 bg-neutral-800 rounded-full overflow-hidden">
            <motion.div initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }} className="w-full h-full bg-gradient-to-r from-transparent via-pink-500 to-transparent" />
          </div>
          <div className="mt-2 text-[10px] text-pink-400 font-bold uppercase tracking-widest">جاري تحليل البيانات...</div>
        </div>
      )}

      {vibe && (
        <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12 }} className="z-10 text-center">
          <div className="text-[12px] text-white/50 mb-1">المزاج الحالي:</div>
          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">{vibe}</div>
        </motion.div>
      )}
    </div>
    </HologramProjector>
  );
};

const TeleportMessage = ({ msg }: { msg: Message }) => {
  const [teleporting, setTeleporting] = useState(false);
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    if (teleporting) {
      if (window.navigator?.vibrate) window.navigator.vibrate([20, 20, 20, 100]);
      const t = setTimeout(() => {
        setTeleporting(false);
        setArrived(true);
        playMagicSparkle();
        if (window.navigator?.vibrate) window.navigator.vibrate([150]);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [teleporting]);

  return (
    <HologramProjector color="emerald" pulse>
    <div 
      onClick={() => { if (!teleporting && !arrived) setTeleporting(true); }}
      className="relative p-6 rounded-3xl bg-[#022c22] border border-emerald-500/30 overflow-hidden flex flex-col items-center justify-center cursor-pointer min-h-[140px] w-full"
    >
      {!arrived && !teleporting && (
        <div className="z-10 flex flex-col items-center">
          <div className="text-[60px] animate-bounce">🛸</div>
          <div className="mt-2 text-[12px] font-bold text-emerald-300">رسالة قادمة من مجرة أخرى.. اضغط لاستقبالها</div>
        </div>
      )}
      
      {teleporting && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div animate={{ rotate: 360, scale: [1, 5] }} transition={{ duration: 1.5, ease: "easeIn" }} className="w-20 h-20 border-[4px] border-emerald-500 border-t-transparent rounded-full opacity-50" />
          <motion.div animate={{ rotate: -360, scale: [1, 3] }} transition={{ duration: 1.5, ease: "easeIn" }} className="absolute w-10 h-10 border-[4px] border-emerald-300 border-b-transparent rounded-full opacity-80" />
        </div>
      )}

      {arrived && (
        <motion.div initial={{ scale: 0, filter: "blur(10px)" }} animate={{ scale: 1, filter: "blur(0px)" }} transition={{ type: "spring", stiffness: 200 }} className="z-10 text-center">
          <div className="text-[30px] mb-2 drop-shadow-[0_0_15px_rgba(52,211,153,1)]">✨</div>
          <div className="font-bold text-white text-lg"><EmojiText text={msg.content} /></div>
        </motion.div>
      )}
    </div>
    </HologramProjector>
  );
};

const GlitchMessage = ({ msg }: { msg: Message }) => {
  const [glitching, setGlitching] = useState(false);

  const triggerGlitch = () => {
    if (glitching) return;
    setGlitching(true);
    playGlitch();
    setTimeout(() => setGlitching(false), 500);
  };

  return (
    <HologramProjector color="cyan" pulse={glitching}>
    <div 
      onClick={triggerGlitch}
      className={`relative p-6 rounded-3xl overflow-hidden flex flex-col items-center justify-center cursor-pointer min-h-[140px] w-full bg-black border ${glitching ? 'border-red-500' : 'border-green-500/50'}`}
    >
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]" />
      
      {glitching && (
        <div className="absolute inset-0 flex flex-col mix-blend-screen pointer-events-none z-20">
          <div className="h-1/3 w-full bg-red-500/40 animate-[glitch1_0.1s_infinite]" />
          <div className="h-1/3 w-full bg-green-500/40 animate-[glitch2_0.15s_infinite]" />
          <div className="h-1/3 w-full bg-blue-500/40 animate-[glitch1_0.05s_infinite]" />
          <style>{`
            @keyframes glitch1 { 0% { transform: translateX(10px); } 100% { transform: translateX(-10px); } }
            @keyframes glitch2 { 0% { transform: translateX(-15px); } 100% { transform: translateX(15px); } }
          `}</style>
        </div>
      )}

      <div className={`z-10 text-center font-mono ${glitching ? 'text-red-500 blur-[1px]' : 'text-green-400'}`}>
        <div className="text-[40px] mb-2 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">👾</div>
        <div className="font-bold text-lg" style={{ textShadow: glitching ? "2px 0 red, -2px 0 cyan" : "none" }}>
          <EmojiText text={msg.content} />
        </div>
      </div>
    </div>
    </HologramProjector>
  );
};

const VinylMessage = () => {
  const [playing, setPlaying] = useState(false);

  const togglePlay = () => {
    if (playing) return; // Only allow playing once for demo simplicity
    setPlaying(true);
    playVinylMusic();
    setTimeout(() => setPlaying(false), 4000); // 4 seconds music demo
  };

  return (
    <HologramProjector color="orange">
    <div 
      onClick={togglePlay}
      className="relative p-6 rounded-[40px] bg-gradient-to-br from-neutral-800 to-black border border-white/10 overflow-hidden flex flex-col items-center justify-center cursor-pointer min-h-[180px] w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
    >
      {/* Vinyl Record */}
      <motion.div 
        animate={playing ? { rotate: 360 } : { rotate: 0 }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
        className="w-32 h-32 rounded-full border-4 border-neutral-900 bg-neutral-800 flex items-center justify-center relative shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
        style={{
          background: "conic-gradient(from 0deg, #111 0deg, #333 45deg, #111 90deg, #333 135deg, #111 180deg, #333 225deg, #111 270deg, #333 315deg, #111 360deg)"
        }}
      >
        {/* Record Grooves */}
        <div className="absolute inset-2 rounded-full border border-black/50" />
        <div className="absolute inset-4 rounded-full border border-black/50" />
        <div className="absolute inset-6 rounded-full border border-black/50" />
        <div className="absolute inset-8 rounded-full border border-black/50" />
        <div className="absolute inset-10 rounded-full border border-black/50" />
        
        {/* Center Label */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center shadow-inner relative z-10">
          <div className="w-2 h-2 rounded-full bg-neutral-900" />
        </div>
      </motion.div>

      {/* Tonearm */}
      <motion.div 
        animate={playing ? { rotate: 25 } : { rotate: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="absolute top-8 right-12 w-2 h-16 bg-neutral-300 rounded-full origin-top"
        style={{ boxShadow: "2px 2px 5px rgba(0,0,0,0.5)" }}
      >
        <div className="absolute top-0 -left-2 w-6 h-6 rounded-full bg-neutral-400" />
        <div className="absolute bottom-0 -left-1 w-4 h-6 bg-neutral-200 rounded-sm" />
      </motion.div>

      {/* Music Notes */}
      <AnimatePresence>
        {playing && (
          <>
            <motion.div initial={{ y: 0, opacity: 1, scale: 0.5 }} animate={{ y: -60, opacity: 0, scale: 1.5, x: -20 }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute text-rose-400 text-xl font-bold top-1/2 left-1/4">♪</motion.div>
            <motion.div initial={{ y: 0, opacity: 1, scale: 0.5 }} animate={{ y: -80, opacity: 0, scale: 1.5, x: 20 }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }} className="absolute text-orange-400 text-xl font-bold top-1/2 right-1/4">♫</motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="mt-4 font-bold text-white/80 text-[13px] tracking-widest uppercase">
        {playing ? "Now Playing..." : "اضغط للتشغيل"}
      </div>
    </div>
    </HologramProjector>
  );
};

const EncryptedMessage = ({ msg }: { msg: Message }) => {
  const [decrypted, setDecrypted] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [text, setText] = useState("");
  const target = msg.content;
  
  useEffect(() => {
    if (!decrypting && !decrypted) {
      setText(target.split('').map(() => String.fromCharCode(33 + Math.floor(Math.random() * 94))).join(''));
    }
  }, [decrypting, decrypted, target]);

  useEffect(() => {
    if (decrypting) {
      let step = 0;
      const t = setInterval(() => {
        step += 0.05;
        if (step >= 1) {
          setDecrypted(true);
          setDecrypting(false);
          setText(target);
          clearInterval(t);
        } else {
          setText(target.split('').map((c, i) => {
            if (i / target.length < step) return c;
            return String.fromCharCode(33 + Math.floor(Math.random() * 94));
          }).join(''));
        }
      }, 50);
      return () => clearInterval(t);
    }
  }, [decrypting, target]);

  return (
    <HologramProjector color="emerald">
    <div 
      className="p-4 rounded-xl border border-[#10b981]/30 bg-black/60 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] flex flex-col items-center select-none cursor-pointer w-full"
      onPointerDown={() => { if (!decrypted) setDecrypting(true); }}
      onPointerUp={() => { if (!decrypted) setDecrypting(false); }}
      onPointerLeave={() => { if (!decrypted) setDecrypting(false); }}
    >
      <div className="font-mono text-[14px] text-[#10b981] break-words whitespace-pre-wrap leading-relaxed drop-shadow-[0_0_5px_rgba(16,185,129,0.8)] min-w-[150px] min-h-[40px] flex items-center justify-center text-center">
        {text}
      </div>
      {!decrypted && (
        <div className="mt-3 text-[10px] uppercase font-bold text-[#10b981]/50 tracking-widest flex flex-col items-center gap-1">
          <span className="animate-pulse">اضغط مطولاً لفك التشفير</span>
          <div className="w-8 h-8 rounded-full border border-[#10b981]/50 flex items-center justify-center drop-shadow-[0_0_5px_rgba(16,185,129,0.5)] text-[16px]">
            🔐
          </div>
        </div>
      )}
    </div>
    </HologramProjector>
  );
};

const CanvasMessage = ({ msg, conversationId }: { msg: Message, conversationId: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const { editMessage } = useChatStore();
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 280;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctxRef.current = ctx;

    if (msg.content && msg.content !== "{}") {
      const img = new window.Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = msg.content;
    } else {
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !ctxRef.current || !canvasRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    if (!ctxRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const end = () => {
    setIsDrawing(false);
    if (ctxRef.current) ctxRef.current.closePath();
    if (canvasRef.current) {
      editMessage(conversationId, msg.id, canvasRef.current.toDataURL());
    }
  };

  return (
    <HologramProjector color="cyan" interactive>
    <div className="relative rounded-2xl overflow-hidden border border-white/20 bg-[#1e1e1e] shadow-[0_10px_30px_rgba(0,0,0,0.5)] w-full">
      <div className="absolute top-2 left-3 z-10 text-[10px] font-bold text-white/50 uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-md">سبورة مشتركة</div>
      <canvas
        ref={canvasRef}
        onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
        className="touch-none cursor-crosshair block w-full h-[200px]"
      />
      <button 
        onClick={() => {
          if (!ctxRef.current || !canvasRef.current) return;
          ctxRef.current.fillStyle = '#1e1e1e';
          ctxRef.current.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          editMessage(conversationId, msg.id, "{}");
        }}
        className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 border border-white/20 flex items-center justify-center z-10 text-white/70 hover:text-white transition-all hover:bg-black/80"
        title="مسح السبورة"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
    </HologramProjector>
  );
};

interface Props {
  msg: Message;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isLastOverall: boolean;
  borderRadius: string;
  otherUser?: User;
  conversationId: string;
  allMessages: Message[];
  themeClass: string;
  isGroup?: boolean;
  participants?: User[];
}

export const MessageBubble = memo(function MessageBubble({
  msg, isOwn, isFirstInGroup, isLastInGroup, isLastOverall,
  borderRadius, otherUser, conversationId, allMessages, themeClass, isGroup, participants
}: Props) {
  const { toggleReaction, unsendMessage, setReplyingTo, setEditingMessage } = useChatStore();
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    // Cancel swipe if vertical movement dominates (user is scrolling, not swiping)
    if (Math.abs(dy) > Math.abs(dx) * 1.5) {
      touchStartRef.current = null;
      setIsSwiping(false);
      setSwipeX(0);
      return;
    }
    if (dx < 0) setSwipeX(Math.max(dx, -70));
  };

  const handleTouchEnd = () => {
    if (swipeX <= -55) {
      handleReply();
      if (window.navigator?.vibrate) window.navigator.vibrate(40);
    }
    touchStartRef.current = null;
    setIsSwiping(false);
    setSwipeX(0);
  };

  useEffect(() => {
    if (!showReactions) return;
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowReactions(false); setShowActions(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [showReactions]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300 && !msg.isUnsent) {
      toggleReaction(conversationId, msg.id, "❤️");
      // Haptic: double-tap heart
      if (window.navigator?.vibrate) window.navigator.vibrate([10, 30, 10]);
      lastTap.current = 0;
    } else {
      setShowTime(s => !s);
      lastTap.current = now;
    }
  };

  const handleReply  = () => { setReplyingTo(conversationId, msg.id); setShowActions(false); };
  const handleEdit   = () => { setEditingMessage(conversationId, msg.id); setShowActions(false); };
  const handleCopy   = () => { navigator.clipboard.writeText(msg.content).catch(() => {}); setShowActions(false); };
  const handleUnsend = () => { unsendMessage(conversationId, msg.id); setShowActions(false); };
  const onReact = (emoji: string) => {
    toggleReaction(conversationId, msg.id, emoji);
    // Haptic: reaction pop
    if (window.navigator?.vibrate) window.navigator.vibrate([5, 20, 5]);
    setShowReactions(false); setShowActions(false);
  };

  const reactions = msg.reactions ?? [];
  const reactionCounts = reactions.reduce<Record<string, number>>((a, r) => ({ ...a, [r.emoji]: (a[r.emoji] || 0) + 1 }), {});
  const reactionEntries = Object.entries(reactionCounts);
  const myReaction = reactions.find((r) => r.userId === CURRENT_USER.id)?.emoji;
  const replyTo = msg.replyToId ? allMessages.find((m) => m.id === msg.replyToId) : null;
  const gamePayload = msg.type === "game" ? safeJsonParse<{ kind?: string; gameId?: string }>(msg.content) : null;
  const isGame = msg.type === "game";

  const isOnlyEmoji = useMemo(() => {
    if (msg.type !== "text" || msg.isUnsent) return false;
    const stripped = msg.content.replace(emojiRegex(), "").trim();
    if (stripped.length > 0) return false;
    const count = (msg.content.match(emojiRegex()) || []).length;
    return count > 0 && count <= 3;
  }, [msg]);

  const originStyle = { transformOrigin: isOwn ? "bottom right" : "bottom left" };

  if (msg.isUnsent) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={cn("flex px-4 relative", isOwn ? "justify-end" : "justify-start", isFirstInGroup ? "mt-[10px]" : "mt-[2px]")}
        dir="ltr"
        style={originStyle}
      >
        {!isOwn && isLastInGroup && <div className="w-[30px] ml-2 flex-shrink-0 flex items-end pb-[2px]"><img src={otherUser?.avatarUrl} className="w-[30px] h-[30px] rounded-full object-cover shadow-sm" /></div>}
        {!isOwn && !isLastInGroup && <div className="w-[38px] flex-shrink-0" />}
        <div className="px-4 py-2 text-[14px] italic text-[#a8a8a8] bg-[#1a1a1a] border border-white/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] rounded-[22px]">
          {isOwn ? "لقد سحبت رسالة" : "تم سحب الرسالة"}
        </div>
      </motion.div>
    );
  }

  if (msg.type === "theme") {
    const themeName = {
      default: "الافتراضي", monochrome: "وضع التخفي", ocean: "أمواج المحيط",
      love: "حب ورومانسية", cyberpunk: "سايبر بانك", forest: "غابة استوائية", halloween: "نار وهالوين"
    }[msg.content] || msg.content;
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="w-full flex justify-center my-6"
      >
        <div className="text-[12px] font-medium text-[#a8a8a8] bg-[#1a1a1a] border border-white/[0.08] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] px-5 py-1.5 rounded-full flex items-center gap-2">
          {isOwn ? "غيّرت ثيم المحادثة إلى " : "تم تغيير الثيم إلى "}
          <span className="font-bold text-white tracking-wide">{themeName}</span> ✨
        </div>
      </motion.div>
    );
  }

  return (
    <ContextMenu.Root onOpenChange={(open) => { if (!open) setShowActions(false); }}>
      <ContextMenu.Trigger asChild>
        <div className="relative w-full overflow-visible z-10">
          <AnimatePresence>
            {swipeX < 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: Math.min(1, Math.abs(swipeX) / 50), scale: Math.min(1, Math.abs(swipeX) / 55) }}
                exit={{ opacity: 0, scale: 0.5 }}
                className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md shadow-xl border border-white/[0.1] ${isOwn ? "right-2" : "right-10"}`}
                style={{ width: 36, height: 36 }}
              >
                <CornerUpLeft className="w-5 h-5 text-white drop-shadow-md" />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.93, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            transition={{ type: "spring", stiffness: 380, damping: 26, mass: 0.7 }}
            whileTap={{ scale: 0.97 }}
            ref={wrapRef}
            dir="ltr"
            className={cn("flex px-2 sm:px-4 relative group", isOwn ? "justify-end" : "justify-start", isFirstInGroup ? "mt-[10px]" : "mt-[2px]")}
            style={{
              ...originStyle,
              transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
              transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              zIndex: showActions || showReactions ? 50 : 1
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => { if (!showReactions) setShowActions(false); }}
          >
            {!isOwn && isLastInGroup && (
              <div className="w-[30px] ml-2 flex-shrink-0 flex items-end pb-[2px]">
                <img src={otherUser?.avatarUrl} className="w-[30px] h-[30px] rounded-full object-cover shadow-sm ring-1 ring-white/10" alt="" />
              </div>
            )}
            {!isOwn && !isLastInGroup && <div className="w-[38px] flex-shrink-0" />}

            {/* 🔥 GOD MODE: Game bubbles fill 100% width. Standard bubbles fill max 75% */}
            <div className={cn(
              "flex flex-col relative", 
              isOwn ? "items-end" : "items-start", 
              (isGame || (msg.type && !["text", "image", "video", "voice", "like", "theme", "poke", "nudge", "bomb", "whisper", "confetti"].includes(msg.type))) 
                ? "w-full max-w-[95%] sm:max-w-[85%] md:max-w-[75%]" 
                : "max-w-[75%]"
            )}>
              
              {/* Reply Preview */}
              {replyTo && (
                <div className={cn("mb-[4px] max-w-full flex flex-col", isOwn ? "items-end" : "items-start")}>
                  <div
                    className="px-3 py-1.5 text-[12px] rounded-[14px] max-w-full shadow-lg border border-white/[0.08]"
                    style={{
                      background: isOwn ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.4)',
                      borderLeft: isOwn ? 'none' : '2px solid rgba(255,255,255,0.3)',
                      borderRight: isOwn ? '2px solid rgba(255,255,255,0.3)' : 'none',
                    }}
                  >
                    <span className="text-[10px] font-bold block mb-0.5 text-white/60">
                      {isOwn ? "ردّيت" : `ردّ ${otherUser?.displayName ?? ""}`}
                    </span>
                    <span className="text-white/90 truncate block max-w-[200px] drop-shadow-sm">
                      <EmojiText text={replyTo.content} size={12} />
                    </span>
                  </div>
                </div>
              )}

              <div className={cn("relative flex items-center gap-1.5 w-full", isOwn ? "justify-end" : "justify-start")}>
                {isOwn && showActions && (
                  <motion.div initial={{ opacity: 0, scale: 0.8, x: -10 }} animate={{ opacity: 1, scale: 1, x: 0 }} className="flex items-center gap-1 text-[#737373] absolute right-full mr-2 z-20">
                    <button onClick={() => setShowReactions(s => !s)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-2xl border border-white/10 hover:bg-white/20 hover:text-white transition-all shadow-xl active:scale-90" title="تفاعل"><Smile className="w-[16px] h-[16px]" /></button>
                    <button onClick={handleReply} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-2xl border border-white/10 hover:bg-white/20 hover:text-white transition-all shadow-xl active:scale-90" title="ردّ"><CornerUpLeft className="w-[15px] h-[15px]" /></button>
                  </motion.div>
                )}

                {/* THE MAIN BUBBLE */}
                <motion.div
                  onClick={handleTap}
                  whileHover={(!isOnlyEmoji && !isGame) ? { scale: 1.02, y: -2, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" } : {}}
                  animate={{}}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={cn(
                    "relative select-none cursor-pointer leading-[1.5] break-words whitespace-pre-wrap transition-shadow duration-300",
                    isGame && "w-full",
                    msg.type === "like" || isOnlyEmoji ? "text-[44px]" 
                    : msg.type === "image" || msg.type === "video" ? "p-0 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
                    : msg.type === "voice" ? cn("px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]", isOwn ? `${themeClass} text-white ring-1 ring-white/20` : "bg-[#1a1a1a] border border-white/[0.08] text-white")
                    : isGame || msg.type === "poll" || msg.type === "love_letter" || msg.type === "heartbeat" || msg.type === "hug" || msg.type === "hold_hand" || msg.type === "kiss" || msg.type === "encrypted" || msg.type === "canvas" || msg.type === "knock" || msg.type === "cheers" || msg.type === "feed" || msg.type === "slap" || msg.type === "weather" || msg.type === "walk_away" || msg.type === "shatter" || msg.type === "bored" || msg.type === "cry_together" || msg.type === "loneliness" || msg.type === "missing_you" || msg.type === "anxiety" || msg.type === "nostalgia" || msg.type === "forgive_me" || msg.type === "scratch_reveal" || msg.type === "heartbeat_sync" || msg.type === "coffee_share" || msg.type === "staring_contest" || msg.type === "hologram" || msg.type === "time_capsule" || msg.type === "vibe_check" || msg.type === "teleport" || msg.type === "glitch" || msg.type === "vinyl" ? "p-0 overflow-visible w-full"
                    : msg.type === "focus" ? "px-[20px] py-[12px] text-[18px] font-black relative overflow-visible bg-white text-black z-[9999] border-4 border-black"
                    : msg.type === "poke" ? "px-[16px] py-[10px] text-[15px] font-bold shadow-xl relative overflow-hidden bg-[#0ea5e9]/20 text-[#0ea5e9] border border-[#0ea5e9]/50"
                    : msg.type === "nudge" ? cn("px-[16px] py-[10px] text-[15px] font-medium shadow-xl relative overflow-hidden", isOwn ? `${themeClass} text-white` : "bg-[#1a1a1a] border border-[#ed4956]/50 text-[#ed4956] shadow-[0_0_15px_rgba(237,73,86,0.3)]")
                    : msg.type === "bomb" ? "px-[16px] py-[10px] text-[15px] font-medium shadow-xl relative overflow-hidden bg-[#1a1a1a] border border-[#ed4956] shadow-[inset_0_0_20px_rgba(237,73,86,0.2),0_10px_20px_rgba(0,0,0,0.5)]"
                    : msg.type === "whisper" ? "px-[16px] py-[10px] shadow-xl relative overflow-hidden bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 text-white/60 hover:bg-[#262626] transition-all duration-500"
                    : msg.type === "confetti" ? "px-[16px] py-[10px] text-[15px] font-bold shadow-xl relative overflow-hidden text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 shadow-[0_0_30px_rgba(236,72,153,0.5)] border border-white/30"
                    : cn("px-[16px] py-[10px] text-[15px] font-medium shadow-xl relative overflow-hidden", isOwn ? `${themeClass} text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_10px_20px_rgba(0,0,0,0.4)] ring-1 ring-black/20` : "bg-[#1a1a1a] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_10px_20px_rgba(0,0,0,0.4)] text-[#fafafa]")
                  )}
                  style={{
                    borderRadius: (msg.type === "like" || isOnlyEmoji || msg.type === "focus") ? "0" : (msg.type === "image" || msg.type === "video" || isGame) ? "24px" : borderRadius,
                    boxShadow: msg.type === "focus" ? "0 0 0 100vmax rgba(0,0,0,0.85), 0 0 50px rgba(255,255,255,0.5)" : undefined,
                    zIndex: msg.type === "focus" ? 9999 : undefined
                  }}
                  dir="auto"
                >
                  {/* Subtle shine effect for own text messages */}
                  {isOwn && msg.type === "text" && !isOnlyEmoji && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  )}

                  {msg.type === "voice" && msg.voice ? (
                    <div className="relative">
                      {/* Pulse glow behind voice msg */}
                      <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full pointer-events-none" />
                      <VoiceMessage src={msg.content} peaks={msg.voice.peaks} duration={msg.voice.duration} isOwn={isOwn} />
                    </div>
                  ) : msg.type === "like" ? (
                    <motion.div initial={{ scale: 0.5, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>❤️</motion.div>
                  ) : msg.type === "image" ? (
                    <img src={msg.content} alt="صورة" className="max-w-[260px] max-h-[340px] sm:max-w-[320px] object-cover rounded-[24px]" />
                  ) : msg.type === "video" ? (
                    <video src={msg.content} controls className="max-w-[260px] max-h-[340px] sm:max-w-[320px] object-cover bg-black rounded-[24px]" />
                  ) : msg.type === "game" ? (
                    <div className="w-full flex flex-col justify-stretch items-stretch relative overflow-visible">
                      {gamePayload?.kind === "hub" ? (
                        <GameHubInline hubMessage={msg} conversationId={conversationId} isGroup={isGroup} participants={participants} />
                      ) : gamePayload?.kind === "bank_start" ? (
                        <HologramProjector color="emerald" interactive>
                          <BankElHazInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                        </HologramProjector>
                      ) : gamePayload?.kind === "xo_start" ? (
                        <HologramProjector color="blue" interactive>
                          <XoInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                        </HologramProjector>
                      ) : gamePayload?.kind === "rps" ? (
                        <HologramProjector color="orange" interactive>
                          <RpsInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                        </HologramProjector>
                      ) : gamePayload?.kind === "c4_start" ? (
                        <HologramProjector color="pink" interactive>
                          <Connect4InlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                        </HologramProjector>
                      ) : gamePayload?.kind === "sl_start" ? (
                        <HologramProjector color="emerald" interactive>
                          <SnakesLaddersInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                        </HologramProjector>
                      ) : gamePayload?.kind === "chess_start" ? (
                        <HologramProjector color="purple" interactive>
                          <ChessInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                        </HologramProjector>
                      ) : gamePayload?.kind === "seega_start" ? (
                        <HologramProjector color="cyan" interactive>
                          <SeegaInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                        </HologramProjector>
                      ) : gamePayload?.kind === "memory_start" ? (
                        <HologramProjector color="blue" interactive>
                          <MemoryInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                        </HologramProjector>
                      ) : gamePayload?.kind === "hangman_start" ? (
                        <HologramProjector color="pink" interactive>
                          <HangmanInline gameMessage={msg} conversationId={conversationId} allMessages={allMessages} />
                        </HologramProjector>
                      ) : (
                        <div className="rounded-[32px] border border-white/10 bg-black/80 backdrop-blur-3xl p-5 text-center text-white font-bold shadow-2xl">
                          لعبة غير مدعومة حالياً
                        </div>
                      )}
                    </div>
                  ) : msg.type === "poll" ? (
                    <PollInline msg={msg} conversationId={conversationId} isOwn={isOwn} participants={participants ?? []} />
                  ) : msg.type === "nudge" ? (
                    <motion.div
                      onClick={() => useChatStore.getState().setActive3DExperience({ type: "nudge" })}
                      animate={{ x: [-10, 10, -10, 10, -5, 5, -2, 2, 0] }}
                      transition={{ duration: 0.5, repeat: 3 }}
                      className="font-black text-lg italic flex flex-col items-center gap-2 drop-shadow-md cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        📳 {isOwn ? "قمت برج الموبايل!" : "رجة انتباه!"}
                      </div>
                      <div className="mt-1 text-[10px] bg-white/30 px-3 py-1 rounded-full text-white font-bold">اضغط للتجربة 🌌</div>
                    </motion.div>
                  ) : msg.type === "spoiler" ? (
                    <div className="relative group/spoiler cursor-pointer select-none">
                      <div className="absolute -inset-1 bg-black/80 backdrop-blur-md rounded-md group-hover/spoiler:opacity-0 transition-all duration-300 flex items-center justify-center z-10 border border-white/10">
                        <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest drop-shadow-md">رسالة سرية 🤫</span>
                      </div>
                      <div className="opacity-0 group-hover/spoiler:opacity-100 transition-opacity duration-300">
                        <EmojiText text={msg.content} />
                      </div>
                    </div>
                  ) : msg.type === "bomb" ? (
                    <BombMessage msg={msg} conversationId={conversationId} />
                  ) : msg.type === "whisper" ? (
                    <div className="group/whisper cursor-pointer select-none flex items-center gap-2 transition-all duration-500 ease-in-out">
                      <span className="opacity-50 text-[14px]">🌬️</span>
                      <span className="text-[13px] italic group-hover/whisper:text-[15px] group-hover/whisper:not-italic group-hover/whisper:text-white transition-all duration-300">
                        <EmojiText text={msg.content} />
                      </span>
                    </div>
                  ) : msg.type === "confetti" ? (
                    <HologramProjector color="pink">
                    <div 
                      onClick={() => useChatStore.getState().setActive3DExperience({ type: "confetti" })}
                      className="relative flex flex-col items-center justify-center min-w-[100px] cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-[url('https://cdn-icons-png.flaticon.com/128/3409/3409748.png')] bg-contain bg-center opacity-30 animate-[spin_10s_linear_infinite] pointer-events-none mix-blend-screen" />
                      <span className="relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]"><EmojiText text={msg.content} /></span>
                      <div className="mt-2 relative z-10 text-[10px] bg-white/20 px-3 py-1 rounded-full text-white font-bold">اضغط للاحتفال 🎉</div>
                    </div>
                    </HologramProjector>
                  ) : msg.type === "love_letter" ? (
                    <LoveLetterMessage msg={msg} />
                  ) : msg.type === "heartbeat" ? (
                    <HologramProjector color="pink" pulse>
                    <motion.div 
                      animate={{ scale: [1, 1.4, 1, 1.4, 1] }} 
                      transition={{ repeat: Infinity, duration: 1.5, times: [0, 0.1, 0.2, 0.3, 1] }}
                      className="text-[80px] drop-shadow-[0_0_40px_rgba(255,42,95,1)] cursor-pointer select-none"
                      onClick={() => { 
                        if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]); 
                        useChatStore.getState().setActive3DExperience({ type: "heartbeat_sync" });
                      }}
                    >
                      💓
                    </motion.div>
                    </HologramProjector>
                  ) : msg.type === "hug" ? (
                    <HologramProjector color="pink">
                    <div 
                      onClick={() => useChatStore.getState().setActive3DExperience({ type: "hug" })}
                      className="relative w-full max-w-[280px] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(255,154,158,0.4)] p-6 bg-gradient-to-br from-[#fecfef] to-[#ff9a9e] border border-white/40 flex flex-col items-center text-center cursor-pointer"
                    >
                      <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)]" />
                      <motion.div 
                        animate={{ y: [0, -10, 0], scale: [1, 1.05, 1] }} 
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        className="text-[64px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.2)] z-10"
                      >
                        🤗
                      </motion.div>
                      <div className="mt-4 font-black text-[#8a3c4b] tracking-wide text-[16px] drop-shadow-sm z-10">
                        {isOwn ? "لقد أرسلت حضناً دافئاً" : `${otherUser?.displayName ?? "صديقك"} أرسل لك حضناً دافئاً`}
                      </div>
                      <div className="mt-2 text-[10px] bg-white/30 px-3 py-1 rounded-full text-[#8a3c4b] font-bold">اضغط لفتح التجربة 🌌</div>
                      {/* Floating hearts */}
                      <motion.div animate={{ y: [0, -40], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0 }} className="absolute bottom-4 left-6 text-xl">❤️</motion.div>
                      <motion.div animate={{ y: [0, -50], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }} className="absolute bottom-2 right-8 text-lg">💖</motion.div>
                      <motion.div animate={{ y: [0, -30], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.8, delay: 1 }} className="absolute top-1/2 left-1/4 text-sm">✨</motion.div>
                    </div>
                    </HologramProjector>
                  ) : msg.type === "focus" ? (
                    <div className="flex items-center gap-2">
                      <EmojiText text={msg.content} />
                    </div>
                  ) : msg.type === "poke" ? (
                    <motion.div
                      animate={{ x: [-10, 10, -10, 10, -5, 5, -2, 2, 0] }}
                      transition={{ duration: 0.5, repeat: 4 }}
                      onAnimationStart={() => { if (window.navigator?.vibrate) window.navigator.vibrate([30, 30, 30, 30, 30]); }}
                      className="font-black text-[20px] flex items-center gap-2 drop-shadow-[0_0_15px_rgba(14,165,233,0.8)]"
                    >
                      👈 نكش!
                    </motion.div>
                  ) : msg.type === "hold_hand" ? (
                    <HoldHandMessage />
                  ) : msg.type === "kiss" ? (
                    <KissMessage />
                  ) : msg.type === "encrypted" ? (
                    <EncryptedMessage msg={msg} />
                  ) : msg.type === "canvas" ? (
                    <CanvasMessage msg={msg} conversationId={conversationId} />
                  ) : msg.type === "knock" ? (
                    <KnockMessage />
                  ) : msg.type === "cheers" ? (
                    <CheersMessage />
                  ) : msg.type === "feed" ? (
                    <FeedMessage msg={msg} conversationId={conversationId} />
                  ) : msg.type === "slap" ? (
                    <SlapMessage />
                  ) : msg.type === "weather" ? (
                    <WeatherMessage />
                  ) : msg.type === "walk_away" ? (
                    <WalkAwayMessage />
                  ) : msg.type === "shatter" ? (
                    <ShatterMessage />
                  ) : msg.type === "bored" ? (
                    <BoredMessage />
                  ) : msg.type === "cry_together" ? (
                    <CryTogetherMessage />
                  ) : msg.type === "loneliness" ? (
                    <LonelinessMessage />
                  ) : msg.type === "missing_you" ? (
                    <MissingYouMessage />
                  ) : msg.type === "anxiety" ? (
                    <AnxietyMessage />
                  ) : msg.type === "nostalgia" ? (
                    <NostalgiaMessage />
                  ) : msg.type === "forgive_me" ? (
                    <ForgiveMessage />
                  ) : msg.type === "scratch_reveal" ? (
                    <ScratchRevealMessage msg={msg} />
                  ) : msg.type === "heartbeat_sync" ? (
                    <HeartbeatSyncMessage />
                  ) : msg.type === "coffee_share" ? (
                    <CoffeeShareMessage />
                  ) : msg.type === "staring_contest" ? (
                    <StaringContestMessage />
                  ) : msg.type === "universe_share" ? (
                    <ThreeDEmotionMessage />
                  ) : msg.type === "hologram" ? (
                    <HologramMessage msg={msg} />
                  ) : msg.type === "time_capsule" ? (
                    <TimeCapsuleMessage msg={msg} />
                  ) : msg.type === "vibe_check" ? (
                    <VibeCheckMessage msg={msg} />
                  ) : msg.type === "teleport" ? (
                    <TeleportMessage msg={msg} />
                  ) : msg.type === "glitch" ? (
                    <GlitchMessage msg={msg} />
                  ) : msg.type === "vinyl" ? (
                    <VinylMessage />
                  ) : (
                    <EmojiText text={msg.content} />
                  )}
                </motion.div>

                {!isOwn && showActions && (
                  <motion.div initial={{ opacity: 0, scale: 0.8, x: 10 }} animate={{ opacity: 1, scale: 1, x: 0 }} className="flex items-center gap-1 text-[#737373] absolute left-full ml-2 z-20">
                    <button onClick={() => setShowReactions(s => !s)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-2xl border border-white/10 hover:bg-white/20 hover:text-white transition-all shadow-xl active:scale-90"><Smile className="w-[16px] h-[16px]" /></button>
                    <button onClick={handleReply} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-2xl border border-white/10 hover:bg-white/20 hover:text-white transition-all shadow-xl active:scale-90"><CornerUpLeft className="w-[15px] h-[15px]" /></button>
                  </motion.div>
                )}

                <AnimatePresence>
                  {showReactions && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className={cn("absolute -top-16 z-[100] bg-black/70 backdrop-blur-3xl border border-white/[0.15] shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.1)] rounded-full px-3 py-2.5 flex items-center gap-2", isOwn ? "right-0" : "left-0")}
                    >
                      {QUICK_REACTIONS.map((e, i) => (
                        <motion.button
                          key={e}
                          initial={{ opacity: 0, y: 10, scale: 0 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: i * 0.03, type: "spring", stiffness: 400 }}
                          onClick={() => onReact(e)}
                          className={cn("w-10 h-10 rounded-full text-[26px] flex items-center justify-center transition-all hover:scale-[1.4] hover:-translate-y-2 drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]", myReaction === e ? "bg-white/20 ring-1 ring-white/50" : "")}
                        >
                          <EmojiText text={e} size={28} />
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reaction Chips */}
              <AnimatePresence>
                {reactionEntries.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={cn("flex relative z-[60] mt-[-14px]", isOwn ? "justify-end pr-3" : "justify-start pl-3")}
                  >
                    <div className="rounded-full px-3.5 py-1.5 flex items-center gap-2 cursor-pointer bg-black/70 backdrop-blur-2xl border border-white/20 shadow-[0_10px_20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-black/90 transition-colors">
                      {reactionEntries.map(([emoji, count]) => (
                        <button key={emoji} onClick={() => onReact(emoji)} className="flex items-center gap-1.5 active:scale-90 transition-transform">
                          <EmojiText text={emoji} size={16} />
                          {count > 1 && <span className="text-[12px] font-bold text-white drop-shadow-md">{count}</span>}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isOwn && isLastInGroup && isLastOverall && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-[11px] mt-1 pr-1 flex items-center gap-1 font-medium text-white/50 tracking-wide"
                  >
                    {msg.status === "sending" ? "جاري الإرسال..." : msg.status === "sent" ? "أُرسلت" : msg.status === "delivered" ? "وصلت" : "مقروءة"}
                    {msg.isEdited && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 backdrop-blur-sm">معدّلة</span>}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <AnimatePresence>
                {showTime && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={cn("text-[11px] text-white/40 mt-1 mb-1 font-semibold tracking-wider", isOwn ? "text-right pr-2" : "text-left pl-2")}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="z-[200] w-[260px] bg-black/80 backdrop-blur-3xl rounded-[24px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.1)] ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
            {QUICK_REACTIONS.slice(0, 6).map((e) => (
              <ContextMenu.Item key={e} onSelect={() => onReact(e)} className={cn("w-9 h-9 rounded-full flex items-center justify-center hover:scale-125 transition-transform outline-none cursor-pointer", myReaction === e ? "bg-white/20 ring-1 ring-white/30" : "")}>
                <EmojiText text={e} size={24} />
              </ContextMenu.Item>
            ))}
          </div>
          <div className="p-2 flex flex-col gap-1">
            <ContextMenu.Item onSelect={handleReply} className="flex items-center justify-between px-3 py-3 rounded-[14px] hover:bg-white/10 outline-none text-white text-[15px] font-semibold cursor-pointer transition-colors group">ردّ<CornerUpLeft className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" /></ContextMenu.Item>
            <ContextMenu.Item onSelect={handleCopy} className="flex items-center justify-between px-3 py-3 rounded-[14px] hover:bg-white/10 outline-none text-white text-[15px] font-semibold cursor-pointer transition-colors group">نسخ<Copy className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-all" /></ContextMenu.Item>
            {isOwn && msg.type === "text" && <ContextMenu.Item onSelect={handleEdit} className="flex items-center justify-between px-3 py-3 rounded-[14px] hover:bg-white/10 outline-none text-white text-[15px] font-semibold cursor-pointer transition-colors group">تعديل<Edit2 className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-all" /></ContextMenu.Item>}
            {isOwn && <ContextMenu.Separator className="h-px bg-white/[0.08] my-1 mx-2" />}
            {isOwn && <ContextMenu.Item onSelect={handleUnsend} className="flex items-center justify-between px-3 py-3 rounded-[14px] hover:bg-[#ff3b30]/20 text-[#ff3b30] outline-none text-[15px] font-bold cursor-pointer transition-colors group">سحب الرسالة<Trash2 className="w-4 h-4 group-hover:scale-110 transition-all" /></ContextMenu.Item>}
          </div>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
});
