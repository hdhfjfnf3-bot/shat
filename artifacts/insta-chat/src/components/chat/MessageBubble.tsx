import { memo, useEffect, useRef, useState, useMemo } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { Copy, CornerUpLeft, Trash2, Smile, Edit2 } from "lucide-react";
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
import { WouldYouRatherInline } from "./WouldYouRatherInline";
import { NeverHaveIEverInline } from "./NeverHaveIEverInline";
import { ScrambledWordInline } from "./ScrambledWordInline";
import { LoveCalculatorInline } from "./LoveCalculatorInline";
import { PollInline } from "./PollInline";
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
  themeClass: string;
  isGroup?: boolean;
  participants?: User[];
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
  borderRadius, otherUser, conversationId, allMessages, themeClass, isGroup, participants
}: Props) {
  const { toggleReaction, unsendMessage, setReplyingTo, setEditingMessage } = useChatStore();
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showTime, setShowTime] = useState(false);
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
    if (!showReactions) return;
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowReactions(false); setShowActions(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [showReactions]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300 && !msg.isUnsent) {
      toggleReaction(conversationId, msg.id, "❤️");
      lastTap.current = 0;
    } else {
      setShowTime(s => !s);
      lastTap.current = now;
    }
  };

  const handleReply  = () => { setReplyingTo(conversationId, msg.id); setShowActions(false); };
  const handleEdit   = () => { setEditingMessage(conversationId, msg.id); setShowActions(false); };
  const handleCopy   = () => { navigator.clipboard.writeText(msg.content).catch(() => {}); setShowActions(false); };
  const handleUnsend = () => { unsendMessage(conversationId, msg.id); setShowActions(false); };
  const onReact = (emoji: string) => { toggleReaction(conversationId, msg.id, emoji); setShowReactions(false); setShowActions(false); };

  const reactions = msg.reactions ?? [];
  const reactionCounts = reactions.reduce<Record<string, number>>((a, r) => ({ ...a, [r.emoji]: (a[r.emoji] || 0) + 1 }), {});
  const reactionEntries = Object.entries(reactionCounts);
  const myReaction = reactions.find((r) => r.userId === CURRENT_USER.id)?.emoji;
  const replyTo = msg.replyToId ? allMessages.find((m) => m.id === msg.replyToId) : null;
  const gamePayload = msg.type === "game" ? safeJsonParse<{ kind?: string; gameId?: string }>(msg.content) : null;

  const isNew = Date.now() - new Date(msg.createdAt).getTime() < 2000;
  const animClass = ""; // Disabled to fix Virtuoso scrolling glitches
  const originStyle = { transformOrigin: isOwn ? "bottom right" : "bottom left" };

  const isOnlyEmoji = useMemo(() => {
    if (msg.type !== "text" || msg.isUnsent) return false;
    const stripped = msg.content.replace(emojiRegex(), "").trim();
    if (stripped.length > 0) return false;
    const count = (msg.content.match(emojiRegex()) || []).length;
    return count > 0 && count <= 3;
  }, [msg]);

  /* themeClass comes from Thread (computed once for all bubbles) */

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
    <ContextMenu.Root onOpenChange={(open) => { if (!open) setShowActions(false); }}>
      <ContextMenu.Trigger asChild>
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
        className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-[10px]" : "mt-[2px]"} px-4 relative group ${animClass}`}
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
        onMouseLeave={() => { if (!showReactions) setShowActions(false); }}
      >

        {/* Other user avatar */}
        {!isOwn && isLastInGroup && (
          <div className="w-[30px] ml-2 flex-shrink-0 flex items-end pb-[2px]">
            <img src={otherUser?.avatarUrl} className="w-[30px] h-[30px] rounded-full object-cover" alt="" />
          </div>
        )}
        {!isOwn && !isLastInGroup && <div className="w-[38px] flex-shrink-0" />}

        <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} ${msg.type === "game" ? "max-w-[90%] sm:max-w-[80%] md:max-w-[60%]" : "max-w-[72%]"} relative`}>

          {/* Reply preview */}
          {replyTo && (
            <div className={`mb-[4px] max-w-full flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
              <div
                className="px-3 py-1.5 text-[12px] rounded-[12px] max-w-full"
                style={{
                  background: isOwn ? 'rgba(167,139,250,0.1)' : 'rgba(79,124,247,0.1)',
                  borderLeft: isOwn ? 'none' : '2px solid rgba(79,124,247,0.5)',
                  borderRight: isOwn ? '2px solid rgba(167,139,250,0.5)' : 'none',
                }}
              >
                <span className="text-[10px] font-bold block mb-0.5" style={{ color: isOwn ? '#a78bfa' : '#6fa3f7' }}>
                  {isOwn ? "ردّيت" : `ردّ ${otherUser?.displayName ?? ""}`}
                </span>
                <span className="text-[#7d8fa0] truncate block max-w-[200px]">
                  <EmojiText text={replyTo.content} size={12} />
                </span>
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
              </div>
            )}

            {/* ── Bubble ────────────────────────────────────────────── */}
            <div
              onClick={handleTap}
              className={`relative select-none cursor-pointer ${
                msg.type === "like" || isOnlyEmoji
                  ? "text-[40px]"
                  : msg.type === "image" || msg.type === "video"
                    ? "p-0 overflow-hidden"
                    : msg.type === "voice"
                      ? `px-3 py-2.5 ${isOwn ? themeClass + " text-white" : "text-[#dde6f0]"}`
                      : msg.type === "game" || msg.type === "poll"
                        ? "p-0 overflow-hidden"
                        : `px-[15px] py-[10px] text-[15px] font-[450] ${
                            isOwn
                              ? `${themeClass} text-white`
                              : "text-[#dde6f0] bg-white/[0.04] border-l-[2px] border-[#00f0ff]/40"
                          }`
              } leading-[1.5] break-words whitespace-pre-wrap`}
              style={{
                borderRadius:
                  (msg.type === "like" || isOnlyEmoji) ? "0"
                  : (msg.type === "image" || msg.type === "video" || msg.type === "game") ? "22px"
                  : borderRadius,
                ...(!isOwn && msg.type !== "like" && msg.type !== "image" && msg.type !== "video" && msg.type !== "game" && msg.type !== "poll" && !isOnlyEmoji
                  ? {}
                  : {}),
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
                    <GameHubInline hubMessage={msg} conversationId={conversationId} isGroup={isGroup} participants={participants} />
                  ) : gamePayload?.kind === "rps" ? (
                    <RpsInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "xo_start" ? (
                    <XoInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "db_start" ? (
                    <DotsBoxesInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "c4_start" ? (
                    <Connect4InlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "sl_start" ? (
                    <SnakesLaddersInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                  ) : gamePayload?.kind === "bank_start" ? (
                    <BankElHazInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                  ) : gamePayload?.kind === "cards_start" ? (
                    <CardsInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "domino_start" ? (
                    <DominoesInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "qnd_start" ? (
                    <QnDInlineGame gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                  ) : gamePayload?.kind === "emoji_pict_start" ? (
                    <EmojiPictionaryInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                  ) : gamePayload?.kind === "fasttap_start" ? (
                    <FastTapInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                  ) : gamePayload?.kind === "wheel_start" ? (
                    <SpinWheelInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                  ) : gamePayload?.kind === "wordchain_start" ? (
                    <WordChainInline gameMessage={msg} otherUserId={(otherUser?.id ?? "").toLowerCase()} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                  ) : gamePayload?.kind === "wyr_start" ? (
                    <WouldYouRatherInline gameMessage={msg} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                  ) : gamePayload?.kind === "nhi_start" ? (
                    <NeverHaveIEverInline gameMessage={msg} conversationId={conversationId} allMessages={allMessages} participants={participants} />
                  ) : gamePayload?.kind === "scramble_start" ? (
                    <ScrambledWordInline gameMessage={msg} conversationId={conversationId} allMessages={allMessages} />
                  ) : gamePayload?.kind === "lovecalc_start" ? (
                    <LoveCalculatorInline gameMessage={msg} conversationId={conversationId} allMessages={allMessages} />
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
                      رسالة لعبة ({gamePayload?.kind ?? "غير معروف"}).
                    </div>
                  )}
                </div>
              ) : msg.type === "poll" ? (
                <PollInline 
                  msg={msg} 
                  conversationId={conversationId} 
                  isOwn={isOwn} 
                  participants={participants ?? []}
                />
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
              </div>
            )}

            {/* Quick reactions popup for desktop hover fallback */}
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
          </div>

          {/* Reaction chips */}
          {reactionEntries.length > 0 && (
            <div className={`flex ${isOwn ? "justify-end" : "justify-start"} relative z-[50] ${isOwn ? "pr-3" : "pl-3"}`} style={{ marginTop: '-10px' }}>
              <div className="rounded-full px-2.5 py-[4px] flex items-center gap-1 text-[13px] cursor-pointer" style={{ background: '#1f2d45', border: '1px solid rgba(255,255,255,0.06)' }}>
                {reactionEntries.map(([emoji, count]) => (
                  <button key={emoji} onClick={() => onReact(emoji)} className="flex items-center gap-0.5">
                    <EmojiText text={emoji} size={14} />
                    {count > 1 && <span className="text-[11px] font-semibold" style={{ color: '#7ba7f7' }}>{count}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delivery status — only for own last message */}
          {isOwn && isLastInGroup && isLastOverall && (
            <div className="text-[11px] mt-[3px] pr-1 flex items-center gap-1" style={{ color: '#4a6fa5' }}>
              {msg.status === "sending" ? "جاري الإرسال..." : msg.status === "sent" ? "✓ أُرسلت" : msg.status === "delivered" ? "✓✓ وصلت" : "✓✓ مقروءة"}
              {msg.isEdited && <span className="text-[10px] px-1.5 py-0.5 rounded-full text-[#4a6fa5]" style={{ background: 'rgba(79,124,247,0.1)' }}>عدّلت</span>}
            </div>
          )}
          
          {/* Timestamp Revealed on Tap */}
          {showTime && (
            <div className={`text-[10px] text-[#737373] mt-[2px] mb-1 ${isOwn ? "text-right pr-2" : "text-left pl-2"} animate-in fade-in slide-in-from-top-1 duration-150`}>
              {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      </div>
    </div>
    </ContextMenu.Trigger>

    {/* Context Menu Content */}
    <ContextMenu.Portal>
      <ContextMenu.Content
        className="z-[100] w-[220px] bg-[#262626]/95 backdrop-blur-xl rounded-[16px] overflow-hidden shadow-2xl ring-1 ring-black/30 animate-in fade-in zoom-in-95 duration-150 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[side=right]:slide-in-from-left-2 data-[side=left]:slide-in-from-right-2"
      >
        {/* Quick Reactions inside context menu (fixes cutoff issues on mobile) */}
        <div className="flex items-center justify-between px-2 py-2 border-b border-white/[0.08] bg-[#333]/50">
          {QUICK_REACTIONS.map((e) => (
            <ContextMenu.Item
              key={e}
              onSelect={() => onReact(e)}
              className={`w-8 h-8 rounded-full text-[20px] flex items-center justify-center hover:scale-125 transition-transform leading-none outline-none ${myReaction === e ? "bg-white/15" : ""}`}
            >
              <EmojiText text={e} size={22} />
            </ContextMenu.Item>
          ))}
        </div>

        <div className="p-1.5">
          <ContextMenu.Item onSelect={handleReply} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/10 outline-none text-[#fafafa] text-[14px] cursor-pointer font-medium transition-colors">
            ردّ
            <CornerUpLeft className="w-[16px] h-[16px] opacity-80" />
          </ContextMenu.Item>
          
          <ContextMenu.Item onSelect={handleCopy} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/10 outline-none text-[#fafafa] text-[14px] cursor-pointer font-medium transition-colors">
            نسخ
            <Copy className="w-[16px] h-[16px] opacity-80" />
          </ContextMenu.Item>

          {isOwn && msg.type === "text" && (
            <ContextMenu.Item onSelect={handleEdit} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/10 outline-none text-[#fafafa] text-[14px] cursor-pointer font-medium transition-colors">
              تعديل
              <Edit2 className="w-[16px] h-[16px] opacity-80" />
            </ContextMenu.Item>
          )}

          {isOwn && <ContextMenu.Separator className="h-px bg-white/[0.08] my-1 mx-1" />}
          
          {isOwn && (
            <ContextMenu.Item onSelect={handleUnsend} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#ed4956]/15 text-[#ed4956] outline-none text-[14px] cursor-pointer font-medium transition-colors">
              سحب الرسالة
              <Trash2 className="w-[16px] h-[16px]" />
            </ContextMenu.Item>
          )}
        </div>
      </ContextMenu.Content>
    </ContextMenu.Portal>
  </ContextMenu.Root>
  );
});
