import { useEffect, useRef, memo, useMemo } from "react";
import { useChatStore } from "@/lib/store";
import { useMe } from "@/lib/me";
import { Message } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

/* ── Typing indicator ──────────────────────────────────────────── */
const TypingIndicator = memo(function TypingIndicator({ avatarUrl }: { avatarUrl?: string }) {
  return (
    <div className="flex items-end gap-2 px-3 mb-1">
      {avatarUrl && (
        <img src={avatarUrl} className="w-[28px] h-[28px] rounded-full object-cover shrink-0" />
      )}
      <div
        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[22px] rounded-bl-[4px] px-4 py-3 flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        style={{ animation: "bubblePop 0.15s cubic-bezier(.34,1.3,.64,1) both" }}
      >
        {[0, 160, 320].map((d) => (
          <span
            key={d}
            className="w-[7px] h-[7px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)] inline-block"
            style={{ animation: `typingBounce 1.2s ease-in-out ${d}ms infinite` }}
          />
        ))}
      </div>
    </div>
  );
});

/* ── Date separator ─────────────────────────────────────────────── */
function DateSep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-white/[0.05]" />
      <span className="text-[12px] text-[#737373] font-medium">{label}</span>
      <div className="flex-1 h-px bg-white/[0.05]" />
    </div>
  );
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "اليوم";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "أمس";
  return d.toLocaleDateString("ar-EG", { weekday: "long", month: "short", day: "numeric" });
}

