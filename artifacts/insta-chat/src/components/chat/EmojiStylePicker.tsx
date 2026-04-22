import { useEffect, useRef, useState } from "react";
import { Smile, Check } from "lucide-react";
import { useEmojiStyle, EMOJI_STYLE_OPTIONS } from "@/lib/emojiStyle";

export function EmojiStylePicker({ align = "right" }: { align?: "left" | "right" }) {
  const { style, setStyle } = useEmojiStyle();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        aria-label="Emoji style"
        title="Emoji style"
        className="text-white hover:opacity-70"
      >
        <Smile className="w-6 h-6 stroke-[1.5]" />
      </button>
      {open && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-9 z-50 w-[230px] bg-[#1a1a1a] border border-[#363636] rounded-xl shadow-2xl overflow-hidden`}
        >
          <div className="px-4 pt-3 pb-2 text-[12px] uppercase tracking-wider text-[#a8a8a8] font-semibold">
            Emoji style
          </div>
          {EMOJI_STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                setStyle(opt.key);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#262626] text-[14px] text-left text-[#fafafa]"
            >
              <span>{opt.label}</span>
              {style === opt.key && <Check className="w-4 h-4 text-[#0095f6]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
