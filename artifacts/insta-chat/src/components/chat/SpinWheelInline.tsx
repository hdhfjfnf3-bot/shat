import { useMemo, useState, useEffect } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Sparkles, User, Crosshair } from "lucide-react";

type StartPayload = {
  kind: "wheel_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
  preset: "ضحك" | "رومانسية" | "ميكس";
};

type SpinPayload = {
  kind: "wheel_spin";
  gameId: string;
  by: string;
  at: string;
};

type Payload = StartPayload | SpinPayload;

const PRESETS: Record<StartPayload["preset"], string[]> = {
  ضحك: [
    "قلّد صوت مذيع 10 ثواني",
    "اعمل وش جد في سيلفي",
    "قول كلمة… والتاني يطلع 3 مرادفات في 5 ثواني",
    "غنّي كلمة واحدة بس من أغنية",
    "اختار فلتر تخيلي ووصفه",
    "احكي موقف محرج في سطرين",
  ],
  رومانسية: [
    "قول 3 حاجات بتحبها فيه/فيها",
    "رسالة صوتية 8 ثواني: (أنا مبسوط عشان…)",
    "وعد صغير للأسبوع ده",
    "قولي أكتر حاجة بتريحك لما تتعب",
    "اختاروا خروجة بسيطة وتحددوا يومها",
    "كلمة سر لطيفة بينكم",
  ],
  ميكس: [
    "قلّد صوت مذيع 10 ثواني",
    "قول 3 حاجات بتحبها فيه/فيها",
    "احكي موقف محرج في سطرين",
    "وعد صغير للأسبوع ده",
    "غنّي كلمة واحدة بس من أغنية",
    "رسالة صوتية 8 ثواني: (أنا مبسوط عشان…)",
  ],
};

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Map presets to premium neon colors
const THEME_COLORS = {
  ضحك: ["#FF2A54", "#FF9D00"],
  رومانسية: ["#FF0844", "#FFB199"],
  ميكس: ["#B829FF", "#00D2FF"],
};

