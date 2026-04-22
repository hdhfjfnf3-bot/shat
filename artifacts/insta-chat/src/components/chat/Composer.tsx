import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/store";
import { Smile, Mic, Image, Heart, X, CornerUpLeft, Trash2, Send } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useEmojiStyle, EMOJI_STYLE_TO_PICKER } from "@/lib/emojiStyle";
import { EmojiText } from "./EmojiText";
import { CURRENT_USER } from "@/lib/types";
import { VoiceRecorder, formatDuration } from "@/lib/voice";

export function Composer({ activeId }: { activeId: string }) {
  const { sendMessage, replyingTo, setReplyingTo, messages, conversations } = useChatStore();
  const [inputText, setInputText] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const style = useEmojiStyle((s) => s.style);

  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const liveBars = useRef<number[]>([]);
  const [, force] = useState(0);

  const replyId = replyingTo[activeId];
  const replyMsg = replyId ? (messages[activeId] || []).find((m) => m.id === replyId) : null;
  const conv = conversations[activeId];
  const replyAuthor = replyMsg
    ? replyMsg.senderId === CURRENT_USER.id
      ? "You"
      : conv?.participants.find((p) => p.id === replyMsg.senderId)?.displayName ?? "Them"
    : "";

  useEffect(() => {
    if (!showPicker) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showPicker]);

  useEffect(() => {
    if (replyMsg) taRef.current?.focus();
  }, [replyId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.cancel();
    };
  }, []);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(activeId, inputText.trim(), "text", replyId ?? undefined);
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

  const startRecord = async () => {
    try {
      const r = new VoiceRecorder();
      r.onLevel = (lv) => {
        setLevel(lv);
        liveBars.current.push(lv);
        if (liveBars.current.length > 60) liveBars.current.shift();
        force((x) => x + 1);
      };
      await r.start();
      recorderRef.current = r;
      setRecording(true);
      setElapsed(0);
      liveBars.current = [];
      timerRef.current = window.setInterval(() => {
        setElapsed((e) => e + 0.1);
      }, 100);
    } catch (err) {
      console.error("Mic permission denied", err);
      alert("Microphone access denied. Allow microphone permission to record voice messages.");
    }
  };

  const stopRecord = async (send: boolean) => {
    const r = recorderRef.current;
    if (!r) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    if (!send) {
      r.cancel();
      recorderRef.current = null;
      return;
    }
    const result = await r.stop();
    recorderRef.current = null;
    if (result && result.duration > 0.3) {
      sendMessage(activeId, result.dataUrl, "voice", replyId ?? undefined, {
        duration: result.duration,
        peaks: result.peaks,
      });
    }
  };

  const showSend = inputText.trim().length > 0;

  return (
    <div className="p-4 pt-2 shrink-0 bg-[#000000] relative" ref={wrapRef}>
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

      {replyMsg && !recording && (
        <div className="mb-2 mx-1 flex items-center gap-3 px-3 py-2 rounded-xl bg-[#161616] border border-[#262626]">
          <CornerUpLeft className="w-4 h-4 text-[#a8a8a8] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-[#a8a8a8]">Replying to {replyAuthor}</div>
            <div className="text-[13px] text-[#fafafa] truncate">
              <EmojiText text={replyMsg.content} size={14} />
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(activeId, null)}
            className="text-[#a8a8a8] hover:text-white shrink-0"
            aria-label="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {recording ? (
        <div className="border border-[#262626] rounded-full pl-3 pr-3 py-2.5 flex items-center gap-3 bg-[#000000] min-h-[44px]">
          <button
            onClick={() => stopRecord(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#262626] hover:bg-[#363636] text-[#ed4956] shrink-0"
            aria-label="Cancel"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ed4956] animate-pulse" />
            <div className="text-[13px] tabular-nums text-[#fafafa]">{formatDuration(elapsed)}</div>
            <div className="flex items-end gap-[2px] h-7 flex-1 overflow-hidden">
              {liveBars.current.slice(-50).map((v, i) => (
                <div
                  key={i}
                  style={{
                    width: 2,
                    height: Math.max(3, Math.round(v * 28)),
                    background: "linear-gradient(180deg, #d62976, #fa7e1e)",
                    borderRadius: 1,
                  }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => stopRecord(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center ig-gradient text-white shrink-0 hover:scale-105 transition-transform"
            aria-label="Send voice"
            style={{ transform: `scale(${1 + level * 0.2})` }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      ) : (
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
              if (e.key === "Escape" && replyId) setReplyingTo(activeId, null);
            }}
          />
          {showSend ? (
            <button
              onClick={handleSend}
              className="ml-2 font-semibold text-[#0095f6] hover:text-white transition-colors self-center"
            >
              Send
            </button>
          ) : (
            <div className="flex items-center gap-3 ml-2 self-center text-white">
              <button onClick={startRecord} className="hover:opacity-70" aria-label="Record voice">
                <Mic className="w-[24px] h-[24px] stroke-[1.5]" />
              </button>
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
      )}
    </div>
  );
}
