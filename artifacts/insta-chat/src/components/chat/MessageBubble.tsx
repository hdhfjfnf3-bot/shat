import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Copy, CornerUpLeft, Forward, Trash2, Smile } from "lucide-react";
import { Message, CURRENT_USER, User } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import { EmojiText } from "./EmojiText";
import { VoiceMessage } from "./VoiceMessage";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

export function MessageBubble({
  msg,
  isOwn,
  isFirstInGroup,
  isLastInGroup,
  isLastOverall,
  borderRadius,
  otherUser,
  conversationId,
  allMessages,
}: {
  msg: Message;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isLastOverall: boolean;
  borderRadius: string;
  otherUser?: User;
  conversationId: string;
  allMessages: Message[];
}) {
  const { toggleReaction, unsendMessage, setReplyingTo } = useChatStore();
  const [showActions, setShowActions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAllReactions, setShowAllReactions] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const lastTap = useRef<number>(0);

  useEffect(() => {
    if (!showMenu && !showAllReactions) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowAllReactions(false);
        setShowActions(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showMenu, showAllReactions]);

  const handleDoubleClick = () => {
    if (msg.isUnsent) return;
    toggleReaction(conversationId, msg.id, "❤️");
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleDoubleClick();
    }
    lastTap.current = now;
  };

  const startLongPress = () => {
    longPressTimer.current = window.setTimeout(() => {
      setShowActions(true);
      setShowMenu(true);
    }, 450);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const replyTo = msg.replyToId ? allMessages.find((m) => m.id === msg.replyToId) : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content).catch(() => {});
    setShowMenu(false);
    setShowActions(false);
  };

  const handleReply = () => {
    setReplyingTo(conversationId, msg.id);
    setShowMenu(false);
    setShowActions(false);
  };

  const handleUnsend = () => {
    unsendMessage(conversationId, msg.id);
    setShowMenu(false);
    setShowActions(false);
  };

  const onReact = (emoji: string) => {
    toggleReaction(conversationId, msg.id, emoji);
    setShowActions(false);
    setShowMenu(false);
    setShowAllReactions(false);
  };

  // Aggregate reactions
  const reactions = msg.reactions ?? [];
  const reactionCounts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});
  const reactionEntries = Object.entries(reactionCounts);
  const myReaction = reactions.find((r) => r.userId === CURRENT_USER.id)?.emoji;

  if (msg.isUnsent) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-2" : ""}`}>
        {!isOwn && isLastInGroup && (
          <div className="w-[28px] mr-2 flex-shrink-0 flex items-end pb-1">
            <img src={otherUser?.avatarUrl} className="w-[28px] h-[28px] rounded-full object-cover" />
          </div>
        )}
        {!isOwn && !isLastInGroup && <div className="w-[36px] flex-shrink-0" />}
        <div className="px-[16px] py-[10px] text-[14px] italic text-[#a8a8a8] border border-[#363636] rounded-[22px]">
          {isOwn ? "You unsent a message" : "Message was unsent"}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={wrapRef}
      initial={
        isLastInGroup && isOwn && msg.status === "sending"
          ? { opacity: 0, scale: 0.9, y: 10 }
          : false
      }
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-2" : ""} group relative`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        if (!showMenu && !showAllReactions) setShowActions(false);
      }}
    >
      {!isOwn && isLastInGroup && (
        <div className="w-[28px] mr-2 flex-shrink-0 flex items-end pb-1">
          <img src={otherUser?.avatarUrl} className="w-[28px] h-[28px] rounded-full object-cover" />
        </div>
      )}
      {!isOwn && !isLastInGroup && <div className="w-[36px] flex-shrink-0" />}

      <div className="flex flex-col max-w-[75%] relative">
        {/* Reply quote */}
        {replyTo && (
          <div
            className={`text-[12px] text-[#a8a8a8] mb-[2px] ${isOwn ? "text-right pr-3" : "pl-3"}`}
          >
            <span className="opacity-70">
              {isOwn ? "You replied" : `${otherUser?.displayName ?? "Them"} replied`}
            </span>
          </div>
        )}
        {replyTo && (
          <div
            className={`max-w-full mb-[-10px] pb-3 px-[14px] pt-[8px] text-[13px] rounded-[18px] bg-[#1c1c1c] text-[#a8a8a8] truncate ${isOwn ? "self-end" : "self-start"} border border-[#262626]`}
            style={{ maxWidth: "100%" }}
          >
            <div className="truncate"><EmojiText text={replyTo.content} size={14} /></div>
          </div>
        )}

        <div className="relative flex items-center gap-2">
          {isOwn && showActions && (
            <div className="flex items-center gap-1 text-[#a8a8a8]">
              <button
                onClick={() => setShowMenu((s) => !s)}
                className="hover:text-white p-1"
                title="More"
              >
                <span className="text-[18px] leading-none">⋯</span>
              </button>
              <button onClick={handleReply} className="hover:text-white p-1" title="Reply">
                <CornerUpLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowAllReactions((s) => !s)}
                className="hover:text-white p-1"
                title="React"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>
          )}

          <div
            onClick={handleTap}
            onDoubleClick={handleDoubleClick}
            onTouchStart={startLongPress}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowActions(true);
              setShowMenu(true);
            }}
            className={`relative ${msg.type === "voice" ? "px-3 py-2" : "px-[16px] py-[10px]"} text-[15px] leading-[19px] break-words cursor-pointer select-none ig-pop ${
              isOwn ? "ig-gradient text-white" : "bg-[#262626] text-[#fafafa]"
            }`}
            style={{ borderRadius }}
            dir="auto"
          >
            {msg.type === "voice" && msg.voice ? (
              <VoiceMessage
                src={msg.content}
                peaks={msg.voice.peaks}
                duration={msg.voice.duration}
                isOwn={isOwn}
              />
            ) : (
              <EmojiText text={msg.content} />
            )}
          </div>

          {!isOwn && showActions && (
            <div className="flex items-center gap-1 text-[#a8a8a8]">
              <button
                onClick={() => setShowAllReactions((s) => !s)}
                className="hover:text-white p-1"
                title="React"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button onClick={handleReply} className="hover:text-white p-1" title="Reply">
                <CornerUpLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowMenu((s) => !s)}
                className="hover:text-white p-1"
                title="More"
              >
                <span className="text-[18px] leading-none">⋯</span>
              </button>
            </div>
          )}

          {/* Quick reactions row */}
          {showAllReactions && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.12 }}
              className={`absolute -top-12 ${isOwn ? "right-0" : "left-0"} z-30 bg-[#1a1a1a] border border-[#363636] rounded-full px-2 py-1.5 flex items-center gap-1 shadow-2xl`}
            >
              {QUICK_REACTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => onReact(e)}
                  className={`w-8 h-8 rounded-full text-[20px] hover:scale-125 transition-transform leading-none ${myReaction === e ? "bg-[#262626]" : ""}`}
                >
                  <EmojiText text={e} size={22} />
                </button>
              ))}
            </motion.div>
          )}

          {/* Context menu */}
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12 }}
              className={`absolute top-full mt-2 ${isOwn ? "right-0" : "left-0"} z-30 w-[180px] bg-[#1a1a1a] border border-[#363636] rounded-xl overflow-hidden shadow-2xl`}
            >
              <MenuItem icon={<CornerUpLeft className="w-4 h-4" />} label="Reply" onClick={handleReply} />
              <MenuItem icon={<Copy className="w-4 h-4" />} label="Copy" onClick={handleCopy} />
              <MenuItem icon={<Forward className="w-4 h-4" />} label="Forward" onClick={() => setShowMenu(false)} />
              {isOwn && (
                <MenuItem
                  icon={<Trash2 className="w-4 h-4" />}
                  label="Unsend"
                  onClick={handleUnsend}
                  destructive
                />
              )}
            </motion.div>
          )}
        </div>

        {/* Reactions chip */}
        {reactionEntries.length > 0 && (
          <div
            className={`flex ${isOwn ? "justify-end" : "justify-start"} -mt-2 z-10 ${isOwn ? "pr-2" : "pl-2"}`}
          >
            <div className="bg-[#1f1f1f] border border-[#0a0a0a] rounded-full px-2 py-[2px] flex items-center gap-1 text-[12px] text-white shadow">
              {reactionEntries.map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className="flex items-center gap-0.5 hover:scale-110 transition-transform"
                >
                  <EmojiText text={emoji} size={14} />
                  {count > 1 && <span className="text-[11px] text-[#a8a8a8]">{count}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status */}
        {isOwn && isLastInGroup && isLastOverall && (
          <div className="text-[12px] text-[#a8a8a8] mt-1 text-right mr-1 transition-all">
            {msg.status === "sending" ? (
              <span className="italic">Sending...</span>
            ) : msg.status === "sent" ? (
              "Sent"
            ) : msg.status === "delivered" ? (
              "Delivered"
            ) : (
              "Seen"
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#262626] text-left text-[14px] ${destructive ? "text-[#ed4956]" : "text-[#fafafa]"}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
