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

  /* Instagram colors:
     Own (gradient bg):  play button = white/30, waveform passed = white, unplayed = white/40
     Other (dark bg):    play button = #3797f0, waveform passed = #3797f0, unplayed = #555  */
  const playBtnClass = isOwn
    ? "bg-white/25 hover:bg-white/35 text-white"
    : "bg-[#3797f0] hover:bg-[#1877f2] text-white";
  const wavePassedColor = isOwn ? "rgba(255,255,255,0.95)" : "#3797f0";
  const waveBgColor     = isOwn ? "rgba(255,255,255,0.30)" : "#404040";
  const rateBtnClass    = isOwn ? "bg-white/20 text-white" : "bg-white/10 text-[#fafafa]";
  const timeCls         = isOwn ? "text-white/80" : "text-[#a8a8a8]";

  return (
    <div className="flex items-center gap-2.5" style={{ minWidth: 200 }}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause */}
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${playBtnClass}`}
      >
        {playing
          ? <Pause className="w-4 h-4" />
          : <Play  className="w-4 h-4 ml-0.5" />
        }
      </button>

      {/* Waveform */}
      <div className="flex items-end gap-[2px] h-7 flex-1 overflow-hidden" dir="ltr">
        {safePeaks.map((p, i) => {
          const passed = i / safePeaks.length < progress;
          const h = Math.max(3, Math.round(p * 26));
          return (
            <div
              key={i}
              style={{
                width: 2,
                height: h,
                borderRadius: 1,
                background: passed ? wavePassedColor : waveBgColor,
                transition: "background 60ms linear",
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>

      {/* Speed toggle */}
      <button
        onClick={cycleRate}
        className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${rateBtnClass}`}
      >
        {rate}x
      </button>

      {/* Duration */}
      <div className={`text-[12px] tabular-nums shrink-0 font-medium ${timeCls}`}>
        {formatDuration(playing || progress > 0 ? cur : duration)}
      </div>
    </div>
  );
}
