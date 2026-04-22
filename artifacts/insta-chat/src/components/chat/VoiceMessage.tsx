import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { formatDuration } from "@/lib/voice";

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
  const fillColor = isOwn ? "rgba(255,255,255,0.95)" : "#0095f6";
  const bgColor = isOwn ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.25)";

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isOwn ? "bg-white/25 hover:bg-white/35" : "bg-[#0095f6] hover:bg-[#1877f2]"}`}
      >
        {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex items-center gap-[2px] h-7 flex-1">
          {safePeaks.map((p, i) => {
            const passed = i / safePeaks.length < progress;
            const h = Math.max(3, Math.round(p * 24));
            return (
              <div
                key={i}
                style={{
                  width: 2,
                  height: h,
                  borderRadius: 1,
                  background: passed ? fillColor : bgColor,
                  transition: "background 80ms linear",
                }}
              />
            );
          })}
        </div>
      </div>
      <button
        onClick={cycleRate}
        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${isOwn ? "bg-white/20 text-white" : "bg-white/10 text-[#fafafa]"}`}
      >
        {rate}x
      </button>
      <div className={`text-[11px] tabular-nums shrink-0 ${isOwn ? "text-white/90" : "text-[#a8a8a8]"}`}>
        {formatDuration(playing || progress > 0 ? cur : duration)}
      </div>
    </div>
  );
}
