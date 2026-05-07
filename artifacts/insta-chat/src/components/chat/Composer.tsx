import { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore, sendTypingSignal } from "@/lib/store";
import { Smile, Mic, Image, Heart, X, CornerUpLeft, Trash2, Send, Dices, BarChart2, Zap } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useEmojiStyle, EMOJI_STYLE_TO_PICKER } from "@/lib/emojiStyle";
import { EmojiText } from "./EmojiText";
import { CURRENT_USER } from "@/lib/types";
import { VoiceRecorder, formatDuration } from "@/lib/voice";
import { motion, AnimatePresence } from "framer-motion";

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }) as T;
}

export function Composer({ activeId }: { activeId: string }) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const replyingTo = useChatStore((s) => s.replyingTo);
  const editingMessageId = useChatStore((s) => s.editingMessageId);
  const setReplyingTo = useChatStore((s) => s.setReplyingTo);
  const setEditingMessage = useChatStore((s) => s.setEditingMessage);
  const messages = useChatStore((s) => s.messages);
  const conversations = useChatStore((s) => s.conversations);
  const [inputText, setInputText] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [showMagic, setShowMagic] = useState(false);
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
    // Extremely subtle haptic for typing
    if (val.length > inputText.length && window.navigator?.vibrate) {
      window.navigator.vibrate(5);
    }
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
    // Haptic feedback for sending
    if (window.navigator?.vibrate) window.navigator.vibrate(20);
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
      // Haptic for sending file
      if (window.navigator?.vibrate) window.navigator.vibrate([20, 30, 20]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Insert emoji ──────────────────────────────────────────── */
  const insertEmoji = (emoji: string) => {
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
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
      if (window.navigator?.vibrate) window.navigator.vibrate([15, 30, 15]);
    }
  };

  const showSend = inputText.trim().length > 0;

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div className="px-4 pb-6 pt-3 shrink-0 relative z-10 bg-black/40 backdrop-blur-3xl border-t border-white/[0.08] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]" ref={wrapRef}>

      {/* Background glow for the composer */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Emoji Picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 30, scale: 0.9, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute bottom-[90px] left-4 z-50 shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0c]/90 backdrop-blur-2xl"
          >
            <EmojiPicker
              theme={Theme.DARK}
              emojiStyle={EMOJI_STYLE_TO_PICKER[style]}
              width={350}
              height={420}
              lazyLoadEmojis
              searchPlaceHolder="ابحث عن إيموجي..."
              previewConfig={{ showPreview: false }}
              onEmojiClick={(d) => insertEmoji(d.emoji)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-5xl mx-auto">
        <AnimatePresence>
          {/* Reply banner */}
          {replyMsg && !recording && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 12, scale: 1 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="mx-1 overflow-hidden"
            >
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-black/50 border border-white/10 shadow-[0_10px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#007aff] to-[#00d2ff] shadow-[0_0_15px_rgba(0,122,255,0.8)]" />
                <div className="flex-1 min-w-0 pl-2">
                  <div className="text-[13px] text-[#007aff] font-black mb-1 tracking-wide flex items-center gap-1.5 drop-shadow-[0_0_5px_rgba(0,122,255,0.3)]">
                    <CornerUpLeft className="w-3.5 h-3.5" /> الرد على {replyAuthor}
                  </div>
                  <div className="text-[14px] text-[#eaeaea] truncate font-bold opacity-80">
                    <EmojiText text={replyMsg.content} size={14} />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.15, rotate: 90, backgroundColor: "rgba(255,255,255,0.1)" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setReplyingTo(activeId, null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-[#a8a8a8] hover:text-white transition-all shrink-0 border border-transparent hover:border-white/10"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Edit banner */}
          {editMsg && !recording && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 12, scale: 1 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="mx-1 overflow-hidden"
            >
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-black/50 border border-white/10 shadow-[0_10px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#00d26a] to-[#34e89e] shadow-[0_0_15px_rgba(0,210,106,0.8)]" />
                <div className="flex-1 min-w-0 pl-2">
                  <div className="text-[13px] text-[#00d26a] font-black mb-1 tracking-wide drop-shadow-[0_0_5px_rgba(0,210,106,0.3)]">تعديل الرسالة</div>
                  <div className="text-[14px] text-[#eaeaea] truncate font-bold opacity-80">
                    <EmojiText text={editMsg.content} size={14} />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.15, rotate: 90, backgroundColor: "rgba(255,255,255,0.1)" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setEditingMessage(activeId, null); setInputText(""); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-[#a8a8a8] hover:text-white transition-all shrink-0 border border-transparent hover:border-white/10"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input / Recording Area */}
        <AnimatePresence mode="wait">
          {recording ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex items-center gap-3 border border-[#ed4956]/40 rounded-full px-3 py-2.5 bg-black/60 shadow-[0_15px_30px_rgba(237,73,86,0.2),inset_0_0_20px_rgba(237,73,86,0.1)] backdrop-blur-xl relative overflow-hidden"
            >
              {/* Pulsing ambient background */}
              <motion.div animate={{ opacity: [0.1, 0.2, 0.1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-gradient-to-r from-[#ed4956]/20 via-transparent to-transparent pointer-events-none" />

              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: "rgba(237,73,86,0.2)" }}
                whileTap={{ scale: 0.9 }}
                onClick={() => stopRecord(false)}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-[#ed4956]/10 text-[#ed4956] shrink-0 transition-all border border-[#ed4956]/20 relative z-10"
              >
                <Trash2 className="w-5 h-5 stroke-[2.5]" />
              </motion.button>

              <div className="flex-1 min-w-0 flex items-center gap-4 bg-black/40 border border-white/5 rounded-full px-5 py-2.5 shadow-inner relative z-10" dir="ltr">
                <div className="w-3 h-3 rounded-full bg-[#ed4956] animate-pulse shrink-0 shadow-[0_0_12px_rgba(237,73,86,1)]" />
                <span className="text-[16px] tabular-nums text-white shrink-0 font-black tracking-widest">{formatDuration(elapsed)}</span>
                <div className="flex items-center justify-end gap-[3px] h-8 flex-1 overflow-hidden">
                  {liveBars.current.slice(-60).map((v, i) => (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: Math.max(4, Math.round(v * 32)) }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      key={i}
                      style={{
                        width: 4,
                        background: "linear-gradient(180deg,#fa7e1e,#ed4956)",
                        borderRadius: 2,
                        flexShrink: 0,
                        boxShadow: "0 0 5px rgba(237,73,86,0.5)"
                      }}
                    />
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => stopRecord(true)}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-[#007aff] to-[#0056b3] text-white shrink-0 transition-all shadow-[0_10px_20px_rgba(0,122,255,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] relative z-10"
                style={{ transform: `scale(${1 + level * 0.15})` }}
              >
                <Send className="w-6 h-6 ml-1" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex items-end gap-2.5"
            >
              {/* Emoji button */}
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.08)", textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 hover:text-white shrink-0 self-end mb-1 transition-all border border-transparent hover:border-white/10"
                onClick={() => setShowPicker((s) => !s)}
                aria-label="إيموجي"
              >
                <Smile className="w-[28px] h-[28px] stroke-[2]" />
              </motion.button>

              {/* Input pill */}
              <div className="flex-1 min-w-0 flex items-end rounded-[30px] px-5 py-3 gap-2 relative transition-all duration-300 bg-white/[0.05] border border-white/10 focus-within:bg-white/[0.08] focus-within:border-[#007aff]/50 focus-within:shadow-[0_0_25px_rgba(0,122,255,0.2),inset_0_0_15px_rgba(255,255,255,0.02)] group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-focus-within:animate-[shimmer_2s_infinite] pointer-events-none rounded-[30px]" />
                <textarea
                  ref={taRef}
                  value={inputText}
                  onChange={(e) => handleTyping(e.target.value)}
                  className="w-full bg-transparent outline-none resize-none text-[16px] leading-[24px] max-h-[140px] block flex-1 min-w-0 text-white placeholder:text-[#888] font-black tracking-wide relative z-10"
                  placeholder="اكتب رسالتك..."
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
                <AnimatePresence>
                  {showSend && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.5, x: -10, rotate: -45 }}
                      animate={{ opacity: 1, scale: 1, x: 0, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5, x: -10, rotate: 45 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      onClick={handleSend}
                      onMouseDown={(e) => e.preventDefault()}
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-[#007aff] to-[#0056b3] text-white flex items-center justify-center shrink-0 self-end hover:brightness-110 transition-all shadow-[0_5px_15px_rgba(0,122,255,0.5)] mb-0.5 relative z-10"
                    >
                      <Send className="w-4 h-4 ml-0.5 stroke-[2.5]" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Right-side actions */}
              <AnimatePresence>
                {!showSend && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex items-center self-end mb-1 gap-1 overflow-visible shrink-0"
                  >
                    <input
                      type="file"
                      accept="image/*,video/*"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileSelect}
                    />

                    <motion.button
                      whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,0.08)", textShadow: "0 0 12px rgba(255,255,255,0.6)" }}
                      whileTap={{ scale: 0.9 }}
                      onClick={startRecord}
                      className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-all border border-transparent hover:border-white/10"
                      aria-label="تسجيل صوتي"
                    >
                      <Mic className="w-[28px] h-[28px] stroke-[2]" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,0.08)", textShadow: "0 0 12px rgba(255,255,255,0.6)" }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-all border border-transparent hover:border-white/10"
                      aria-label="صورة أو فيديو"
                    >
                      <Image className="w-[28px] h-[28px] stroke-[2]" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,0.1)", boxShadow: "0 0 20px rgba(255,255,255,0.1)" }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        if (window.navigator?.vibrate) window.navigator.vibrate(15);
                        const payload = { kind: "hub", hubId: Math.random().toString(36).slice(2, 10), createdAt: new Date().toISOString() } as const;
                        sendMessage(activeId, JSON.stringify(payload), "game");
                      }}
                      className="w-12 h-12 flex items-center justify-center rounded-full text-white transition-all shadow-[inset_0_0_15px_rgba(255,255,255,0.1)] bg-gradient-to-br from-white/[0.08] to-transparent border border-white/[0.15] hover:border-white/30 relative overflow-hidden group"
                      title="مركز الألعاب"
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Dices className="w-[28px] h-[28px] stroke-[2] relative z-10" />
                    </motion.button>

                    {/* Magic Actions Button */}
                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,0.1)", boxShadow: "0 0 20px rgba(255,255,255,0.1)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          if (window.navigator?.vibrate) window.navigator.vibrate([10, 20]);
                          setShowMagic(!showMagic);
                        }}
                        className="w-12 h-12 flex items-center justify-center rounded-full text-[#ffcc00] transition-all shadow-[inset_0_0_15px_rgba(255,204,0,0.1)] bg-gradient-to-br from-[#ffcc00]/10 to-transparent border border-[#ffcc00]/30 hover:border-[#ffcc00]/50 relative overflow-hidden group"
                        title="مميزات سحرية"
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#ffcc00]/20 to-[#ff9900]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Zap className="w-[28px] h-[28px] stroke-[2] relative z-10 drop-shadow-[0_0_5px_rgba(255,204,0,0.5)]" />
                      </motion.button>

                      <AnimatePresence>
                        {showMagic && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-[60px] right-0 w-48 bg-[#1e1e1e]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden z-50 flex flex-col"
                          >
                            <div className="max-h-[350px] overflow-y-auto no-scrollbar flex flex-col w-full">
                              {/* === DEEP EMOTIONS === */}
                              <div className="px-4 py-1.5 text-[9px] uppercase tracking-widest text-white/30 font-black border-b border-white/5">المشاعر العميقة</div>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "", "cry_together");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#3b82f6]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#93c5fd] transition-colors">نبكي سوا</span>
                                <span>😭</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "", "loneliness");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#1e293b]/80 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#94a3b8] transition-colors">وحيد وبتفكرك</span>
                                <span>🌙</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "", "missing_you");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#8b5cf6]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#c4b5fd] transition-colors">بوحشني</span>
                                <span>💚</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "", "anxiety");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#f97316]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#fdba74] transition-colors">قلق وخوف</span>
                                <span>😰</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "", "nostalgia");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#d97706]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#fcd34d] transition-colors">حنين للماضي</span>
                                <span>🌅</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "", "forgive_me");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#10b981]/10 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#6ee7b7] transition-colors">سامحني</span>
                                <span>🙏</span>
                              </button>

                              {/* === HYPER INTERACTIVE === */}
                              <div className="px-4 py-1.5 text-[9px] uppercase tracking-widest text-white/30 font-black border-b border-white/5 bg-white/5">حواس وتفاعل جسدي</div>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "", "heartbeat_sync");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#ef4444]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#f87171] transition-colors">نبض قلبي</span>
                                <span>💓</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "رسالة سرية...", "scratch_reveal");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-white/10 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-white transition-colors">رسالة مخفية (اخربش)</span>
                                <span>🌫️</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "", "coffee_share");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#b45309]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#fbbf24] transition-colors">قهوة سخنة (المسها)</span>
                                <span>☕</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "", "staring_contest");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#6366f1]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#818cf8] transition-colors">تحدي النظرات (اضغط)</span>
                                <span>👁️</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "", "universe_share");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#8b5cf6]/40 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#c4b5fd] transition-colors">اتصال روحي (بُعد 3D)</span>
                                <span className="text-xl drop-shadow-[0_0_10px_#8b5cf6]">🌌</span>
                              </button>
                              <div className="px-4 py-1.5 text-[9px] uppercase tracking-widest text-white/30 font-black border-b border-white/5">تفاعلي ومرح</div>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "🚶🚪", "walk_away");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#333333]/80 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-gray-400 transition-colors">قفلت الباب ومشيت</span>
                                <span>🚪</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "💔", "shatter");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#991b1b]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#fca5a5] transition-colors">قلب مكسور</span>
                                <span>💔</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "🥱", "bored");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#6b7280]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#9ca3af] transition-colors">ملل وتجاهل</span>
                                <span>🥱</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "🍻", "cheers");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#fcd34d]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#fcd34d] transition-colors">نشرب حاجة سوا</span>
                                <span>🍻</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "🍕", "feed");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#fb923c]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#fb923c] transition-colors">عزومة أكل</span>
                                <span>🍕</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "✋", "slap");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#ef4444]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#ef4444] transition-colors">قلم يفوقه!</span>
                                <span>✋</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "🌧️ جو شتوي ومطر", "weather");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#38bdf8]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#38bdf8] transition-colors">جو شتوي ومطر</span>
                                <span>🌧️</span>
                              </button>
                              <button
                                onClick={() => {
                                  const txt = window.prompt("اكتب الرسالة المراد تشفيرها:");
                                  if (txt) sendMessage(activeId, txt, "encrypted");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#10b981]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#10b981] transition-colors font-mono tracking-widest drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">رسالة مشفرة</span>
                                <span>🔐</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "{}", "canvas");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#8b5cf6]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#8b5cf6] transition-colors">سبورة رسم مشتركة</span>
                                <span>🎨</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "✊ خبط على الشاشة", "knock");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#ef4444]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#ef4444] transition-colors">خبط على الشاشة</span>
                                <span>✊</span>
                              </button>
                              <button
                                onClick={() => {
                                  const txt = window.prompt("اكتب رسالة تجبره يبصلك:");
                                  if (txt) sendMessage(activeId, txt, "focus");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#fff]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-white transition-colors drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">بص لي</span>
                                <span>👀</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "👉 نكش!", "poke");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#0ea5e9]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#0ea5e9] transition-colors">نكش</span>
                                <span>👈</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "امسك إيدي", "hold_hand");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#f59e0b]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#f59e0b] transition-colors">امسك إيدي</span>
                                <span>🤝</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "بوسة طايرة", "kiss");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#ec4899]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#ec4899] transition-colors">بوسة طايرة</span>
                                <span>💋</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "💓", "heartbeat");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#ff2a5f]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#ff2a5f] transition-colors">نبضة قلب</span>
                                <span>💓</span>
                              </button>
                              <button
                                onClick={() => {
                                  const txt = window.prompt("اكتب رسالتك داخل الجواب المقفول:");
                                  if (txt) sendMessage(activeId, txt, "love_letter");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#ffd700]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#ffd700] transition-colors">جواب مقفول</span>
                                <span>💌</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "🤗", "hug");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#ff9a9e]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#ff9a9e] transition-colors">حضن دافي</span>
                                <span>🤗</span>
                              </button>
                              <button
                                onClick={() => {
                                  const txt = window.prompt("اكتب الرسالة المفخخة (تنفجر بعد 5 ثوانٍ):");
                                  if (txt) sendMessage(activeId, txt, "bomb");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#ed4956]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#ed4956] transition-colors">رسالة مفخخة</span>
                                <span>💣</span>
                              </button>
                              <button
                                onClick={() => {
                                  const txt = window.prompt("اكتب رسالة الاحتفال:");
                                  if (txt) sendMessage(activeId, txt, "confetti");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#00d2ff]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#00d2ff] transition-colors">احتفال</span>
                                <span>🎉</span>
                              </button>
                              <button
                                onClick={() => {
                                  const txt = window.prompt("اكتب الرسالة السرية:");
                                  if (txt) sendMessage(activeId, txt, "spoiler");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-white/10 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between"
                              >
                                <span>رسالة مخفية</span>
                                <span>🤫</span>
                              </button>
                              <button
                                onClick={() => {
                                  const txt = window.prompt("اكتب رسالة الهمس:");
                                  if (txt) sendMessage(activeId, txt, "whisper");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-white/10 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between"
                              >
                                <span>همس</span>
                                <span>🌬️</span>
                              </button>
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "NUDGE", "nudge");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#ffcc00]/20 text-[13px] font-bold transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#ffcc00] transition-colors">رج الموبايل</span>
                                <span>📳</span>
                              </button>

                              {/* === NEW EXPERIMENTAL FEATURES === */}
                              <div className="px-4 py-1.5 text-[9px] uppercase tracking-widest text-[#ffcc00]/60 font-black border-b border-white/5 mt-2 bg-[#ffcc00]/5">حصري وجديد 🔥</div>

                              <button
                                onClick={() => {
                                  const txt = window.prompt("اكتب الرسالة لعرضها كـ هولوجرام 3D:");
                                  if (txt) sendMessage(activeId, txt, "hologram");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#06b6d4]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#22d3ee] transition-colors drop-shadow-[0_0_8px_#22d3ee]">هولوجرام 3D</span>
                                <span>🧊</span>
                              </button>

                              <button
                                onClick={() => {
                                  const txt = window.prompt("اكتب رسالة للكبسولة الزمنية (تفتح غداً):");
                                  if (txt) sendMessage(activeId, txt, "time_capsule");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#8b5cf6]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#a78bfa] transition-colors">كبسولة زمنية</span>
                                <span>⏳</span>
                              </button>

                              <button
                                onClick={() => {
                                  sendMessage(activeId, "فحص المزاج", "vibe_check");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#ec4899]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#f472b6] transition-colors">فحص المزاج Vibe Check</span>
                                <span>🫀</span>
                              </button>

                              <button
                                onClick={() => {
                                  sendMessage(activeId, "انتقال عن بعد", "teleport");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#10b981]/20 text-[13px] font-bold transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#34d399] transition-colors">انتقال عن بعد</span>
                                <span>🛸</span>
                              </button>

                              {/* NEWEST ONES */}
                              <button
                                onClick={() => {
                                  sendMessage(activeId, "تم اختراق النظام ☠️", "glitch");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#22c55e]/20 text-[13px] font-bold border-b border-white/5 transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#4ade80] transition-colors font-mono">تهكير الشات</span>
                                <span>👾</span>
                              </button>

                              <button
                                onClick={() => {
                                  sendMessage(activeId, "مزيكا رايقة 🎵", "vinyl");
                                  setShowMagic(false);
                                }}
                                className="px-4 py-3 text-white text-right hover:bg-[#f43f5e]/20 text-[13px] font-bold transition-colors flex items-center justify-between group"
                              >
                                <span className="group-hover:text-[#fb7185] transition-colors">أسطوانة مزيكا</span>
                                <span>💿</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {conv?.isGroup && (
                      <motion.button
                        whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,0.08)" }}
                        whileTap={{ scale: 0.9 }}
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
                        className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-all border border-transparent hover:border-white/10"
                        title="إنشاء تصويت"
                      >
                        <BarChart2 className="w-[28px] h-[28px] stroke-[2]" />
                      </motion.button>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.15, backgroundColor: "rgba(237,73,86,0.15)", color: "#ff3040", filter: "drop-shadow(0 0 10px rgba(237,73,86,0.8))" }}
                      whileTap={{ scale: 0.8 }}
                      className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 transition-all border border-transparent hover:border-[#ed4956]/30"
                      onClick={() => sendMessage(activeId, "❤️", "like")}
                    >
                      <Heart className="w-[28px] h-[28px] stroke-[2]" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
