import { memo, useEffect, useRef, useState, useMemo } from "react";
import { Copy, CornerUpLeft, Trash2, Smile } from "lucide-react";
import { Message, CURRENT_USER, User } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import { EmojiText } from "./EmojiText";
import { VoiceMessage } from "./VoiceMessage";
import { RpsInlineGame } from "./RpsInlineGame";
import { XoInlineGame } from "./XoInlineGame";
import { GameHubInline } from "./GameHubInline";
import { SnakesLaddersInline } from "./SnakesLaddersInline";
import { BankElHazInline } from "./BankElHazInline";
import { CardsInlineGame } from "./CardsInlineGame";
import { DominoesInlineGame } from "./DominoesInlineGame";
import { Connect4InlineGame } from "./Connect4InlineGame";
import { DotsBoxesInlineGame } from "./DotsBoxesInlineGame";
import { QnDInlineGame } from "./QnDInlineGame";
import { EmojiPictionaryInline } from "./EmojiPictionaryInline";
import { FastTapInline } from "./FastTapInline";
import { SpinWheelInline } from "./SpinWheelInline";
import { WordChainInline } from "./WordChainInline";
import emojiRegex from "emoji-regex";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

interface Props {
  msg: Message;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isLastOverall: boolean;
  borderRadius: string;
  otherUser?: User;
  conversationId: string;
  allMessages: Message[];
}

/* ── Instagram-exact theme colors ─────────────────────────────────── */
const themeColorsMap: Record<string, string> = {
  default:    "bg-gradient-to-br from-[#3797f0] to-[#833ab4]",
  monochrome: "bg-gradient-to-br from-[#444444] to-[#111111]",
  ocean:      "bg-gradient-to-br from-[#00c6ff] to-[#0072ff]",
  love:       "bg-gradient-to-br from-[#ff0844] to-[#ffb199]",
  cyberpunk:  "bg-gradient-to-br from-[#f000ff] to-[#00d4ff]",
  forest:     "bg-gradient-to-br from-[#11998e] to-[#38ef7d]",
  halloween:  "bg-gradient-to-br from-[#ff8c00] to-[#e52e71]",
};

