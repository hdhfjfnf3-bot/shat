import { useState } from "react";
import { useChatStore } from "@/lib/store";
import { ChevronRight, Phone, Video, Info, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Thread } from "./Thread";
import { Composer } from "./Composer";
import { EmojiStylePicker } from "./EmojiStylePicker";
import { InfoPanel } from "./InfoPanel";

export function MainArea({ activeId }: { activeId: string | null }) {
  const [, setLocation] = useLocation();
  const { conversations } = useChatStore();
  const activeConv = activeId ? conversations[activeId] : null;
  const otherUser = activeConv?.participants[0];
  const [showInfo, setShowInfo] = useState(false);

  /* ── Empty state ─────────────────────────────────────────────── */
  if (!activeId || !activeConv) {
    return (
      <div className={`flex-1 flex-col bg-[#000] relative ${!activeId ? "hidden md:flex" : "flex"}`}>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-5">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-2 border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-sm">
              <MessageCircle className="w-10 h-10 text-white/70 stroke-[1.2]" />
            </div>
            <div
              className="absolute inset-0 rounded-full border-2 border-white/10 animate-ping"
              style={{ animationDuration: "2.5s" }}
            />
          </div>
          <div>
            <h2 className="text-[22px] font-semibold text-white mb-2">رسائلك</h2>
            <p className="text-[#555] text-[14px] max-w-[240px] leading-relaxed">
              أرسل رسائل خاصة إلى صديق أو ابدأ محادثة جديدة.
            </p>
          </div>
          <button
            className="mt-1 px-6 py-2.5 rounded-xl bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-[14px] transition-colors active:scale-95"
            onClick={() => setLocation("/")}
          >
            إرسال رسالة
          </button>
        </div>
      </div>
    );
  }

  /* ── Active conversation ─────────────────────────────────────── */
  return (
    <div className="flex-1 flex flex-col bg-[#000] relative h-full overflow-hidden">

      {/* Info Panel */}
      {showInfo && otherUser && (
        <InfoPanel
          user={otherUser}
          conversationId={activeId}
          onClose={() => setShowInfo(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-black/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          {/* Back (mobile) */}
          <button
            onClick={() => setLocation("/")}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ml-1"
          >
            <ChevronRight className="w-6 h-6 stroke-[1.5]" />
          </button>

          {/* Avatar + name — clickable to open InfoPanel */}
          <button
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            onClick={() => setShowInfo(true)}
          >
            <div className="relative">
              <img
                src={otherUser?.avatarUrl}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                alt={otherUser?.username}
              />
              {otherUser?.isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00d26a] rounded-full border-2 border-black" />
              )}
            </div>
            <div className="flex flex-col text-right">
              <div className="font-semibold text-[15px] text-white leading-tight">
                {otherUser?.displayName || otherUser?.username}
              </div>
              <div className="text-[12px] text-[#555] flex items-center gap-1.5">
                {otherUser?.isOnline ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-[#00d26a] inline-block" />نشط الآن</>
                ) : "نشط منذ 5 دقائق"}
              </div>
            </div>
          </button>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1 text-white">
          {([
            { Icon: Phone, label: "مكالمة صوتية" },
            { Icon: Video, label: "مكالمة فيديو" },
          ] as const).map(({ Icon, label }) => (
            <button
              key={label}
              aria-label={label}
              title={label}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <Icon className="w-5 h-5 stroke-[1.5]" />
            </button>
          ))}
          <EmojiStylePicker align="left" />
          <button
            aria-label="معلومات"
            title="معلومات"
            onClick={() => setShowInfo(true)}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${showInfo ? "bg-white/15 text-white" : "hover:bg-white/10"}`}
          >
            <Info className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>
      </div>

      <Thread activeId={activeId} />
      <Composer activeId={activeId} />
    </div>
  );
}