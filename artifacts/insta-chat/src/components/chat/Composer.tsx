import { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore, sendTypingSignal } from "@/lib/store";
import { Smile, Mic, Image, Heart, X, CornerUpLeft, Trash2, Send, Dices, BarChart2 } from "lucide-react";
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
  const { sendMessage, editMessage, replyingTo, editingMessageId, setReplyingTo, setEditingMessage, messages, conversations } = useChatStore();
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

  const typingRef = useRef(false);
  const stopTypingTimer = useRef<number | null>(null);

  const replyId = replyingTo[activeId];
  const replyMsg = replyId ? (messages[activeId] || []).find((m) => m.id === replyId) : null;
  const conv = conversations[activeId];
  const replyAuthor = replyMsg
    ? replyMsg.senderId === CURRENT_USER.id ? "أنت"
      : conv?.participants.find((p) => p.id === replyMsg.senderId)?.displayName ?? "الطرف الآخر"
    : "";

  const editId = editingMessageId[activeId];
  const editMsg = editId ? (messages[activeId] || []).find((m) => m.id === editId) : null;

  /* ── Typing events ─────────────────────────────────────────── */
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
      if (!typingRef.current) { typingRef.current = true; sendTypingSignal(activeId, true); }
      stopTyping();
    } else if (typingRef.current) {
      typingRef.current = false;
      sendTypingSignal(activeId, false);
    }
  };

  /* ── Auto-grow textarea ────────────────────────────────────── */
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [inputText]);

  /* ── Emoji picker outside click ────────────────────────────── */
  useEffect(() => {
    if (!showPicker) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showPicker]);

  /* ── Focus textarea on reply/edit ──────────────────────────── */
  useEffect(() => { if (replyMsg) taRef.current?.focus(); }, [replyId]);
  useEffect(() => { 
    if (editMsg && editMsg.type === "text") {
      setInputText(editMsg.content);
      taRef.current?.focus();
    }
  }, [editId, editMsg]);

  /* ── Cleanup on unmount ────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.cancel();
      if (typingRef.current) sendTypingSignal(activeId, false);
    };
  }, [activeId]);

  /* ── Send text ─────────────────────────────────────────────── */
  const handleSend = () => {
    if (!inputText.trim()) return;
    if (editId) {
      editMessage(activeId, editId, inputText.trim());
    } else {
      sendMessage(activeId, inputText.trim(), "text", replyId ?? undefined);
    }
    setInputText("");
    setShowPicker(false);
    if (taRef.current) taRef.current.style.height = "auto";
    if (typingRef.current) { typingRef.current = false; sendTypingSignal(activeId, false); }
  };

  /* ── Upload file ───────────────────────────────────────────── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const type = isVideo ? "video" : "image";
    if (file.size > 50 * 1024 * 1024) {
      alert("الملف كبير جداً. الحد الأقصى هو 50 ميجابايت.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      sendMessage(activeId, reader.result as string, type, replyId ?? undefined);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Insert emoji ──────────────────────────────────────────── */
  const insertEmoji = (emoji: string) => {
    const ta = taRef.current;
    if (!ta) { setInputText((t) => t + emoji); return; }
    const start = ta.selectionStart ?? inputText.length;
    const end = ta.selectionEnd ?? inputText.length;
    const next = inputText.slice(0, start) + emoji + inputText.slice(end);
    handleTyping(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + emoji.length, start + emoji.length); });
  };

  /* ── Voice recording ───────────────────────────────────────── */
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

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div className="px-2 pb-4 pt-1 shrink-0 bg-black/60 backdrop-blur-2xl relative border-t border-white/[0.04] z-10" ref={wrapRef}>

      {/* Emoji Picker */}
      {showPicker && (
        <div className="absolute bottom-[72px] left-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10">
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
        <div className="mb-2 mx-1 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#1a1a1a] border border-white/[0.07]">
          <div className="w-[2px] h-8 rounded-full bg-[#3797f0] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-[#3797f0] font-semibold mb-0.5">{replyAuthor}</div>
            <div className="text-[13px] text-[#a8a8a8] truncate">
              <EmojiText text={replyMsg.content} size={13} />
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(activeId, null)}
            className="w-6 h-6 flex items-center justify-center rounded-full text-[#555] hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit banner */}
      {editMsg && !recording && (
        <div className="mb-2 mx-1 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#1a1a1a] border border-white/[0.07]">
          <div className="w-[2px] h-8 rounded-full bg-[#00d26a] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-[#00d26a] font-semibold mb-0.5">تعديل رسالة</div>
            <div className="text-[13px] text-[#a8a8a8] truncate">
              <EmojiText text={editMsg.content} size={13} />
            </div>
          </div>
          <button
            onClick={() => { setEditingMessage(activeId, null); setInputText(""); }}
            className="w-6 h-6 flex items-center justify-center rounded-full text-[#555] hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Recording bar */}
      {recording ? (
        <div className="flex items-center gap-2.5 border border-white/[0.08] rounded-[26px] px-3 py-2 bg-[#111]">
          <button
            onClick={() => stopRecord(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#ed4956]/15 hover:bg-[#ed4956]/25 text-[#ed4956] shrink-0 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden" dir="ltr">
            <div className="w-2 h-2 rounded-full bg-[#ed4956] animate-pulse shrink-0" />
            <span className="text-[14px] tabular-nums text-white shrink-0 font-medium">{formatDuration(elapsed)}</span>
            <div className="flex items-end justify-end gap-[2px] h-6 flex-1 overflow-hidden">
              {liveBars.current.slice(-55).map((v, i) => (
                <div key={i} style={{
                  width: 2,
                  height: Math.max(3, Math.round(v * 24)),
                  background: "linear-gradient(180deg,#3797f0,#833ab4)",
                  borderRadius: 1,
                  flexShrink: 0,
                }} />
              ))}
            </div>
          </div>
          <button
            onClick={() => stopRecord(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#3797f0] hover:bg-[#1877f2] text-white shrink-0 transition-all active:scale-95"
            style={{ transform: `scale(${1 + level * 0.15})` }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* ── Text bar ── */
        <div className="flex items-end gap-2">
          {/* Emoji button */}
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full text-white shrink-0 self-end mb-[3px] hover:text-[#a8a8a8] transition-colors"
            onClick={() => setShowPicker((s) => !s)}
            aria-label="إيموجي"
          >
            <Smile className="w-[26px] h-[26px] stroke-[1.5]" />
          </button>

          {/* Input pill */}
          <div className="flex-1 min-w-0 flex items-end bg-white/[0.04] border border-white/[0.08] rounded-[26px] px-4 py-[7px] gap-2 relative focus-within:bg-white/[0.08] focus-within:border-white/20 focus-within:ring-4 focus-within:ring-white/[0.03] transition-all duration-300">
            <textarea
              ref={taRef}
              value={inputText}
              onChange={(e) => handleTyping(e.target.value)}
              className="w-full bg-transparent outline-none resize-none text-[16px] leading-[22px] max-h-[120px] block flex-1 min-w-0 text-white placeholder:text-[#737373]"
              placeholder="رسالة..."
              rows={1}
              dir="auto"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                if (e.key === "Escape") {
                  if (replyId) setReplyingTo(activeId, null);
                  if (editId) { setEditingMessage(activeId, null); setInputText(""); }
                }
              }}
            />

            {/* Send button inside pill */}
            {showSend && (
              <button
                onClick={handleSend}
                onMouseDown={(e) => e.preventDefault()}
                className="text-[#3797f0] font-bold text-[15px] shrink-0 self-end mb-[1px] hover:text-white transition-colors active:scale-95 px-1"
              >
                إرسال
              </button>
            )}
          </div>

          {/* Right-side actions */}
          {!showSend && (
            <div className="flex items-center self-end mb-[3px] gap-0.5">
              <input
                type="file"
                accept="image/*,video/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={startRecord}
                className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:text-[#a8a8a8] transition-colors"
                aria-label="تسجيل صوتي"
              >
                <Mic className="w-[26px] h-[26px] stroke-[1.5]" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:text-[#a8a8a8] transition-colors"
                aria-label="صورة أو فيديو"
              >
                <Image className="w-[26px] h-[26px] stroke-[1.5]" />
              </button>
              <button
                onClick={() => {
                  const payload = { kind: "hub", hubId: Math.random().toString(36).slice(2, 10), createdAt: new Date().toISOString() } as const;
                  sendMessage(activeId, JSON.stringify(payload), "game");
                }}
                className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:text-[#a8a8a8] transition-colors"
                aria-label="ألعاب"
                title="مركز الألعاب"
              >
                <Dices className="w-[26px] h-[26px] stroke-[1.5]" />
              </button>
              {conv?.isGroup && (
                <button
                  onClick={() => {
                    const q = window.prompt("اكتب سؤال التصويت:");
                    if (!q) return;
                    const optsStr = window.prompt("اكتب الخيارات مفصولة بفاصلة (مثال: نعم، لا):");
                    if (!optsStr) return;
                    const opts = optsStr.split(",").map(s => s.trim()).filter(Boolean);
                    if (opts.length < 2) return alert("يجب إدخال خيارين على الأقل");
                    
                    const pollMeta = {
                      question: q,
                      options: opts.map((text, i) => ({ id: `opt_${i}`, text, votes: [] })),
                      multipleAnswers: false,
                    };
                    sendMessage(activeId, "", "poll", undefined, undefined, pollMeta);
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:text-[#a8a8a8] transition-colors"
                  aria-label="تصويت"
                  title="إنشاء تصويت"
                >
                  <BarChart2 className="w-[26px] h-[26px] stroke-[1.5]" />
                </button>
              )}
              <button
                className="w-9 h-9 flex items-center justify-center rounded-full text-white active:scale-90 hover:text-[#ed4956] transition-colors"
                onClick={() => sendMessage(activeId, "❤️", "like")}
                aria-label="إعجاب"
              >
                <Heart className="w-[26px] h-[26px] stroke-[1.5]" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
