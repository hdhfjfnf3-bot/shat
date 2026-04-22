import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/store";
import { Smile, Mic, Image, Heart } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useEmojiStyle, EMOJI_STYLE_TO_PICKER } from "@/lib/emojiStyle";

export function Composer({ activeId }: { activeId: string }) {
  const { sendMessage } = useChatStore();
  const [inputText, setInputText] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const style = useEmojiStyle((s) => s.style);

  useEffect(() => {
    if (!showPicker) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showPicker]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(activeId, inputText.trim());
    setInputText("");
    setShowPicker(false);
  };

  const insertEmoji = (emoji: string) => {
    const ta = taRef.current;
    if (!ta) {
      setInputText((t) => t + emoji);
      return;
    }
    const start = ta.selectionStart ?? inputText.length;
    const end = ta.selectionEnd ?? inputText.length;
    const next = inputText.slice(0, start) + emoji + inputText.slice(end);
    setInputText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="p-4 pt-2 shrink-0 bg-[#000000]" ref={wrapRef}>
      {showPicker && (
        <div className="absolute bottom-[80px] left-4 z-50 shadow-2xl rounded-xl overflow-hidden border border-[#262626]">
          <EmojiPicker
            theme={Theme.DARK}
            emojiStyle={EMOJI_STYLE_TO_PICKER[style]}
            width={340}
            height={400}
            lazyLoadEmojis
            searchPlaceHolder="Search emoji"
            previewConfig={{ showPreview: false }}
            onEmojiClick={(d) => insertEmoji(d.emoji)}
          />
        </div>
      )}
      <div className="border border-[#262626] rounded-full pl-3 pr-4 py-2.5 flex items-end min-h-[44px] bg-[#000000]">
        <button
          className="p-1 hover:opacity-70 transition-opacity self-center mr-1 text-white"
          onClick={() => setShowPicker((s) => !s)}
          aria-label="Emoji picker"
        >
          <Smile className="w-[24px] h-[24px] stroke-[1.5]" />
        </button>
        <textarea
          ref={taRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message..."
          className="bg-transparent flex-1 outline-none text-[#fafafa] placeholder:text-[#737373] resize-none max-h-[120px] py-[2px] text-[15px] leading-[20px]"
          rows={1}
          dir="auto"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        {inputText.trim() ? (
          <button
            onClick={handleSend}
            className="ml-2 font-semibold text-[#0095f6] hover:text-white transition-colors self-center"
          >
            Send
          </button>
        ) : (
          <div className="flex items-center gap-3 ml-2 self-center text-white">
            <button className="hover:opacity-70" aria-label="Voice"><Mic className="w-[24px] h-[24px] stroke-[1.5]" /></button>
            <button className="hover:opacity-70" aria-label="Image"><Image className="w-[24px] h-[24px] stroke-[1.5]" /></button>
            <button
              className="hover:opacity-70"
              onClick={() => sendMessage(activeId, "❤️", "like")}
              aria-label="Like"
            >
              <Heart className="w-[24px] h-[24px] stroke-[1.5]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