/* ── Thread ─────────────────────────────────────────────────────── */
export function Thread({ activeId }: { activeId: string }) {
  const username  = useMe((s) => s.username);
  const messages  = useChatStore((s) => s.messages[activeId] ?? []);
  const conv      = useChatStore((s) => s.conversations[activeId]);
  const isTyping  = useChatStore((s) => s.typingPeers[activeId] ?? false);
  const vanishMode = useChatStore((s) => s.vanishMode[activeId] ?? false);
  const otherUser = conv?.participants[0];
  const virtuoso = useRef<VirtuosoHandle>(null);

  /* Compute theme once for ALL messages */
  const themeClass = useMemo(() => {
    const themeMsg = [...messages].reverse().find(m => m.type === "theme");
    const id = themeMsg?.content || "default";
    const map: Record<string, string> = {
      default:    "bg-gradient-to-br from-[#3797f0] to-[#833ab4]",
      monochrome: "bg-gradient-to-br from-[#444444] to-[#111111]",
      ocean:      "bg-gradient-to-br from-[#00c6ff] to-[#0072ff]",
      love:       "bg-gradient-to-br from-[#ff0844] to-[#ffb199]",
      cyberpunk:  "bg-gradient-to-br from-[#f000ff] to-[#00d4ff]",
      forest:     "bg-gradient-to-br from-[#11998e] to-[#38ef7d]",
      halloween:  "bg-gradient-to-br from-[#ff8c00] to-[#e52e71]",
      sunset:     "bg-gradient-to-br from-[#fc4a1a] to-[#f7b733]",
      aurora:     "bg-gradient-to-br from-[#00b09b] to-[#96c93d]",
      royal:      "bg-gradient-to-br from-[#141E30] to-[#243B55]",
    };
    return map[id] || map["default"];
  }, [messages]);

  /* Build a replyId->msg lookup map to avoid O(n) find in each bubble */
  const msgById = useMemo(() => {
    const map = new Map<string, Message>();
    messages.forEach(m => map.set(m.id, m));
    return map;
  }, [messages]);

  /* Build item list with date separators and precalculated styles */
  const items = useMemo(() => {
    const list: Array<any> = [];
    let lastDay = "";
    messages.forEach((msg, idx) => {
      // Skip game move payloads (show only start/hub messages)
      if (msg.type === "game") {
        try {
          const payload = JSON.parse(msg.content);
          if (payload?.kind && !payload.kind.endsWith("_start") && payload.kind !== "hub") return;
        } catch {}
      }
      const day = formatDay(msg.createdAt);
      if (day !== lastDay) { list.push({ type: "sep", label: day, id: `sep-${idx}` }); lastDay = day; }
      
      const isOwn = msg.senderId === username;
      const prev = messages[idx - 1];
      const next = messages[idx + 1];
      const isFirst = !prev || prev.senderId !== msg.senderId;
      const isLast  = !next || next.senderId !== msg.senderId;

      let br = "22px";
      if (isOwn) {
        if (!isFirst && !isLast) br = "22px 4px 4px 22px";
        else if (!isFirst && isLast)  br = "22px 4px 22px 22px";
        else if (isFirst && !isLast)  br = "22px 22px 4px 22px";
      } else {
        if (!isFirst && !isLast) br = "4px 22px 22px 4px";
        else if (!isFirst && isLast)  br = "4px 22px 22px 22px";
        else if (isFirst && !isLast)  br = "22px 22px 22px 4px";
      }

      list.push({ type: "msg", idx, msg, isOwn, isFirst, isLast, br, id: msg.id });
    });
    return list;
  }, [messages, username]);

  useEffect(() => {
    if (isTyping && virtuoso.current && items.length > 0) {
      virtuoso.current.scrollToIndex({ index: items.length - 1, behavior: "smooth" });
    }
  }, [isTyping, items.length]);

  useEffect(() => {
    if (virtuoso.current && items.length > 0) {
      const timer = setTimeout(() => {
        virtuoso.current?.scrollToIndex({ index: items.length - 1, behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [items.length]);

  return (
    <div className={`flex-1 min-h-0 flex flex-col transition-colors duration-500 overflow-hidden ${vanishMode ? "bg-black" : "bg-transparent"}`}>
      <Virtuoso
        ref={virtuoso}
        className="flex-1 hide-scrollbar"
        data={items}
        initialTopMostItemIndex={items.length > 0 ? items.length - 1 : 0}
        followOutput="auto"
        alignToBottom={true}
        components={{
          Header: () => (
            <>
              {messages.length === 0 && !vanishMode && (
                <div className="flex flex-col items-center justify-center gap-4 py-20 animate-in fade-in">
                  <img src={otherUser?.avatarUrl} className="w-20 h-20 rounded-full ring-2 ring-white/10" alt="" />
                  <div className="text-center">
                    <p className="font-bold text-white text-[17px]">{otherUser?.displayName || otherUser?.username}</p>
                    <p className="text-[#737373] text-[13px] mt-1">قل مرحبا! 👋</p>
                  </div>
                </div>
              )}
              {vanishMode && (
                <div className="flex flex-col items-center justify-center gap-4 py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-20 h-20 rounded-full border border-white/20 border-dashed flex items-center justify-center bg-white/5">
                    <span className="text-[32px]">🤫</span>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-white text-[17px]">وضع التدمير الذاتي</p>
                    <p className="text-[#a8a8a8] text-[13px] mt-2 max-w-[200px] leading-relaxed">
                      الرسائل المرسلة في هذا الوضع تختفي بمجرد إغلاق المحادثة.
                    </p>
                  </div>
                </div>
              )}
            </>
          ),
          Footer: () => (
            <div className="pb-2">
              {isTyping && <TypingIndicator avatarUrl={otherUser?.avatarUrl} />}
            </div>
          )
        }}
        itemContent={(index, item) => {
          if (item.type === "sep") return <DateSep label={item.label} />;
          return (
            <MessageBubble
              msg={item.msg}
              isOwn={item.isOwn}
              isFirstInGroup={item.isFirst}
              isLastInGroup={item.isLast}
              isLastOverall={item.idx === messages.length - 1}
              borderRadius={item.br}
              otherUser={otherUser}
              conversationId={activeId}
              allMessages={messages}
              themeClass={themeClass}
              isGroup={conv?.isGroup}
              participants={conv?.participants || []}
            />
          );
        }}
      />
    </div>
  );
}
