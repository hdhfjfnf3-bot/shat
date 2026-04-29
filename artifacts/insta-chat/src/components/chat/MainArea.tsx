import { useState, useEffect } from "react";
import { useChatStore } from "@/lib/store";
import { ChevronRight, Phone, Video, Info, MessageCircle, Mic } from "lucide-react";
import { useLocation } from "wouter";
import { Thread } from "./Thread";
import { Composer } from "./Composer";
import { EmojiStylePicker } from "./EmojiStylePicker";
import { InfoPanel } from "./InfoPanel";

function CallOverlay({ type, user, onEnd }: { type: "audio" | "video"; user: any; onEnd: () => void }) {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#111] overflow-hidden animate-in fade-in duration-300">
      {type === "video" ? (
        <div className="absolute inset-0 bg-gradient-to-b from-[#1877f2]/20 to-black opacity-60" />
      ) : (
        <div 
          className="absolute inset-0 opacity-30 bg-cover bg-center blur-3xl scale-110"
          style={{ backgroundImage: `url(${user.avatarUrl})` }}
        />
      )}
      
      <div className="absolute inset-0 flex flex-col items-center pt-24 z-10">
        <div className="relative mb-6">
          <img src={user.avatarUrl} className="w-32 h-32 rounded-full object-cover shadow-2xl z-10 relative" alt="" />
          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 tracking-wide drop-shadow-md">{user.displayName || user.username}</h2>
        <p className="text-white/70 text-[15px] font-medium drop-shadow">
          {type === "video" ? "مكالمة فيديو" : "مكالمة صوتية"}{dots}
        </p>
      </div>

      <div className="absolute bottom-16 left-0 right-0 flex justify-center items-center gap-6 z-10">
        <button className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center hover:bg-white/25 transition-colors active:scale-95 shadow-lg">
          <Mic className="w-6 h-6 text-white" />
        </button>
        {type === "video" && (
          <button className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center hover:bg-white/25 transition-colors active:scale-95 shadow-lg">
            <Video className="w-6 h-6 text-white" />
          </button>
        )}
        <button 
          onClick={onEnd}
          className="w-16 h-16 rounded-full bg-[#ed4956] flex items-center justify-center hover:bg-[#ed4956]/80 transition-colors active:scale-95 shadow-lg shadow-[#ed4956]/20"
        >
          <Phone className="w-7 h-7 text-white transform rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}

export function MainArea({ activeId }: { activeId: string | null }) {
  const [, setLocation] = useLocation();
  const { conversations } = useChatStore();
  const activeConv = activeId ? conversations[activeId] : null;
  const otherUser = activeConv?.participants[0];
  const isGroup = activeConv?.isGroup;
  const headerTitle = isGroup ? (activeConv.groupName || "مجموعة") : (otherUser?.displayName || otherUser?.username || "");
  const headerAvatar = isGroup ? `https://ui-avatars.com/api/?name=${encodeURIComponent(headerTitle)}&background=262626&color=fff` : otherUser?.avatarUrl;
  const [showInfo, setShowInfo] = useState(false);
  const [calling, setCalling] = useState<"audio" | "video" | null>(null);

  /* ── Empty state ─────────────────────────────────────────────── */
  if (!activeId || !activeConv) {
    return (
      <div className={`flex-1 flex-col bg-transparent relative z-10 ${!activeId ? "hidden md:flex" : "flex"}`}>
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
  const customBg = activeConv.bgImage;
  const customBgOpacity = activeConv.bgOpacity ?? 0.15;

  return (
    <div className="flex-1 flex flex-col bg-transparent relative h-full overflow-hidden z-10">

      {/* Custom Conversation Background */}
      {customBg && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-opacity duration-300"
          style={{ backgroundImage: `url(${customBg})`, opacity: customBgOpacity }}
        />
      )}

      {/* Call Overlay */}
      {calling && otherUser && (
        <CallOverlay type={calling} user={otherUser} onEnd={() => setCalling(null)} />
      )}

      {/* Info Panel */}
      {showInfo && otherUser && (
        <InfoPanel
          user={otherUser}
          conversationId={activeId}
          onClose={() => setShowInfo(false)}
        />
      )}

      {/* Header — Instagram Direct style */}
      <div className="flex items-center justify-between px-2 py-2.5 border-b border-white/[0.05] z-10 shrink-0" style={{ background: '#0c1018' }}>
        <div className="flex items-center gap-1">
          {/* Back (mobile) */}
          <button
            onClick={() => setLocation("/")}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
          >
            <ChevronRight className="w-6 h-6 stroke-[2]" />
          </button>

          {/* Avatar + name — clickable to open InfoPanel */}
          <button
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            onClick={() => setShowInfo(true)}
          >
            <div className="relative">
              <img
                src={headerAvatar}
                className="w-[40px] h-[40px] rounded-full object-cover ring-2 ring-transparent transition-all"
                alt={headerTitle}
              />
              {!isGroup && otherUser?.isOnline && (
                <div className="absolute bottom-0 right-0">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-[#00d26a] opacity-40 animate-ping" />
                  <span className="relative inline-flex w-[12px] h-[12px] bg-[#00d26a] rounded-full border-[2.5px] border-[#0a0a0a]" />
                </div>
              )}
            </div>
            <div className="flex flex-col items-start">
              <div className="font-semibold text-[15px] text-white leading-tight tracking-tight flex items-center gap-1.5">
                {headerTitle}
                {isGroup && <span className="bg-white/10 text-white/50 text-[10px] px-1.5 py-0.5 rounded-md">مجموعة</span>}
              </div>
              <div className="text-[12px] text-[#737373] mt-[1px]">
                {isGroup ? `${activeConv.participants.length} أعضاء` : (otherUser?.isOnline ? "نشط الآن" : "نشط منذ 5 دقائق")}
              </div>
            </div>
          </button>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-0.5 text-white">
          <button
            aria-label="مكالمة صوتية"
            onClick={() => setCalling("audio")}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <Phone className="w-[22px] h-[22px] stroke-[1.5]" />
          </button>
          <button
            aria-label="مكالمة فيديو"
            onClick={() => setCalling("video")}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <Video className="w-[22px] h-[22px] stroke-[1.5]" />
          </button>

          <EmojiStylePicker align="left" />
          <button
            aria-label="معلومات"
            onClick={() => setShowInfo(true)}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${showInfo ? "bg-white/15" : "hover:bg-white/10"}`}
          >
            <Info className="w-[22px] h-[22px] stroke-[1.5]" />
          </button>
        </div>
      </div>

      <Thread activeId={activeId} />
      <Composer activeId={activeId} />
    </div>
  );
}