import { useEffect, useRef, memo, useMemo, useState, useCallback } from "react";
import { useChatStore } from "@/lib/store";
import { useMe } from "@/lib/me";
import { Message, MessageType } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import confetti from "canvas-confetti";

/* ── Typing indicator ──────────────────────────────────────────── */
const TypingIndicator = memo(function TypingIndicator({ avatarUrl }: { avatarUrl?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, y: 10, transformOrigin: "bottom left" }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex items-end gap-3 px-4 mb-2"
    >
      {avatarUrl && (
        <motion.img 
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          src={avatarUrl} 
          className="w-[32px] h-[32px] rounded-full object-cover shrink-0 shadow-[0_5px_15px_rgba(0,0,0,0.5)] border border-white/10" 
        />
      )}
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[24px] rounded-bl-[6px] px-5 py-3.5 flex items-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] relative overflow-hidden">
        {/* Shimmer effect */}
        <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]" />
        
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ y: [0, -6, 0], scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15, ease: "easeInOut" }}
            className="w-[7px] h-[7px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] inline-block relative z-10"
          />
        ))}
      </div>
    </motion.div>
  );
});

/* ── Date separator ─────────────────────────────────────────────── */
function DateSep({ label }: { label: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center my-6 px-4 relative z-0"
    >
      <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -z-10" />
      <div className="bg-[#1a1a1a] border border-white/10 px-4 py-1.5 rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.3)] flex items-center justify-center">
        <span className="text-[11px] text-[#a8a8a8] font-black uppercase tracking-widest drop-shadow-md">{label}</span>
      </div>
    </motion.div>
  );
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "اليوم";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "أمس";
  return d.toLocaleDateString("ar-EG", { weekday: "long", month: "short", day: "numeric" });
}

/* Stable empty array — NEVER use `?? []` inline in Zustand selectors.
   `[] !== []` causes Zustand to think state changed every render → infinite loop. */
const EMPTY_MSGS: Message[] = [];

