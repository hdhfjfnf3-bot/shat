import { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore, sendTypingSignal } from "@/lib/store";
import { Smile, Mic, Image, Heart, X, CornerUpLeft, Trash2, Send, Dices } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useEmojiStyle, EMOJI_STYLE_TO_PICKER } from "@/lib/emojiStyle";
import { EmojiText } from "./EmojiText";
import { CURRENT_USER } from "@/lib/types";
import { VoiceRecorder, formatDuration } from "@/lib/voice";

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }) as T;
}

export function Composer({ activeId }: { activeId: string }) {
  const { sendMessage, replyingTo, setReplyingTo, messages, conversations } = useChatStore();
  const [inputText, setInputText] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const style = useEmojiStyle((s) => s.style);

  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const liveBars = useRef<number[]>([]);
  const [, force] = useState(0);

  // Typing indicator state
  const typingRef = useRef(false);
  const stopTypingTimer = useRef<number | null>(null);

  const replyId = replyingTo[activeId];
  const replyMsg = replyId ? (messages[activeId] || []).find((m) => m.id === replyId) : null;
  const conv = conversations[activeId];
  const replyAuthor = replyMsg
    ? replyMsg.senderId === CURRENT_USER.id ? "أنت"
      : conv?.participants.find((p) => p.id === replyMsg.senderId)?.displayName ?? "الطرف الآخر"
    : "";

  /* ── Typing events ───────────────────────────────────────────── */
  const stopTyping = useCallback(
    debounce(() => {
      if (typingRef.current) {
        typingRef.current = false;
        sendTypingSignal(activeId, false);
      }
    }, 1500),
    [activeId]
  );

  const handleTyping = (val: string) => {
    setInputText(val);
    if (val.trim()) {
      if (!typingRef.current) {
        typingRef.current = true;
        sendTypingSignal(activeId, true);
      }
      stopTyping();
    } else if (typingRef.current) {
      typingRef.current = false;
      sendTypingSignal(activeId, false);
    }
  };

  /* ── Auto-grow textarea ──────────────────────────────────────── */
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [inputText]);

  /* ── Emoji picker outside click ──────────────────────────────── */
  useEffect(() => {
    if (!showPicker) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showPicker]);

  /* ── Focus textarea on reply ─────────────────────────────────── */
  useEffect(() => {
    if (replyMsg) taRef.current?.focus();
  }, [replyId]);

  /* ── Cleanup on unmount ──────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.cancel();
      if (typingRef.current) sendTypingSignal(activeId, false);
    };
  }, [activeId]);

  /* ── Send text message ───────────────────────────────────────── */
  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(activeId, inputText.trim(), "text", replyId ?? undefined);
    setInputText("");
    setShowPicker(false);
    if (taRef.current) taRef.current.style.height = "auto";
    // Stop typing indicator on send
    if (typingRef.current) {
      typingRef.current = false;
      sendTypingSignal(activeId, false);
    }
  };

  /* ── Upload file (Image/Video) ───────────────────────────────── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const type = isVideo ? "video" : "image";

    // 50MB limit check (to avoid crashing browser entirely, although WebSockets usually have a smaller limit, we will allow small files)
    if (file.size > 50 * 1024 * 1024) {
      alert("الملف كبير جداً. الحد الأقصى هو 50 ميجابايت.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      sendMessage(activeId, base64, type, replyId ?? undefined);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Insert emoji ────────────────────────────────────────────── */
  const insertEmoji = (emoji: string) => {
    const ta = taRef.current;
    if (!ta) { setInputText((t) => t + emoji); return; }
    const start = ta.selectionStart ?? inputText.length;
    const end = ta.selectionEnd ?? inputText.length;
    const next = inputText.slice(0, start) + emoji + inputText.slice(end);
    handleTyping(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  /* ── Voice recording ─────────────────────────────────────────── */
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
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 0.1), 100);
    } catch {
      alert("الوصول للميكروفون مرفوض.");
    }
  };

  const stopRecord = async (send: boolean) => {
    const r = recorderRef.current;
    if (!r) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
    if (!send) { r.cancel(); recorderRef.current = null; return; }
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

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div className="px-3 pb-4 pt-1 shrink-0 bg-[#000] relative" ref={wrapRef}>

      {/* Emoji Picker */}
      {showPicker && (
        <div className="absolute bottom-[76px] right-3 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10">
          <EmojiPicker
            theme={Theme.DARK}
            emojiStyle={EMOJI_STYLE_TO_PICKER[style]}
            width={320}
            height={380}
            lazyLoadEmojis
            searchPlaceHolder="ابحث عن إيموجي..."
            previewConfig={{ showPreview: false }}
            onEmojiClick={(d) => insertEmoji(d.emoji)}
          />
        </div>
      )}

      {/* Reply banner */}
      {replyMsg && !recording && (
        <div className="mb-2 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#141414] border border-white/[0.08]">
          <CornerUpLeft className="w-4 h-4 text-[#555] shrink-0 transform scale-x-[-1]" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-[#555] font-semibold mb-0.5 text-right">ترد على {replyAuthor}</div>
            <div className="text-[13px] text-[#a8a8a8] truncate text-right">
              <EmojiText text={replyMsg.content} size={13} />
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(activeId, null)}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-[#555] hover:text-white transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recording bar */}
      {recording ? (
        <div className="flex items-center gap-2.5 border border-white/10 rounded-2xl px-3 py-2.5 bg-[#0d0d0d]">
          <button
            onClick={() => stopRecord(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#ed4956]/15 hover:bg-[#ed4956]/25 text-[#ed4956] shrink-0 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden" dir="ltr">
            <div className="w-2 h-2 rounded-full bg-[#ed4956] animate-pulse shrink-0" />
            <span className="text-[14px] tabular-nums text-white shrink-0">{formatDuration(elapsed)}</span>
            <div className="flex items-end justify-end gap-[2px] h-6 flex-1 overflow-hidden">
              {liveBars.current.slice(-55).map((v, i) => (
                <div key={i} style={{ width: 2, height: Math.max(3, Math.round(v * 24)), background: "linear-gradient(180deg,#d62976,#fa7e1e)", borderRadius: 1, flexShrink: 0 }} />
              ))}
            </div>
          </div>
          <button
            onClick={() => stopRecord(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#0095f6] text-white shrink-0 transition-transform active:scale-95 transform scale-x-[-1]"
            style={{ transform: `scale(${-(1 + level * 0.18)})` }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Text bar */
        <div className="flex items-end gap-2 rounded-[24px] px-2 py-[7px] bg-[#1a1a1a] border border-white/[0.04] transition-colors relative">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white shrink-0 self-end mb-0.5"
            onClick={() => setShowPicker((s) => !s)}
            aria-label="قائمة الإيموجي"
          >
            <Smile className="w-[22px] h-[22px] stroke-[1.5]" />
          </button>

          <div className="relative flex-1 min-w-0">
            {/* Overlay for custom emoji rendering */}
            <div 
              ref={overlayRef}
              className="absolute inset-0 pointer-events-none text-[16px] leading-[22px] py-[7px] overflow-hidden whitespace-pre-wrap break-words"
              dir="auto"
              aria-hidden="true"
            >
              {!inputText ? (
                <span className="text-[#a8a8a8] pointer-events-none">رسالة...</span>
              ) : (
                <EmojiText text={inputText} size={18} disableJumbo />
              )}
            </div>

            <textarea
              ref={taRef}
              value={inputText}
              onChange={(e) => handleTyping(e.target.value)}
              onScroll={(e) => {
                if (overlayRef.current) overlayRef.current.scrollTop = e.currentTarget.scrollTop;
              }}
              className="w-full bg-transparent outline-none resize-none text-[16px] leading-[22px] py-[7px] max-h-[120px] block"
              style={{ color: "transparent", caretColor: "white", textShadow: "0 0 0 transparent" }}
              rows={1}
              dir="auto"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                if (e.key === "Escape" && replyId) setReplyingTo(activeId, null);
              }}
            />
          </div>

          {showSend ? (
            <button
              onClick={handleSend}
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              className="font-bold text-[#0095f6] hover:text-white transition-colors self-end mb-[10px] ml-2 text-[15px] shrink-0 active:scale-95 px-2"
            >
              إرسال
            </button>
          ) : (
            <div className="flex items-center self-end shrink-0 mb-0.5">
              <input
                type="file"
                accept="image/*,video/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
              />
              <button onClick={startRecord} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white" aria-label="تسجيل صوتي">
                <Mic className="w-[22px] h-[22px] stroke-[1.5]" />
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white" aria-label="صورة أو فيديو">
                <Image className="w-[22px] h-[22px] stroke-[1.5]" />
              </button>
              <button
                onClick={() => {
                  const payload = {
                    kind: "hub",
                    hubId: Math.random().toString(36).slice(2, 10),
                    createdAt: new Date().toISOString(),
                  } as const;
                  sendMessage(activeId, JSON.stringify(payload), "game");
                }}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
                aria-label="مركز الألعاب"
                title="ألعاب"
              >
                <Dices className="w-[22px] h-[22px] stroke-[1.5]" />
              </button>
              <button
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white hover:text-[#ed4956] active:scale-90"
                onClick={() => sendMessage(activeId, "❤️", "like")}
                aria-label="إعجاب"
              >
                <Heart className="w-[22px] h-[22px] stroke-[1.5]" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