export function SpinWheelInline({ gameMessage, otherUserId, conversationId, allMessages, participants }: {
  gameMessage: Message;
  otherUserId: string;
  conversationId: string;
  allMessages: Message[];
  participants?: import("@/lib/types").User[];
}) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();
  const [spinning, setSpinning] = useState(false);
  const [targetAngle, setTargetAngle] = useState(0);

  const start = useMemo(() => safeJsonParse<StartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "wheel_start" ? start.gameId : null;

  const spins = useMemo(() => {
    if (!gameId) return 0;
    let n = 0;
    for (const m of allMessages) {
      if (m.type !== "game") continue;
      const p = safeJsonParse<Payload>(m.content);
      if (!p || p.gameId !== gameId) continue;
      if (p.kind === "wheel_spin") n++;
    }
    return n;
  }, [allMessages, gameId]);

  if (!start || !gameId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
        رسالة عجلة الحظ غير صالحة.
      </div>
    );
  }

  const items = PRESETS[start.preset];
  const sliceDeg = 360 / items.length;
  const theme = THEME_COLORS[start.preset];

  // Logic to determine picked item based on spins
  const seed = hashSeed(`${gameId}:${spins}`);
  const pickedIndex = seed % items.length;
  const picked = items[pickedIndex]!;

  const allPlayers = useMemo(() => {
    if (!participants || participants.length === 0) {
      const p1 = start?.createdBy.toLowerCase() || "";
      const p2 = p1 === me ? otherUserId.toLowerCase() : me;
      return [p1, p2];
    }
    const set = new Set<string>();
    set.add(start?.createdBy.toLowerCase() || "");
    participants.forEach((p) => set.add(p.username.toLowerCase()));
    set.add(me);
    return Array.from(set).sort();
  }, [participants, start?.createdBy, me, otherUserId]);

  const currentTurnPlayer = allPlayers[spins % allPlayers.length];
  const myTurn = currentTurnPlayer === me;

  // Initialize correct angle based on current spin count
  useEffect(() => {
    const baseRotation = spins * 360 * 5; // 5 full spins per turn minimum
    const sliceOffset = 360 - (pickedIndex * sliceDeg);
    const finalAngle = baseRotation + sliceOffset - (sliceDeg / 2);
    setTargetAngle(finalAngle);
  }, [spins, pickedIndex, sliceDeg]);

  const spin = () => {
    if (!myTurn || spinning) return;
    setSpinning(true);
    
    // Send message to trigger spin for everyone
    const payload: SpinPayload = { kind: "wheel_spin", gameId, by: me, at: new Date().toISOString() };
    sendMessage(conversationId, JSON.stringify(payload), "game");
    
    setTimeout(() => {
      setSpinning(false);
    }, 4500); // Wait for spin animation to finish
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="rounded-[24px] border border-white/10 bg-black/60 backdrop-blur-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] relative isolate hardware-accelerated"
    >
      {/* Dynamic ambient background glow */}
      <motion.div 
        animate={{ opacity: spinning ? 0.6 : 0.2, scale: spinning ? 1.2 : 1 }} 
        transition={{ duration: 1 }}
        className="absolute inset-0 -z-10 blur-[60px]"
        style={{ background: `radial-gradient(circle at 50% 50%, ${theme[0]}, transparent 70%)` }}
      />

      <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.05] bg-gradient-to-r from-white/[0.05] to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-[14px] font-black text-white drop-shadow-md tracking-wide">عجلة الحظ <span className="text-[#a8a8a8] text-[12px] font-medium ml-1">({start.preset})</span></div>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 flex items-center gap-1.5 backdrop-blur-md">
          <User className="w-3.5 h-3.5 text-[#00d2ff]" />
          <span className="text-[12px] font-bold text-white drop-shadow-sm">{myTurn ? "دورك" : `دور ${currentTurnPlayer}`}</span>
        </div>
      </div>

      <div className="p-6 flex flex-col items-center gap-6">
        
        {/* 3D Wheel Container */}
        <div className="relative w-[240px] h-[240px] flex items-center justify-center preserve-3d perspective-[1000px]">
          
          {/* Wheel Pointer (Fixed) */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]">
            <motion.div animate={spinning ? { rotate: [-5, 5, -5] } : {}} transition={{ repeat: Infinity, duration: 0.1 }}>
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-white relative z-10" />
              <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-white/30 absolute -top-[2px] -left-[2px] -z-10 blur-[2px]" />
            </motion.div>
          </div>

          {/* The Spinning Wheel */}
          <motion.div
            animate={{ rotate: targetAngle }}
            transition={{ type: "spring", damping: 12, stiffness: 20, mass: 1, restDelta: 0.001 }}
            className="w-full h-full rounded-full border-[6px] border-[#1a1a1a] shadow-[0_0_30px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(0,0,0,0.6)] relative overflow-hidden bg-[#222]"
            style={{ filter: spinning ? "drop-shadow(0 0 20px rgba(255,255,255,0.2))" : "none" }}
          >
            {items.map((item, i) => {
              const rotation = i * sliceDeg;
              return (
                <div
                  key={i}
                  className="absolute inset-0 origin-center flex items-start justify-center"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  {/* Slice Divider */}
                  <div className="absolute top-0 bottom-1/2 w-0.5 bg-black/40 shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ transform: `rotate(${sliceDeg/2}deg)`, transformOrigin: "bottom center" }} />
                  
                  {/* Text Content */}
                  <div 
                    className="pt-6 font-bold text-[10px] text-white/90 drop-shadow-md text-center px-4"
                    style={{ transform: `rotate(${sliceDeg/2}deg)`, width: "120px" }}
                  >
                    {item.length > 20 ? item.slice(0, 20) + "..." : item}
                  </div>
                </div>
              );
            })}

            {/* Center Cap */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-[#333] to-[#111] border-[3px] border-[#222] shadow-[0_5px_15px_rgba(0,0,0,0.8),inset_0_2px_5px_rgba(255,255,255,0.2)] z-20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
            </div>
          </motion.div>
        </div>

        {/* Result Area */}
        <div className="w-full relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-2xl" />
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center relative overflow-hidden backdrop-blur-md">
            <div className="text-[12px] text-[#00d2ff] font-bold mb-1.5 tracking-wider uppercase drop-shadow-[0_0_5px_rgba(0,210,255,0.5)]">النتيجة</div>
            <AnimatePresence mode="wait">
              <motion.div 
                key={picked}
                initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="text-[16px] font-black text-white leading-relaxed drop-shadow-lg"
              >
                {spinning ? "يتم السحب..." : picked}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <motion.button
          whileHover={myTurn && !spinning ? { scale: 1.05, boxShadow: "0 10px 30px rgba(0, 122, 255, 0.4)" } : {}}
          whileTap={myTurn && !spinning ? { scale: 0.95 } : {}}
          onClick={spin}
          disabled={!myTurn || spinning}
          className={[
            "w-full rounded-2xl border border-transparent py-4 text-[15px] font-black transition-all flex items-center justify-center gap-2",
            myTurn && !spinning
              ? "bg-gradient-to-r from-[#007aff] to-[#00d2ff] text-white shadow-[0_10px_20px_rgba(0,122,255,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110"
              : "bg-white/5 text-white/30 cursor-not-allowed border-white/10",
          ].join(" ")}
        >
          {spinning ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <RefreshCw className="w-5 h-5" />
            </motion.div>
          ) : (
            <Crosshair className="w-5 h-5 drop-shadow-md" />
          )}
          <span>{spinning ? "جاري اللف..." : "لف العجلة الآن"}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