/* ── Emotion Engine Config ──────────────────────────────────────── */
const EMOTION_CONFIG: Record<string, {
  bg: string; glow: string; label: string; emoji: string;
  shake?: boolean; pulse?: boolean; particles?: string[];
}> = {
  heartbeat:   { bg: "radial-gradient(ellipse at center, #3d0010 0%, #1a000a 60%, #000 100%)",   glow: "rgba(255,42,95,0.4)",    label: "قلب نابض",       emoji: "💓", pulse: true, particles: ["💓","❤️","💕"] },
  hug:         { bg: "radial-gradient(ellipse at center, #3d1a2a 0%, #1a0f18 60%, #000 100%)",   glow: "rgba(255,154,158,0.3)",  label: "حضن دافي",       emoji: "🤗", particles: ["💗","🤗","✨"] },
  love_letter: { bg: "radial-gradient(ellipse at center, #2d1a00 0%, #1a0f00 60%, #000 100%)",   glow: "rgba(255,215,0,0.3)",    label: "جواب حب",        emoji: "💌" },
  kiss:        { bg: "radial-gradient(ellipse at center, #3d0a2a 0%, #1a0510 60%, #000 100%)",   glow: "rgba(236,72,153,0.5)",   label: "بوسة",           emoji: "💋", particles: ["💋","💗","✨"] },
  hold_hand:   { bg: "radial-gradient(ellipse at center, #2d1f00 0%, #1a1200 60%, #000 100%)",   glow: "rgba(245,158,11,0.4)",   label: "إيد في إيد",    emoji: "🤝" },
  missing_you: { bg: "radial-gradient(ellipse at center, #1a0a2d 0%, #0d0518 60%, #000 100%)",   glow: "rgba(168,85,247,0.4)",   label: "وحشتني",         emoji: "💚", particles: ["💜","💙","✨"] },
  cry_together:{ bg: "radial-gradient(ellipse at center, #0a1a2d 0%, #050d1a 60%, #000 100%)",   glow: "rgba(59,130,246,0.4)",   label: "نبكي سوا",      emoji: "😭", particles: ["💧","😭","🌧️"] },
  loneliness:  { bg: "radial-gradient(ellipse at center, #030510 0%, #020308 60%, #000 100%)",   glow: "rgba(100,100,200,0.2)",  label: "وحيد",           emoji: "🌙" },
  anxiety:     { bg: "radial-gradient(ellipse at center, #1a0800 0%, #0d0400 60%, #000 100%)",   glow: "rgba(249,115,22,0.5)",   label: "قلق وخوف",      emoji: "😰", shake: true },
  nostalgia:   { bg: "radial-gradient(ellipse at center, #2d1500 0%, #1a0d00 60%, #000 100%)",   glow: "rgba(180,100,0,0.3)",    label: "حنين",           emoji: "🌅" },
  forgive_me:  { bg: "radial-gradient(ellipse at center, #001a0d 0%, #000d06 60%, #000 100%)",   glow: "rgba(16,185,129,0.3)",   label: "سامحني",         emoji: "🙏" },
  shatter:     { bg: "radial-gradient(ellipse at center, #0d0000 0%, #000 100%)",                glow: "rgba(100,0,0,0.3)",      label: "قلب مكسور",     emoji: "💔", shake: true },
  walk_away:   { bg: "radial-gradient(ellipse at center, #000 0%, #000 100%)",                   glow: "rgba(50,50,50,0.5)",     label: "سيبت وامشيت",  emoji: "🚪" },
  knock:       { bg: "radial-gradient(ellipse at center, #1a0000 0%, #000 100%)",                glow: "rgba(239,68,68,0.6)",    label: "خبط",            emoji: "✊", shake: true },
  confetti:    { bg: "radial-gradient(ellipse at center, #1a003d 0%, #0d0026 60%, #000 100%)",   glow: "rgba(167,139,250,0.5)",  label: "احتفال",         emoji: "🎉", particles: ["🎉","🎊","✨","🌟"] },
  cheers:      { bg: "radial-gradient(ellipse at center, #1a1000 0%, #0d0800 60%, #000 100%)",   glow: "rgba(252,211,77,0.4)",   label: "نخب",            emoji: "🍻", particles: ["🍻","✨","🥂"] },
  weather:     { bg: "radial-gradient(ellipse at center, #00060a 0%, #000 100%)",                glow: "rgba(56,189,248,0.3)",   label: "جو شتوي",       emoji: "🌧️" },
  nudge:       { bg: "",                                                                         glow: "rgba(255,200,0,0.4)",    label: "رجة",            emoji: "📳", shake: true },
  poke:        { bg: "radial-gradient(ellipse at center, #001a2d 0%, #000 100%)",                glow: "rgba(14,165,233,0.4)",   label: "نكش",            emoji: "👈", shake: true },
  slap:        { bg: "radial-gradient(ellipse at center, #1a0000 0%, #000 100%)",                glow: "rgba(239,68,68,0.5)",    label: "صفعة",           emoji: "✋", shake: true },
};

const EMOTION_DURATION_MS = 6000;

/* ── Web Audio Engine: synthesize emotional sounds ────────────── */
function playEmotionSound(type: string) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === "heartbeat" || type === "hug" || type === "missing_you" || type === "love_letter") {
      // Heartbeat thump: two thumps at 80ms apart
      const playThump = (startTime: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine"; osc.frequency.setValueAtTime(80, startTime);
        osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.1);
        gain.gain.setValueAtTime(0.5, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
        osc.start(startTime); osc.stop(startTime + 0.2);
      };
      playThump(ctx.currentTime);
      playThump(ctx.currentTime + 0.25);
    }
    else if (type === "kiss" || type === "kiss") {
      // Kiss sound: quick high chirp
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    }
    else if (type === "anxiety" || type === "shatter" || type === "walk_away") {
      // Discordant stab
      [220, 233, 245].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sawtooth"; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime + i * 0.05);
        osc.stop(ctx.currentTime + 0.5);
      });
    }
    else if (type === "confetti" || type === "cheers") {
      // Celebration: ascending major arpeggio
      [523, 659, 784, 1046].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "triangle"; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.35);
      });
    }
    else if (type === "nudge" || type === "knock" || type === "poke" || type === "slap") {
      // Impact: low rumble
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.value = 200;
      src.buffer = buffer;
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      gain.gain.value = 0.8;
      src.start();
    }
    else if (type === "cry_together" || type === "loneliness") {
      // Sad descending tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.start(); osc.stop(ctx.currentTime + 1.6);
    }
    else if (type === "forgive_me") {
      // Soft bell
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = 528;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
      osc.start(); osc.stop(ctx.currentTime + 2.1);
    }

    setTimeout(() => ctx.close(), 3000);
  } catch (e) {
    // Audio not available
  }
}

