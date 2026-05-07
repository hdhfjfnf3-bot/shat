import React from "react";
import { motion } from "framer-motion";
import { useChatStore } from "@/lib/store";

export const ThreeDEmotionMessage = () => {
  const setActive3D = useChatStore(s => s.setActive3DExperience);

  return (
    <div 
      onClick={() => setActive3D({ type: "universe_share" })}
      className="relative w-full overflow-hidden cursor-pointer flex flex-col items-center justify-center bg-black border border-white/20 shadow-[0_10px_40px_rgba(100,50,255,0.4)]"
      style={{ minHeight: 240, borderRadius: 28 }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#4c1d95_0%,_#000_100%)]" />
        
        {/* CSS-based glowing orb instead of heavy inline 3D Canvas */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], filter: ["blur(10px)", "blur(20px)", "blur(10px)"] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#8b5cf6] rounded-full opacity-60 mix-blend-screen"
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-[#c4b5fd] rounded-full shadow-[0_0_50px_#a78bfa]"
        />
        
        {/* CSS Stars */}
        {[...Array(30)].map((_, i) => (
          <motion.div 
            key={i}
            className="absolute bg-white rounded-full"
            style={{ 
              width: Math.random() * 3 + 1, 
              height: Math.random() * 3 + 1,
              top: `${Math.random() * 100}%`, 
              left: `${Math.random() * 100}%` 
            }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>
      
      <div className="z-10 text-white font-black text-lg drop-shadow-[0_2px_10px_rgba(0,0,0,1)] bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 mt-32 flex items-center gap-2">
        <span>اضغط لفتح بُعد آخر</span>
        <span className="text-xl">🌌</span>
      </div>
    </div>
  );
};