export const MessageBubble = memo(function MessageBubble({
  msg, isOwn, isFirstInGroup, isLastInGroup, isLastOverall,
  borderRadius, otherUser, conversationId, allMessages,
}: Props) {
  const { toggleReaction, unsendMessage, setReplyingTo } = useChatStore();
  const [showActions, setShowActions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);

  /* Touch Gestures for Swipe-to-Reply */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 15) {
      touchStartRef.current = null;
      setIsSwiping(false);
      setSwipeX(0);
      return;
    }
    if (dx < 0) setSwipeX(Math.max(dx, -70));
  };

  const handleTouchEnd = () => {
    if (swipeX <= -55) {
      handleReply();
      if (window.navigator?.vibrate) window.navigator.vibrate(40);
    }
    touchStartRef.current = null;
    setIsSwiping(false);
    setSwipeX(0);
  };

  /* Close on outside click */
  useEffect(() => {
    if (!showMenu && !showReactions) return;
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowMenu(false); setShowReactions(false); setShowActions(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [showMenu, showReactions]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300 && !msg.isUnsent) {
      toggleReaction(conversationId, msg.id, "❤️");
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const handleReply  = () => { setReplyingTo(conversationId, msg.id); setShowMenu(false); setShowActions(false); };
  const handleCopy   = () => { navigator.clipboard.writeText(msg.content).catch(() => {}); setShowMenu(false); setShowActions(false); };
  const handleUnsend = () => { unsendMessage(conversationId, msg.id); setShowMenu(false); setShowActions(false); };
  const onReact = (emoji: string) => { toggleReaction(conversationId, msg.id, emoji); setShowReactions(false); setShowActions(false); };

  const reactions = msg.reactions ?? [];
  const reactionCounts = reactions.reduce<Record<string, number>>((a, r) => ({ ...a, [r.emoji]: (a[r.emoji] || 0) + 1 }), {});
  const reactionEntries = Object.entries(reactionCounts);
  const myReaction = reactions.find((r) => r.userId === CURRENT_USER.id)?.emoji;
  const replyTo = msg.replyToId ? allMessages.find((m) => m.id === msg.replyToId) : null;
  const gamePayload = msg.type === "game" ? safeJsonParse<{ kind?: string; gameId?: string }>(msg.content) : null;

  const isNew = Date.now() - new Date(msg.createdAt).getTime() < 2000;
  const animClass = isNew ? "animate-messageIn" : "";
  const originStyle = { transformOrigin: isOwn ? "bottom right" : "bottom left" };

  const isOnlyEmoji = useMemo(() => {
    if (msg.type !== "text" || msg.isUnsent) return false;
    const stripped = msg.content.replace(emojiRegex(), "").trim();
    if (stripped.length > 0) return false;
    const count = (msg.content.match(emojiRegex()) || []).length;
    return count > 0 && count <= 3;
  }, [msg]);

  /* ── Current theme ─────────────────────────────────────────────── */
  const currentThemeMsg = allMessages ? [...allMessages].reverse().find(m => m.type === "theme") : undefined;
  const currentThemeId = currentThemeMsg?.content || "default";
  const themeClass = themeColorsMap[currentThemeId] || themeColorsMap["default"];

  /* ── Unsent ─────────────────────────────────────────────────────── */
  if (msg.isUnsent) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-[6px]" : "mt-[2px]"} px-3 ${animClass}`} style={originStyle}>
        {!isOwn && isLastInGroup && <div className="w-[28px] ml-2 flex-shrink-0 flex items-end pb-[2px]"><img src={otherUser?.avatarUrl} className="w-[28px] h-[28px] rounded-full object-cover" /></div>}
        {!isOwn && !isLastInGroup && <div className="w-[36px] flex-shrink-0" />}
        <div className="px-4 py-2 text-[14px] italic text-[#737373] border border-white/[0.12] rounded-[22px]">
          {isOwn ? "لقد سحبت رسالة" : "تم سحب الرسالة"}
        </div>
      </div>
    );
  }

  /* ── Theme Notification ─────────────────────────────────────────── */
  if (msg.type === "theme") {
    const themeName = {
      default: "الافتراضي", monochrome: "وضع التخفي (أسود)", ocean: "أمواج المحيط",
      love: "حب ورومانسية", cyberpunk: "سايبر بانك نيون", forest: "غابة استوائية", halloween: "نار وهالوين"
    }[msg.content] || msg.content;
    return (
      <div className="w-full flex justify-center my-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="text-[12px] font-medium text-[#a8a8a8] bg-transparent px-4 py-1 rounded-full">
          {isOwn ? "غيّرت ثيم المحادثة إلى " : "تم تغيير الثيم إلى "}
          <span className="font-bold text-white">{themeName}</span> ✨
        </div>
      </div>
    );
  }

  /* ── Normal ──────────────────────────────────────────────────────── */
  return (
    <div className="relative w-full overflow-visible">
      {/* Swipe icon */}
      {swipeX < 0 && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-white/10 ${isOwn ? "right-2" : "right-10"}`}
          style={{
            width: 32, height: 32,
            opacity: Math.min(1, Math.abs(swipeX) / 50),
            transform: `translateY(-50%) scale(${Math.min(1, Math.abs(swipeX) / 55)})`
          }}
        >
          <CornerUpLeft className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        ref={wrapRef}
        className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-[6px]" : "mt-[2px]"} px-3 relative group ${animClass}`}
        style={{
          ...originStyle,
          transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
          transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { if (!showMenu && !showReactions) setShowActions(false); }}
      >

        {/* Other user avatar */}
        {!isOwn && isLastInGroup && (
          <div className="w-[28px] ml-2 flex-shrink-0 flex items-end pb-[2px]">
            <img src={otherUser?.avatarUrl} className="w-[28px] h-[28px] rounded-full object-cover" />
          </div>
        )}
        {!isOwn && !isLastInGroup && <div className="w-[36px] flex-shrink-0" />}

        <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} ${msg.type === "game" ? "max-w-[90%] sm:max-w-[80%] md:max-w-[60%]" : "max-w-[75%]"} relative`}>

          {/* Reply preview — shown ABOVE the bubble */}
          {replyTo && (
            <div className={`mb-1 max-w-full flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
              <span className="text-[11px] text-[#737373] mb-0.5 px-1">
                {isOwn ? "ردّيت" : `ردّ ${otherUser?.displayName ?? ""}`}
              </span>
              <div className="px-3.5 py-1.5 text-[13px] rounded-[18px] bg-[#1a1a1a] border border-white/[0.08] text-[#a8a8a8] max-w-full truncate">
                <EmojiText text={replyTo.content} size={13} />
              </div>
            </div>
          )}

          <div className="relative flex items-center gap-1.5">
            {/* Own message: actions LEFT of bubble */}
            {isOwn && showActions && (
              <div className="flex items-center gap-0.5 text-[#737373] animate-in fade-in zoom-in-95 duration-100">
                <button onClick={() => setShowReactions(s => !s)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-white transition-colors" title="تفاعل">
                  <Smile className="w-[17px] h-[17px]" />
                </button>
                <button onClick={handleReply} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-white transition-colors" title="ردّ">
                  <CornerUpLeft className="w-[15px] h-[15px]" />
                </button>
                <button onClick={() => setShowMenu(s => !s)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-white transition-colors" title="المزيد">
                  <span className="text-[18px] leading-none">⋯</span>
                </button>
              </div>
            )}

            {/* ── Bubble ────────────────────────────────────────────── */}
            <div
              onClick={handleTap}
              onContextMenu={(e) => { e.preventDefault(); setShowActions(true); setShowMenu(true); }}
              className={`relative select-none cursor-pointer ${
                msg.type === "like" || isOnlyEmoji
                  ? "text-[36px]"
                  : msg.type === "image" || msg.type === "video"
                    ? "p-0 overflow-hidden"
                    : msg.type === "voice"
                      ? `px-3 py-2.5 ${isOwn ? `${themeClass} text-white` : "bg-[#1e1e1e] border border-white/[0.1]"}`
                      : msg.type === "game"
                        ? "p-0 overflow-hidden"
                        : `px-[14px] py-[9px] text-[15px] ${
                            isOwn
                              ? `${themeClass} text-white`
                              : "bg-transparent border border-[#363636] text-[#fafafa]"
                          }`
              } leading-[1.35] break-words whitespace-pre-wrap`}
              style={{
                borderRadius:
                  (msg.type === "like" || isOnlyEmoji) ? "0"
                  : (msg.type === "image" || msg.type === "video" || msg.type === "game") ? "22px"
                  : borderRadius,
              }}
              dir="auto"
            >
              {msg.type === "voice" && msg.voice ? (
                <VoiceMessage src={msg.content} peaks={msg.voice.peaks} duration={msg.voice.duration} isOwn={isOwn} />
              ) : msg.type === "like" ? (
                "❤️"
              ) : msg.type === "image" ? (
                <img src={msg.content} alt="صورة" className="max-w-[240px] max-h-[320px] sm:max-w-[280px] object-cover rounded-[22px]" />
              ) : msg.type === "video" ? (
                <video src={msg.content} controls className="max-w-[240px] max-h-[320px] sm:max-w-[280px] object-cover bg-black rounded-[22px]" />
              ) : msg.type === "game" ? (
                <div className="w-[85vw] sm:w-[70vw] md:w-[50vw] max-w-[600px] flex flex-col justify-stretch items-stretch">
                  {gamePayload?.kind === "hub" ? (
                    <GameHubInline hubMessage={msg} conversationId={conversationId} />
                  ) : gamePayload?.kind === "rps" ? (
                    <RpsInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "xo_start" ? (
                    <XoInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "db_start" ? (
                    <DotsBoxesInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "c4_start" ? (
                    <Connect4InlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "sl_start" ? (
                    <SnakesLaddersInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "bank_start" ? (
                    <BankElHazInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "cards_start" ? (
                    <CardsInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "domino_start" ? (
                    <DominoesInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "qnd_start" ? (
                    <QnDInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "emoji_pict_start" ? (
                    <EmojiPictionaryInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "fasttap_start" ? (
                    <FastTapInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "wheel_start" ? (
                    <SpinWheelInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "wordchain_start" ? (
                    <WordChainInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
                      رسالة لعبة ({gamePayload?.kind ?? "غير معروف"}).
                    </div>
                  )}
                </div>
              ) : (
                <EmojiText text={msg.content} />
              )}
            </div>

            {/* Other user message: actions RIGHT of bubble */}
            {!isOwn && showActions && (
              <div className="flex items-center gap-0.5 text-[#737373] animate-in fade-in zoom-in-95 duration-100">
                <button onClick={() => setShowReactions(s => !s)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-white transition-colors">
                  <Smile className="w-[17px] h-[17px]" />
                </button>
                <button onClick={handleReply} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-white transition-colors">
                  <CornerUpLeft className="w-[15px] h-[15px]" />
                </button>
                <button onClick={() => setShowMenu(s => !s)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-white transition-colors">
                  <span className="text-[18px] leading-none">⋯</span>
                </button>
              </div>
            )}

            {/* Quick reactions popup */}
            {showReactions && (
              <div
                className={`absolute -top-12 ${isOwn ? "right-0" : "left-0"} z-[60] bg-[#262626] border border-white/[0.08] rounded-full px-2 py-1.5 flex items-center gap-1 shadow-2xl`}
                style={{ animation: "bubblePop 0.15s cubic-bezier(.34,1.3,.64,1) both" }}
              >
                {QUICK_REACTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => onReact(e)}
                    className={`w-9 h-9 rounded-full text-[20px] flex items-center justify-center hover:scale-125 hover:-translate-y-1 transition-transform leading-none ${myReaction === e ? "bg-white/15" : ""}`}
                  >
                    <EmojiText text={e} size={22} />
                  </button>
                ))}
              </div>
            )}

            {/* Context menu */}
            {showMenu && (
              <div
                className={`absolute top-full mt-2 ${isOwn ? "right-0" : "left-0"} z-[60] w-[180px] bg-[#262626] rounded-[16px] overflow-hidden shadow-2xl ring-1 ring-black/30`}
                style={{ animation: "bubblePop 0.15s cubic-bezier(.34,1.3,.64,1) both" }}
              >
                <MI icon={<CornerUpLeft className="w-[17px] h-[17px]" />} label="ردّ" onClick={handleReply} />
                <MI icon={<Copy className="w-[17px] h-[17px]" />} label="نسخ" onClick={handleCopy} />
                {isOwn && <div className="h-px bg-white/[0.08] mx-3" />}
                {isOwn && <MI icon={<Trash2 className="w-[17px] h-[17px]" />} label="سحب الرسالة" onClick={handleUnsend} destructive />}
              </div>
            )}
          </div>

          {/* Reaction chips */}
          {reactionEntries.length > 0 && (
            <div className={`flex ${isOwn ? "justify-end" : "justify-start"} -mt-2 z-[50] ${isOwn ? "pr-2" : "pl-2"} relative`}>
              <div className="bg-[#262626] border border-white/[0.08] rounded-full px-2 py-[3px] flex items-center gap-1 text-[13px] shadow cursor-pointer hover:bg-[#333] transition-colors">
                {reactionEntries.map(([emoji, count]) => (
                  <button key={emoji} onClick={() => onReact(emoji)} className="flex items-center gap-0.5 active:scale-90 transition-transform">
                    <EmojiText text={emoji} size={13} />
                    {count > 1 && <span className="text-[11px] text-[#a8a8a8] font-medium">{count}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delivery status — only for own last message */}
          {isOwn && isLastInGroup && isLastOverall && (
            <div className="text-[11px] text-[#737373] mt-[3px] pr-1 font-medium animate-in fade-in duration-300">
              {msg.status === "sending" ? "جاري الإرسال..." : msg.status === "sent" ? "أُرسلت" : msg.status === "delivered" ? "وصلت" : "مقروءة"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

function MI({ icon, label, onClick, destructive }: { icon: React.ReactNode; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 active:bg-white/10 text-[14px] transition-colors ${destructive ? "text-[#ed4956]" : "text-[#fafafa]"}`}>
      <span className="font-medium">{label}</span>
      {icon}
    </button>
  );
}
