import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { formatDuration } from "@/lib/voice";
import { motion } from "framer-motion";

export function VoiceMessage({
  src,
  peaks,
  duration,
  isOwn,
}: {
  src: string;
  peaks: number[];
  duration: number;
  isOwn: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cur, setCur] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      const d = isFinite(a.duration) && a.duration > 0 ? a.duration : duration;
      setCur(a.currentTime);
      setProgress(d > 0 ? a.currentTime / d : 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCur(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, [duration]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.playbackRate = rate;
      a.play();
      setPlaying(true);
    }
  };

  const cycleRate = () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const safePeaks = peaks && peaks.length > 0 ? peaks : new Array(40).fill(0.4);

  const playBtnClass = isOwn
    ? "bg-white/30 hover:bg-white/40 text-white shadow-[0_4px_10px_rgba(255,255,255,0.2)]"
    : "bg-gradient-to-br from-[#3797f0] to-[#0072ff] hover:from-[#1877f2] hover:to-[#005bb5] text-white shadow-[0_4px_15px_rgba(55,151,240,0.4)]";
  const wavePassedColor = isOwn ? "rgba(255,255,255,1)" : "#3797f0";
  const waveBgColor     = isOwn ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)";
  const rateBtnClass    = isOwn ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/10 hover:bg-white/20 text-[#fafafa] border border-white/5";
  const timeCls         = isOwn ? "text-white/90" : "text-[#a8a8a8]";

  return (
    <div className="flex items-center gap-3 relative z-10" style={{ minWidth: 220 }}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggle}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors backdrop-blur-md border border-white/10 ${playBtnClass}`}
      >
        {playing
          ? <Pause className="w-4 h-4 fill-current" />
          : <Play  className="w-4 h-4 ml-0.5 fill-current" />
        }
      </motion.button>

      {/* Waveform */}
      <div className="flex items-center gap-[3px] h-8 flex-1 overflow-visible relative" dir="ltr">
        {safePeaks.map((p, i) => {
          const passed = i / safePeaks.length <= progress;
          const h = Math.max(4, Math.round(p * 28));
          
          return (
            <motion.div
              key={i}
              animate={playing && passed ? { 
                height: [h, Math.max(h * 1.5, 8), h], 
                backgroundColor: wavePassedColor,
                opacity: 1
              } : { 
                height: h, 
                backgroundColor: passed ? wavePassedColor : waveBgColor,
                opacity: passed ? 1 : 0.6
              }}
              transition={{
                height: { repeat: Infinity, duration: 0.6, ease: "easeInOut", delay: (i % 5) * 0.1 },
                backgroundColor: { duration: 0.2 }
              }}
              className="w-[3px] rounded-full shadow-sm"
              style={{
                flexShrink: 0,
                boxShadow: passed && !isOwn ? "0 0 5px rgba(55,151,240,0.5)" : passed && isOwn ? "0 0 5px rgba(255,255,255,0.5)" : "none"
              }}
            />
          );
        })}
      </div>

      <div className="flex flex-col items-end justify-center gap-1 shrink-0 ml-1">
        {/* Speed toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={cycleRate}
          className={`text-[10px] font-black px-2 py-0.5 rounded-full backdrop-blur-sm ${rateBtnClass}`}
        >
          {rate}x
        </motion.button>

        {/* Duration */}
        <div className={`text-[11px] tabular-nums font-bold ${timeCls}`}>
          {formatDuration(playing || progress > 0 ? cur : duration)}
        </div>
      </div>
    </div>
  );
}
