import { useEffect, useRef, memo } from "react";
import { useChatStore } from "@/lib/store";
import { useMe } from "@/lib/me";
import { MessageBubble } from "./MessageBubble";

/* ── Typing indicator ──────────────────────────────────────────── */
const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mr-1 mb-1">
      <div className="w-7 h-7 rounded-full bg-white/10 shrink-0" />
      <div className="bg-[#1e1e1e] border border-white/[0.06] rounded-2xl px-4 py-3 flex items-center gap-1.5">
        {[0, 160, 320].map((d) => (
          <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#555] inline-block"
            style={{ animation: `typingBounce 1.2s ease-in-out ${d}ms infinite` }} />
        ))}
      </div>
    </div>
  );
});

/* ── Date separator ─────────────────────────────────────────────── */
function DateSep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3 px-4">
      <div className="flex-1 h-px bg-white/[0.05]" />
      <span className="text-[11px] text-[#444] font-medium">{label}</span>
      <div className="flex-1 h-px bg-white/[0.05]" />
    </div>
  );
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "اليوم";
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "أمس";
  return d.toLocaleDateString("ar-EG", { weekday: "long", month: "short", day: "numeric" });
}

/* ── Thread ─────────────────────────────────────────────────────── */
export function Thread({ activeId }: { activeId: string }) {
  const username = useMe((s) => s.username);
  const messages  = useChatStore((s) => s.messages[activeId] ?? []);
  const conv      = useChatStore((s) => s.conversations[activeId]);
  const isTyping  = useChatStore((s) => s.typingPeers[activeId] ?? false);
  const vanishMode = useChatStore((s) => s.vanishMode[activeId] ?? false);
  const otherUser = conv?.participants[0];
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* Scroll to bottom */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) { el.scrollTop = el.scrollHeight; }
  }, [activeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, isTyping]);

  /* Build items with date separators */
  const items: Array<{ type: "sep"; label: string } | { type: "msg"; idx: number }> = [];
  let lastDay = "";
  messages.forEach((msg, idx) => {
    const day = formatDay(msg.createdAt);
    if (day !== lastDay) { items.push({ type: "sep", label: day }); lastDay = day; }
    items.push({ type: "msg", idx });
  });

  return (
    <div 
      ref={scrollRef} 
      className={`flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-[2px] transition-colors duration-500 ${vanishMode ? "bg-black" : "bg-transparent"}`}
    >
      {/* Empty state */}
      {messages.length === 0 && !vanishMode && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
          <img src={otherUser?.avatarUrl} className="w-20 h-20 rounded-full ring-4 ring-white/10" alt="" />
          <div className="text-center">
            <p className="font-bold text-white text-[17px]">{otherUser?.displayName || otherUser?.username}</p>
            <p className="text-[#444] text-[13px] mt-1">قل مرحبا! 👋</p>
          </div>
        </div>
      )}

      {/* Vanish Mode Banner */}
      {vanishMode && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

      {items.map((item, key) => {
        if (item.type === "sep") return <DateSep key={`s${key}`} label={item.label} />;
        const idx = item.idx;
        const msg = messages[idx];
        const isOwn = msg.senderId === username;
        const prev = messages[idx - 1];
        const next = messages[idx + 1];
        const isFirst = !prev || prev.senderId !== msg.senderId;
        const isLast  = !next || next.senderId !== msg.senderId;

        /* Bubble shape for RTL */
        let br = "22px";
        if (isOwn) {
          if (!isFirst && !isLast) br = "4px 22px 22px 4px";       // Middle
          else if (!isFirst && isLast) br = "4px 22px 22px 22px";  // Bottom
          else if (isFirst && !isLast) br = "22px 22px 22px 4px";  // Top
        } else {
          if (!isFirst && !isLast) br = "22px 4px 4px 22px";       // Middle
          else if (!isFirst && isLast) br = "22px 4px 22px 22px";  // Bottom
          else if (isFirst && !isLast) br = "22px 22px 4px 22px";  // Top
        }

        return (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={isOwn}
            isFirstInGroup={isFirst}
            isLastInGroup={isLast}
            isLastOverall={idx === messages.length - 1}
            borderRadius={br}
            otherUser={otherUser}
            conversationId={activeId}
            allMessages={messages}
          />
        );
      })}

      {isTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
