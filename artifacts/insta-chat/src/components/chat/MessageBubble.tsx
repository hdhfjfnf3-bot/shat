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

const themeColorsMap: Record<string, string> = {
  default: "bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]",
  monochrome: "bg-gradient-to-br from-[#444444] to-[#111111]",
  ocean: "bg-gradient-to-br from-[#00c6ff] to-[#0072ff]",
  love: "bg-gradient-to-br from-[#ff0844] to-[#ffb199]",
  cyberpunk: "bg-gradient-to-br from-[#f000ff] to-[#00d4ff]",
  forest: "bg-gradient-to-br from-[#11998e] to-[#38ef7d]",
  halloween: "bg-gradient-to-br from-[#ff8c00] to-[#e52e71]",
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
    
    // Cancel if swiping vertically
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 15) {
      touchStartRef.current = null;
      setIsSwiping(false);
      setSwipeX(0);
      return;
    }
    
    // Swipe left (negative dx) to reply
    if (dx < 0) {
      setSwipeX(Math.max(dx, -70));
    }
  };

  const handleTouchEnd = () => {
    if (swipeX <= -55) {
      handleReply();
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(40);
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
      lastTap.current = 0; // reset to prevent triple tap bug
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

  /* Identify if the message is newly created to trigger animation */
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

  /* ── Unsent ─────────────────────────────────────────────────── */
  if (msg.isUnsent) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-[6px]" : "mt-[2px]"} ${animClass}`} style={originStyle}>
        {!isOwn && isLastInGroup && <div className="w-[26px] ml-2 flex-shrink-0 flex items-end pb-[2px]"><img src={otherUser?.avatarUrl} className="w-[26px] h-[26px] rounded-full object-cover" /></div>}
        {!isOwn && !isLastInGroup && <div className="w-[34px] flex-shrink-0" />}
        <div className="px-3.5 py-2 text-[13px] italic text-[#737373] border border-white/10 rounded-[18px]">
          {isOwn ? "لقد سحبت رسالة" : "تم سحب الرسالة"}
        </div>
      </div>
    );
  }

  /* ── Theme Notification ─────────────────────────────────────── */
  if (msg.type === "theme") {
    const themeName = {
      default: "الافتراضي", monochrome: "وضع التخفي (أسود)", ocean: "أمواج المحيط",
      love: "حب ورومانسية", cyberpunk: "سايبر بانك نيون", forest: "غابة استوائية", halloween: "نار وهالوين"
    }[msg.content] || msg.content;
    
    return (
      <div className="w-full flex justify-center my-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="text-[11px] font-medium text-[#a8a8a8] bg-[#1a1a1a] px-4 py-1.5 rounded-full border border-white/[0.04]">
          {isOwn ? "أنت غيرت ثيم المحادثة إلى " : "تم تغيير الثيم إلى "}
          <span className="font-bold text-white">{themeName}</span> ✨
        </div>
      </div>
    );
  }

  /* ── Normal ─────────────────────────────────────────────────── */
  const currentThemeMsg = allMessages ? [...allMessages].reverse().find(m => m.type === "theme") : undefined;
  const currentThemeId = currentThemeMsg?.content || "default";
  const themeClass = themeColorsMap[currentThemeId] || themeColorsMap["default"];

  return (
    <div className="relative w-full overflow-visible">
      {/* Swipe to reply icon indicator */}
      {swipeX < 0 && (
        <div 
          className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-white/10 ${isOwn ? "right-2" : "right-10"}`}
          style={{ 
            width: 32, height: 32,
            opacity: Math.min(1, Math.abs(swipeX) / 50),
            transform: `scale(${Math.min(1, Math.abs(swipeX) / 55)})`
          }}
        >
          <CornerUpLeft className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        ref={wrapRef}
        className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-[6px]" : "mt-[2px]"} relative group ${animClass}`}
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
        <div className="w-[26px] ml-2 flex-shrink-0 flex items-end pb-[2px]">
          <img src={otherUser?.avatarUrl} className="w-[26px] h-[26px] rounded-full object-cover" />
        </div>
      )}
      {!isOwn && !isLastInGroup && <div className="w-[34px] flex-shrink-0" />}

      <div className="flex flex-col max-w-[72%] relative">
        {/* Reply preview */}
        {replyTo && (
          <div className={`text-[11px] text-[#737373] mb-[2px] ${isOwn ? "text-left pl-3" : "text-right pr-3"}`}>
            {isOwn ? "أنت ردّيت" : `${otherUser?.displayName ?? "الطرف الآخر"} ردّ`}
          </div>
        )}
        {replyTo && (
          <div className={`max-w-full mb-[-12px] pb-[14px] px-3.5 pt-2 text-[13px] rounded-[18px] bg-[#1a1a1a] text-[#a8a8a8] truncate ${isOwn ? "self-end" : "self-start"} border border-white/[0.04]`}>
            <EmojiText text={replyTo.content} size={13} />
          </div>
        )}

        <div className="relative flex items-center gap-1.5">
          {/* Own quick actions */}
          {isOwn && showActions && (
            <div className="flex items-center gap-0.5 text-[#555] px-1 animate-in fade-in zoom-in-95 duration-100">
              <button onClick={() => setShowMenu((s) => !s)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-white transition-colors" title="المزيد">
                <span className="text-[14px] leading-none">⋯</span>
              </button>
              <button onClick={handleReply} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-white transition-colors" title="ردّ">
                <CornerUpLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setShowReactions((s) => !s)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-white transition-colors" title="تفاعل">
                <Smile className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bubble */}
          <div
            onClick={handleTap}
            onContextMenu={(e) => { e.preventDefault(); setShowActions(true); setShowMenu(true); }}
            className={`relative select-none cursor-pointer ig-pop ${
              msg.type === "like" || isOnlyEmoji ? "text-[44px] animate-heartBeat -my-2" :
              msg.type === "image" || msg.type === "video" ? "p-0 overflow-hidden border border-white/10" :
              msg.type === "voice" ? "px-3 py-2 text-[14px]" :
              msg.type === "game" ? "p-0 overflow-hidden border border-white/10 bg-[#1a1a1a]" :
              "px-[14px] py-[8px] text-[14px]"
            } leading-[1.3] break-words ${
              msg.type === "like" || isOnlyEmoji ? "" :
              msg.type === "image" || msg.type === "video" ? "bg-[#1a1a1a]" :
              isOwn ? `${themeClass} text-white shadow-sm` : "bg-[#1a1a1a] border border-white/[0.04] text-[#fafafa]"
            }`}
            style={{ borderRadius: (msg.type === "like" || isOnlyEmoji) ? "0" : borderRadius }}
            dir="auto"
          >
            {msg.type === "voice" && msg.voice ? (
              <VoiceMessage src={msg.content} peaks={msg.voice.peaks} duration={msg.voice.duration} isOwn={isOwn} />
            ) : msg.type === "like" ? (
              "❤️"
            ) : msg.type === "image" ? (
              <img src={msg.content} alt="صورة" className="max-w-[240px] max-h-[320px] sm:max-w-[280px] object-cover" />
            ) : msg.type === "video" ? (
              <video src={msg.content} controls className="max-w-[240px] max-h-[320px] sm:max-w-[280px] object-cover bg-black" />
            ) : msg.type === "game" ? (
              <div className="max-w-[320px] sm:max-w-[360px]">
                {gamePayload?.kind === "hub" ? (
                  <GameHubInline hubMessage={msg} conversationId={conversationId} />
                ) : gamePayload?.kind === "rps" ? (
                  <RpsInlineGame
                    gameMessage={msg}
                    otherUserId={(otherUser?.id ?? "").toLowerCase()}
                    conversationId={conversationId}
                    allMessages={allMessages}
                  />
                ) : gamePayload?.kind === "xo_start" ? (
                  <XoInlineGame
                    gameMessage={msg}
                    otherUserId={(otherUser?.id ?? "").toLowerCase()}
                    conversationId={conversationId}
                    allMessages={allMessages}
                  />
                ) : gamePayload?.kind === "db_start" ? (
                  <DotsBoxesInlineGame
                    gameMessage={msg}
                    otherUserId={(otherUser?.id ?? "").toLowerCase()}
                    conversationId={conversationId}
                    allMessages={allMessages}
                  />
                ) : gamePayload?.kind === "c4_start" ? (
                  <Connect4InlineGame
                    gameMessage={msg}
                    otherUserId={(otherUser?.id ?? "").toLowerCase()}
                    conversationId={conversationId}
                    allMessages={allMessages}
                  />
                ) : gamePayload?.kind === "sl_start" ? (
                  <SnakesLaddersInline
                    gameMessage={msg}
                    otherUserId={(otherUser?.id ?? "").toLowerCase()}
                    conversationId={conversationId}
                    allMessages={allMessages}
                  />
                ) : gamePayload?.kind === "bank_start" ? (
                  <BankElHazInline
                    gameMessage={msg}
                    otherUserId={(otherUser?.id ?? "").toLowerCase()}
                    conversationId={conversationId}
                    allMessages={allMessages}
                  />
                ) : gamePayload?.kind === "cards_start" ? (
                  <CardsInlineGame
                    gameMessage={msg}
                    otherUserId={(otherUser?.id ?? "").toLowerCase()}
                    conversationId={conversationId}
                    allMessages={allMessages}
                  />
                ) : gamePayload?.kind === "domino_start" ? (
                  <DominoesInlineGame
                    gameMessage={msg}
                    otherUserId={(otherUser?.id ?? "").toLowerCase()}
                    conversationId={conversationId}
                    allMessages={allMessages}
                  />
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

          {/* Other user quick actions */}
          {!isOwn && showActions && (
            <div className="flex items-center gap-0.5 text-[#555] px-1 animate-in fade-in zoom-in-95 duration-100">
              <button onClick={() => setShowReactions((s) => !s)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-white transition-colors">
                <Smile className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleReply} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-white transition-colors">
                <CornerUpLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setShowMenu((s) => !s)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-white transition-colors">
                <span className="text-[14px] leading-none">⋯</span>
              </button>
            </div>
          )}

          {/* Quick reactions */}
          {showReactions && (
            <div
              className={`absolute -top-11 ${isOwn ? "right-0" : "left-0"} z-[60] bg-[#1a1a1a] border border-white/10 rounded-full px-1.5 py-1 flex items-center gap-0.5 shadow-2xl ring-1 ring-black/5`}
              style={{ animation: "bubblePop 0.15s cubic-bezier(.34,1.3,.64,1) both" }}
            >
              {QUICK_REACTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => onReact(e)}
                  className={`w-8 h-8 rounded-full text-[20px] flex items-center justify-center hover:scale-125 hover:-translate-y-1 transition-transform leading-none ${myReaction === e ? "bg-white/10" : ""}`}
                >
                  <EmojiText text={e} size={22} />
                </button>
              ))}
            </div>
          )}

          {/* Context menu */}
          {showMenu && (
            <div
              className={`absolute top-full mt-2 ${isOwn ? "right-0" : "left-0"} z-[60] w-[180px] bg-[#262626] rounded-[14px] overflow-hidden shadow-2xl ring-1 ring-black/5`}
              style={{ animation: "bubblePop 0.15s cubic-bezier(.34,1.3,.64,1) both" }}
            >
              <MI icon={<CornerUpLeft className="w-[18px] h-[18px]" />} label="ردّ" onClick={handleReply} />
              <MI icon={<Copy className="w-[18px] h-[18px]" />} label="نسخ" onClick={handleCopy} />
              {isOwn && <div className="h-px bg-white/10 mx-3 my-1" />}
              {isOwn && <MI icon={<Trash2 className="w-[18px] h-[18px]" />} label="سحب الرسالة" onClick={handleUnsend} destructive />}
            </div>
          )}
        </div>

        {/* Reaction chips */}
        {reactionEntries.length > 0 && (
          <div className={`flex ${isOwn ? "justify-end" : "justify-start"} -mt-2 z-[50] ${isOwn ? "pr-3" : "pl-3"} relative`}>
            <div className="bg-[#000] p-[2px] rounded-full inline-flex">
              <div className="bg-[#262626] rounded-full px-1.5 py-[2px] flex items-center gap-1 text-[11px] shadow-sm cursor-pointer hover:bg-[#333] transition-colors">
                {reactionEntries.map(([emoji, count]) => (
                  <button key={emoji} onClick={() => onReact(emoji)} className="flex items-center gap-0.5 active:scale-90 transition-transform">
                    <EmojiText text={emoji} size={12} />
                    {count > 1 && <span className="text-[#a8a8a8] font-medium">{count}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Delivery status */}
        {isOwn && isLastInGroup && isLastOverall && (
          <div className="text-[11px] text-[#737373] mt-1 text-left font-medium animate-in fade-in duration-300">
            {msg.status === "sending" ? "جاري الإرسال..." : msg.status === "sent" ? "تم الإرسال" : msg.status === "delivered" ? "تم التسليم" : "مقروءة"}
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