/* ── canvas-confetti launchers ──────────────────────────────────── */
function fireConfetti(type: string) {
  if (type === "confetti" || type === "cheers") {
    confetti({ particleCount: 120, spread: 100, origin: { y: 0.7 }, colors: ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#c77dff"] });
    setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 80, origin: { x: 0, y: 0.7 } }), 300);
    setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 80, origin: { x: 1, y: 0.7 } }), 500);
  } else if (type === "heartbeat" || type === "hug" || type === "kiss" || type === "missing_you") {
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 }, colors: ["#ff2a5f","#ff6b9d","#ffb3c9","#ffffff"], shapes: ["circle"] });
  } else if (type === "forgive_me") {
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: ["#10b981","#34d399","#6ee7b7","#ffffff"], startVelocity: 30 });
  }
}

/* ── Stable Virtuoso Components ─────────────────────────────────── */
const VirtuosoHeader = memo(({ context }: any) => {
  const { messagesLength, vanishMode, otherUser } = context;
  
  if (messagesLength > 0 && !vanishMode) return null;

  return (
    <>
      {messagesLength === 0 && !vanishMode && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="flex flex-col items-center justify-center gap-5 py-24"
        >
          <div className="relative">
            <img src={otherUser?.avatarUrl} className="w-24 h-24 rounded-full object-cover shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-2 border-white/10" alt="" />
            <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 rounded-full border border-white/20" />
          </div>
          <div className="text-center">
            <p className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 text-[20px] drop-shadow-md">{otherUser?.displayName || otherUser?.username}</p>
            <p className="text-[#a8a8a8] text-[15px] mt-1.5 font-bold">ابدأ الدردشة الآن 👋</p>
          </div>
        </motion.div>
      )}
      {vanishMode && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="flex flex-col items-center justify-center gap-5 py-24 relative z-10"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-[3px] border-[#00d2ff]/40 border-dashed flex items-center justify-center bg-black/50 backdrop-blur-md shadow-[0_0_30px_rgba(0,210,255,0.2)]">
              <motion.span animate={{ rotate: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="text-[36px] drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">🤫</motion.span>
            </div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 rounded-full bg-[#00d2ff]/20 blur-xl -z-10" />
          </div>
          <div className="text-center">
            <p className="font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00d2ff] to-[#3a7bd5] text-[20px] drop-shadow-[0_0_10px_rgba(0,210,255,0.5)]">وضع التدمير الذاتي</p>
            <p className="text-[#a8a8a8] text-[14px] mt-2.5 max-w-[240px] leading-relaxed font-medium">
              الرسائل المرسلة في هذا الوضع تختفي بمجرد إغلاق المحادثة لضمان الخصوصية التامة.
            </p>
          </div>
        </motion.div>
      )}
    </>
  );
});

const VirtuosoFooter = memo(({ context }: any) => {
  const { isTyping, otherUser } = context;
  return (
    <div className="pb-4">
      <AnimatePresence>
        {isTyping && <TypingIndicator avatarUrl={otherUser?.avatarUrl} />}
      </AnimatePresence>
    </div>
  );
});

const stableVirtuosoComponents = {
  Header: VirtuosoHeader,
  Footer: VirtuosoFooter,
};

/* ── Thread ─────────────────────────────────────────────────────── */
export function Thread({ activeId }: { activeId: string }) {
  const username  = useMe((s) => s.username);
  const messages  = useChatStore((s) => s.messages[activeId] ?? EMPTY_MSGS);
  const conv      = useChatStore((s) => s.conversations[activeId]);
  const isTyping  = useChatStore((s) => s.typingPeers[activeId] ?? false);
  const vanishMode = useChatStore((s) => s.vanishMode[activeId] ?? false);
  const otherUser = conv?.participants[0];
  const virtuoso = useRef<VirtuosoHandle>(null);

  // === EMOTION ENGINE ===
  const [activeEmotion, setActiveEmotion] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; emoji: string; x: number; delay: number }>>([]);
  const lastMsgIdRef = useRef<string | null>(null);
  const emotionTimerRef = useRef<number | null>(null);

  // Watch last message and trigger emotion
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.id === lastMsgIdRef.current) return;
    lastMsgIdRef.current = lastMsg.id;

    const cfg = EMOTION_CONFIG[lastMsg.type ?? ""];
    if (!cfg) return;

    // Trigger
    setActiveEmotion(lastMsg.type!);
    if (cfg.shake) setShakeKey(k => k + 1);

    // 🔊 Web Audio API: synthesize emotional sound
    playEmotionSound(lastMsg.type!);

    // 🎊 canvas-confetti: real physics particles
    fireConfetti(lastMsg.type!);

    // Spawn framer-motion particles for types with emoji particles
    if (cfg.particles) {
      const pts = Array.from({ length: 20 }, (_, i) => ({
        id: Date.now() + i,
        emoji: cfg.particles![i % cfg.particles!.length],
        x: Math.random() * 90 + 5,
        delay: Math.random() * 1.5,
      }));
      setParticles(pts);
      setTimeout(() => setParticles([]), 4000);
    }

    // Auto-clear after duration
    if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
    emotionTimerRef.current = window.setTimeout(() => setActiveEmotion(null), EMOTION_DURATION_MS);
  }, [messages]);

  const emotionCfg = activeEmotion ? EMOTION_CONFIG[activeEmotion] : null;

  /* Compute theme once for ALL messages */
  const themeClass = useMemo(() => {
    const themeMsg = [...messages].reverse().find(m => m.type === "theme");
    const id = themeMsg?.content || "default";
    const map: Record<string, string> = {
      default:    "bg-gradient-to-br from-[#3797f0] to-[#833ab4]",
      monochrome: "bg-gradient-to-br from-[#444444] to-[#111111]",
      ocean:      "bg-gradient-to-br from-[#00c6ff] to-[#0072ff]",
      love:       "bg-gradient-to-br from-[#ff0844] to-[#ffb199]",
      cyberpunk:  "bg-gradient-to-br from-[#f000ff] to-[#00d4ff]",
      forest:     "bg-gradient-to-br from-[#11998e] to-[#38ef7d]",
      halloween:  "bg-gradient-to-br from-[#ff8c00] to-[#e52e71]",
      sunset:     "bg-gradient-to-br from-[#fc4a1a] to-[#f7b733]",
      aurora:     "bg-gradient-to-br from-[#00b09b] to-[#96c93d]",
      royal:      "bg-gradient-to-br from-[#141E30] to-[#243B55]",
    };
    return map[id] || map["default"];
  }, [messages]);

  /* Build item list with date separators and precalculated styles */
  const items = useMemo(() => {
    const list: Array<any> = [];
    let lastDay = "";
    messages.forEach((msg, idx) => {
      // Skip game move payloads (show only start/hub messages)
      if (msg.type === "game") {
        try {
          const payload = JSON.parse(msg.content);
          if (payload?.kind && !payload.kind.endsWith("_start") && payload.kind !== "hub") return;
        } catch {}
      }
      const day = formatDay(msg.createdAt);
      if (day !== lastDay) { list.push({ type: "sep", label: day, id: `sep-${idx}` }); lastDay = day; }
      
      const isOwn = msg.senderId === username;
      const prev = messages[idx - 1];
      const next = messages[idx + 1];
      const isFirst = !prev || prev.senderId !== msg.senderId;
      const isLast  = !next || next.senderId !== msg.senderId;

      let br = "24px";
      if (isOwn) {
        // isOwn is on the LEFT in RTL
        if (!isFirst && !isLast) br = "6px 24px 24px 6px";
        else if (!isFirst && isLast)  br = "6px 24px 24px 24px";
        else if (isFirst && !isLast)  br = "24px 24px 24px 6px";
      } else {
        // !isOwn is on the RIGHT in RTL
        if (!isFirst && !isLast) br = "24px 6px 6px 24px";
        else if (!isFirst && isLast)  br = "24px 6px 24px 24px";
        else if (isFirst && !isLast)  br = "24px 24px 6px 24px";
      }

      list.push({ type: "msg", idx, msg, isOwn, isFirst, isLast, br, id: msg.id });
    });
    return list;
  }, [messages, username]);

  const virtuosoContext = useMemo(() => ({
    messagesLength: messages.length,
    vanishMode,
    otherUser,
    isTyping,
  }), [messages.length, vanishMode, otherUser, isTyping]);

  useEffect(() => {
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      if (lastItem && lastItem.isOwn) {
        const timer = setTimeout(() => {
          virtuoso.current?.scrollToIndex({
            index: items.length - 1,
            align: "end",
            behavior: "smooth"
          });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [items.length]);

  return (
    <motion.div
      key={shakeKey}
      animate={emotionCfg?.shake && shakeKey > 0 ? {
        x: [-8, 8, -6, 6, -4, 4, -2, 2, 0],
        y: [-4, 4, -3, 3, -1, 1, 0],
      } : {}}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className={`flex-1 min-h-0 flex flex-col transition-all duration-1000 overflow-hidden relative ${vanishMode ? "bg-black" : "bg-transparent"}`}
      style={{
        background: emotionCfg?.bg || undefined,
        boxShadow: emotionCfg ? `inset 0 0 80px ${emotionCfg.glow}, inset 0 0 160px ${emotionCfg.glow}33` : undefined,
        border: emotionCfg ? `1px solid ${emotionCfg.glow}` : undefined,
      }}
    >
      {/* === EMOTION BG GLOW PULSE === */}
      <AnimatePresence>
        {emotionCfg && (
          <motion.div
            key={activeEmotion}
            initial={{ opacity: 0 }}
            animate={{ opacity: emotionCfg.pulse ? [0.3, 0.7, 0.3] : [0, 0.5, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: emotionCfg.pulse ? 1 : 1.5, repeat: emotionCfg.pulse ? Infinity : 0, repeatType: "reverse" }}
            className="absolute inset-0 pointer-events-none z-0"
            style={{ background: `radial-gradient(ellipse at center, ${emotionCfg.glow} 0%, transparent 70%)` }}
          />
        )}
      </AnimatePresence>

      {/* === FLOATING PARTICLES === */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ y: "100vh", x: `${p.x}vw`, opacity: 0, scale: 0.5 }}
            animate={{ y: "-20vh", opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 0.8] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3 + Math.random(), delay: p.delay, ease: "easeOut" }}
            className="fixed text-[24px] pointer-events-none z-[9998]"
            style={{ left: `${p.x}%` }}
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* === EMOTION LABEL BADGE === */}
      <AnimatePresence>
        {emotionCfg && (
          <motion.div
            key={`badge-${activeEmotion}`}
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-xl border"
            style={{
              background: `${emotionCfg.glow.replace('rgba', 'rgba').replace(/,[^,]+\)$/, ',0.2)')}`,
              borderColor: emotionCfg.glow,
              boxShadow: `0 0 20px ${emotionCfg.glow}`
            }}
          >
            <span className="text-[16px]">{emotionCfg.emoji}</span>
            <span className="text-white/90 font-bold text-[12px] tracking-wide">{emotionCfg.label}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background glow for vanish mode */}
      <AnimatePresence>
        {vanishMode && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#111] via-black to-black pointer-events-none"
          />
        )}
      </AnimatePresence>

      <Virtuoso
        ref={virtuoso}
        className="flex-1 hide-scrollbar"
        data={items}
        initialTopMostItemIndex={items.length > 0 ? items.length - 1 : 0}
        followOutput="smooth"
        alignToBottom={true}
        components={stableVirtuosoComponents}
        context={virtuosoContext}
        itemContent={(index, item) => {
          if (item.type === "sep") return <DateSep label={item.label} />;
          return (
            <MessageBubble
              msg={item.msg}
              isOwn={item.isOwn}
              isFirstInGroup={item.isFirst}
              isLastInGroup={item.isLast}
              isLastOverall={item.idx === messages.length - 1}
              borderRadius={item.br}
              otherUser={otherUser}
              conversationId={activeId}
              allMessages={messages}
              themeClass={themeClass}
              isGroup={conv?.isGroup}
              participants={conv?.participants || []}
            />
          );
        }}
      />
    </motion.div>
  );
}
