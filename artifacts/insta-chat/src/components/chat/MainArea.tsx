import { useState, useEffect } from "react";
import { useChatStore, sendInChatSignal } from "@/lib/store";
import { ChevronRight, Phone, Video, Info, MessageCircle, Mic } from "lucide-react";
import { useLocation } from "wouter";
import { Thread } from "./Thread";
import { Composer } from "./Composer";
import { EmojiStylePicker } from "./EmojiStylePicker";
import { InfoPanel } from "./InfoPanel";
import { motion, AnimatePresence } from "framer-motion";

function CallOverlay({ type, user, onEnd }: { type: "audio" | "video"; user: any; onEnd: () => void }) {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
      transition={{ duration: 0.5, type: "spring", bounce: 0.2 }}
      className="absolute inset-0 z-[100] flex flex-col bg-[#050505] overflow-hidden"
    >
      {type === "video" ? (
        <div className="absolute inset-0 bg-gradient-to-b from-[#007aff]/40 to-black opacity-90" />
      ) : (
        <div 
          className="absolute inset-0 opacity-30 bg-cover bg-center blur-3xl scale-150"
          style={{ backgroundImage: `url(${user.avatarUrl})` }}
        />
      )}
      
      {/* Ambient glowing orb for the background */}
      <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-gradient-to-br from-purple-600/30 to-blue-600/30 blur-[80px] pointer-events-none" />

      <div className="absolute inset-0 flex flex-col items-center pt-32 z-10">
        <div className="relative mb-10">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative z-10"
          >
            <img 
              src={user.avatarUrl} 
              className="w-40 h-40 rounded-full object-cover shadow-[0_20px_50px_rgba(0,0,0,0.8)] ring-4 ring-white/10" 
              alt="" 
            />
          </motion.div>
          
          {/* Radar pulses */}
          {[0, 1, 2].map((i) => (
            <motion.div 
              key={i}
              animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeOut", delay: i * 1 }}
              className="absolute inset-0 rounded-full border border-white/30" 
            />
          ))}
          <motion.div 
            animate={{ scale: [1, 1.8], opacity: [0.2, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeOut", delay: 0.5 }}
            className="absolute inset-0 rounded-full bg-white/10 blur-md" 
          />
        </div>
        <motion.h2 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-[32px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-2 tracking-wide drop-shadow-xl"
        >
          {user.displayName || user.username}
        </motion.h2>
        <motion.p 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-[#00d2ff] text-[18px] font-bold drop-shadow-[0_0_10px_rgba(0,210,255,0.6)] tracking-wider"
        >
          {type === "video" ? "مكالمة فيديو" : "مكالمة صوتية"}{dots}
        </motion.p>
      </div>

      {/* Call controls */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center items-center gap-10 z-10">
        <motion.button 
          whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
          whileTap={{ scale: 0.9 }}
          className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
        >
          <Mic className="w-7 h-7 text-white stroke-[2]" />
        </motion.button>
        
        {type === "video" && (
          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
            whileTap={{ scale: 0.9 }}
            className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          >
            <Video className="w-7 h-7 text-white stroke-[2]" />
          </motion.button>
        )}
        
        <motion.button 
          whileHover={{ scale: 1.1, boxShadow: "0 0 40px rgba(255,59,48,0.8)" }}
          whileTap={{ scale: 0.9 }}
          onClick={onEnd}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ff3b30] to-[#c91811] flex items-center justify-center transition-all shadow-[0_10px_30px_rgba(255,59,48,0.6),inset_0_2px_0_rgba(255,255,255,0.2)] group"
        >
          <motion.div animate={{ rotate: [135, 125, 145, 135] }} transition={{ repeat: Infinity, duration: 0.5, repeatDelay: 2 }}>
            <Phone className="w-9 h-9 text-white transform rotate-[135deg] drop-shadow-md stroke-[2.5]" />
          </motion.div>
        </motion.button>
      </div>
    </motion.div>
  );
}

export function MainArea({ activeId }: { activeId: string | null }) {
  const [, setLocation] = useLocation();
  const activeConv = useChatStore((s) => activeId ? s.conversations[activeId] : null);
  const inChatPeers = useChatStore((s) => s.inChatPeers);
  const otherUser = activeConv?.participants[0];
  const isGroup = activeConv?.isGroup;
  const headerTitle = isGroup ? (activeConv.groupName || "مجموعة") : (otherUser?.displayName || otherUser?.username || "");
  const headerAvatar = isGroup ? `https://ui-avatars.com/api/?name=${encodeURIComponent(headerTitle)}&background=262626&color=fff` : otherUser?.avatarUrl;
  const [showInfo, setShowInfo] = useState(false);
  const [calling, setCalling] = useState<"audio" | "video" | null>(null);

  // Broadcast in_chat status
  useEffect(() => {
    if (activeId && !isGroup) {
      sendInChatSignal(activeId, true);
      return () => {
        sendInChatSignal(activeId, false);
      };
    }
  }, [activeId, isGroup]);

  /* ── Empty state ─────────────────────────────────────────────── */
  if (!activeId || !activeConv) {
    return (
      <div className={`flex-1 flex-col bg-transparent relative z-10 ${!activeId ? "hidden md:flex" : "flex"}`}>
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
          className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-8"
        >
          <div className="relative group">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5, y: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-32 h-32 rounded-[2.5rem] border border-white/10 flex items-center justify-center bg-black/40 backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] relative z-10"
            >
              <MessageCircle className="w-14 h-14 text-white/80 stroke-[1.5] group-hover:text-white transition-colors drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-[2.5rem] bg-[#007aff] blur-[40px] -z-10"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-[2.5rem] -z-10" />
          </div>
          <div>
            <h2 className="text-[32px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-3 tracking-tight drop-shadow-xl">رسائلك الخاصة</h2>
            <p className="text-[#a8a8a8] text-[16px] max-w-[320px] mx-auto leading-relaxed font-bold">
              أرسل رسائل خاصة، العب مع أصدقائك، واكتشف بُعداً جديداً ومثيراً للتواصل الفخم.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="mt-4 px-10 py-4 rounded-[20px] bg-gradient-to-r from-[#007aff] to-[#0056b3] text-white font-black text-[16px] transition-all shadow-[0_15px_30px_rgba(0,122,255,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] group overflow-hidden relative"
            onClick={() => setLocation("/")}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="relative z-10">إرسال رسالة جديدة</span>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  /* ── Active conversation ─────────────────────────────────────── */
  const customBg = activeConv.bgImage;
  const customBgOpacity = activeConv.bgOpacity ?? 0.15;

  return (
    <div className="flex-1 flex flex-col bg-transparent relative h-full overflow-hidden z-10">

      {/* Custom Conversation Background */}
      {customBg && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: customBgOpacity }}
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-opacity duration-700"
          style={{ backgroundImage: `url(${customBg})` }}
        />
      )}

      {/* Call Overlay */}
      <AnimatePresence>
        {calling && otherUser && (
          <CallOverlay type={calling} user={otherUser} onEnd={() => setCalling(null)} />
        )}
      </AnimatePresence>

      {/* Info Panel */}
      <AnimatePresence>
        {showInfo && otherUser && (
          <InfoPanel
            user={otherUser}
            conversationId={activeId}
            onClose={() => setShowInfo(false)}
          />
        )}
      </AnimatePresence>

      {/* Header — God-Mode Glass style */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] z-20 shrink-0 bg-black/50 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-2 relative z-10">
          {/* Back (mobile) */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setLocation("/")}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
          >
            <ChevronRight className="w-6 h-6 stroke-[2.5]" />
          </motion.button>

          {/* Avatar + name — clickable to open InfoPanel */}
          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3.5 px-2 py-1.5 rounded-2xl transition-all"
            onClick={() => setShowInfo(true)}
          >
            <div className="relative">
              <img
                src={headerAvatar}
                className="w-[46px] h-[46px] rounded-full object-cover ring-[2px] ring-white/10 shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
                alt={headerTitle}
              />
              {!isGroup && otherUser?.isOnline && (
                <div className="absolute bottom-0 right-0">
                  {!inChatPeers[otherUser?.username || ""] && (
                    <span className="absolute inline-flex w-full h-full rounded-full bg-[#00d26a] opacity-60 animate-ping shadow-[0_0_10px_rgba(0,210,106,0.8)]" />
                  )}
                  <span className="relative inline-flex w-[14px] h-[14px] bg-[#00d26a] rounded-full border-[2.5px] border-[#0a0a0a] shadow-[0_0_10px_rgba(0,210,106,1)]" />
                </div>
              )}
            </div>
            <div className="flex flex-col items-start">
              <div className="font-black text-[16px] text-white leading-tight tracking-wide flex items-center gap-2 drop-shadow-md">
                {headerTitle}
                {isGroup && <span className="bg-white/15 border border-white/10 text-white/80 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest shadow-sm">Group</span>}
              </div>
              <div className="text-[13px] text-[#00d2ff] font-bold mt-[2px] drop-shadow-[0_0_5px_rgba(0,210,255,0.3)]">
                {isGroup ? `${activeConv.participants.length} أعضاء مميزين` : (inChatPeers[otherUser?.username || ""] ? "في الدردشة الآن" : (otherUser?.isOnline ? "متصل الآن" : "نشط منذ فترة قصيرة"))}
              </div>
            </div>
          </motion.button>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1.5 text-white pr-2 relative z-10">
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.08)", textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
            whileTap={{ scale: 0.9 }}
            aria-label="مكالمة صوتية"
            onClick={() => setCalling("audio")}
            className="w-11 h-11 flex items-center justify-center rounded-full transition-all border border-transparent hover:border-white/10"
          >
            <Phone className="w-[24px] h-[24px] stroke-[2]" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.08)", textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
            whileTap={{ scale: 0.9 }}
            aria-label="مكالمة فيديو"
            onClick={() => setCalling("video")}
            className="w-11 h-11 flex items-center justify-center rounded-full transition-all border border-transparent hover:border-white/10"
          >
            <Video className="w-[26px] h-[26px] stroke-[2]" />
          </motion.button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <EmojiStylePicker align="left" />
          
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.08)", textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
            whileTap={{ scale: 0.9 }}
            aria-label="معلومات"
            onClick={() => setShowInfo(true)}
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all border border-transparent hover:border-white/10 ${showInfo ? "bg-white/15 border-white/20 shadow-inner" : ""}`}
          >
            <Info className="w-[26px] h-[26px] stroke-[2]" />
          </motion.button>
        </div>
      </motion.div>

      <Thread activeId={activeId} />
      <Composer activeId={activeId} />
    </div>
  );
}