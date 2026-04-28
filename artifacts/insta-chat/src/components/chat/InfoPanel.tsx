import { useState } from "react";
import { X, LogOut, BellOff, Trash2, UserX } from "lucide-react";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { useLocation } from "wouter";
import type { User } from "@/lib/types";

interface Props {
  user: User;
  conversationId: string;
  onClose: () => void;
}

export function InfoPanel({ user, conversationId, onClose }: Props) {
  const clearAuth = useMe((s) => s.clearAuth);
  const { clearAll, toggleMute, deleteConversation, conversations } = useChatStore();
  const [, setLocation] = useLocation();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const conv = conversations[conversationId];
  const isMuted = conv?.isMuted || false;

  const vanishModeOn = useChatStore((s) => s.vanishMode[conversationId] || false);

  const allMessages = useChatStore((s) => s.messages[conversationId] || []);
  const currentThemeMsg = [...allMessages].reverse().find(m => m.type === "theme");
  const currentTheme = currentThemeMsg?.content || "default";

  const themes = [
    { id: "default", name: "انستجرام الأساسي", colors: "from-[#3797f0] to-[#833ab4]" },
    { id: "monochrome", name: "وضع التخفي (أسود)", colors: "from-[#444444] to-[#111111]" },
    { id: "ocean", name: "أمواج المحيط", colors: "from-[#00c6ff] to-[#0072ff]" },
    { id: "love", name: "حب ورومانسية", colors: "from-[#ff0844] to-[#ffb199]" },
    { id: "cyberpunk", name: "سايبر بانك نيون", colors: "from-[#f000ff] to-[#00d4ff]" },
    { id: "forest", name: "غابة استوائية", colors: "from-[#11998e] to-[#38ef7d]" },
    { id: "halloween", name: "نار وهالوين", colors: "from-[#ff8c00] to-[#e52e71]" },
  ];

  const handleLogout = () => {
    clearAll();
    clearAuth();
    setLocation("/");
  };

  const changeTheme = (themeId: string) => {
    if (themeId !== currentTheme) {
      useChatStore.getState().sendMessage(conversationId, themeId, "theme");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed left-0 top-0 bottom-0 z-[160] w-full max-w-[320px] bg-[#0d0d0d] border-r border-white/[0.07] flex flex-col overflow-hidden"
        style={{ animation: "panelIn 0.22s cubic-bezier(.34,1.2,.64,1) both" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] shrink-0">
          <span className="font-semibold text-white text-[16px]">تفاصيل</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#737373] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User card */}
        <div className="flex flex-col items-center pt-8 pb-6 px-6 border-b border-white/[0.07]">
          <div className="relative mb-4">
            <img
              src={user.avatarUrl}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-white/10"
              alt={user.username}
            />
            {user.isOnline && (
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#00d26a] border-2 border-[#0d0d0d] ring-1 ring-[#00d26a]/40" />
            )}
          </div>
          <h2 className="text-white font-bold text-[20px] mb-0.5">
            {user.displayName || user.username}
          </h2>
          <p className="text-[#555] text-[13px]">@{user.username}</p>
          <div className="mt-3 px-3 py-1.5 rounded-full text-[12px] font-medium" style={{
            background: user.isOnline ? "rgba(0,210,106,0.12)" : "rgba(255,255,255,0.05)",
            color: user.isOnline ? "#00d26a" : "#737373",
          }}>
            {user.isOnline ? "● نشط الآن" : "غير متصل"}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3">
            {/* Themes Section */}
            <div className="text-[11px] uppercase tracking-widest text-[#444] font-semibold px-2 mb-2 text-right mt-4">
              ثيم المحادثة (لك ولصديقك)
            </div>
            <div className="flex flex-col gap-1 mb-4 px-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => changeTheme(theme.id)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${theme.colors} shadow-sm border border-white/10`} />
                    <span className={`text-[13px] font-medium ${currentTheme === theme.id ? "text-white" : "text-[#a8a8a8] group-hover:text-white"}`}>
                      {theme.name}
                    </span>
                  </div>
                  {currentTheme === theme.id && (
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-black" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Settings Section */}
            <div className="text-[11px] uppercase tracking-widest text-[#444] font-semibold px-2 mb-2 text-right border-t border-white/5 pt-4">
              إعدادات الخصوصية
            </div>

            <button
              onClick={() => {
                const next = !vanishModeOn;
                useChatStore.getState().setVanishMode(conversationId, next);
                useChatStore.getState().sendMessage(conversationId, next ? "on" : "off", "vanish_mode");
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group mb-4"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${vanishModeOn ? "bg-white text-black" : "bg-[#121212] border border-white/10 text-white"}`}>
                  <span className="text-[14px]">🤫</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className={`text-[13px] font-medium ${vanishModeOn ? "text-white" : "text-[#a8a8a8] group-hover:text-white"}`}>
                    وضع التدمير الذاتي (Vanish Mode)
                  </span>
                  <span className="text-[10px] text-[#737373]">الرسائل بتختفي بعد ما تخرج</span>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors flex ${vanishModeOn ? "bg-white justify-end" : "bg-[#262626] justify-start"}`}>
                <div className={`w-4 h-4 rounded-full shadow-sm ${vanishModeOn ? "bg-black" : "bg-[#737373]"}`} />
              </div>
            </button>

            <div className="text-[11px] uppercase tracking-widest text-[#444] font-semibold px-2 mb-2 text-right border-t border-white/5 pt-4">
              خيارات الدردشة
            </div>
            <ActionRow
              icon={<BellOff className="w-4 h-4" />}
              label={isMuted ? "إلغاء كتم الإشعارات" : "كتم الإشعارات"}
              onClick={() => toggleMute(conversationId)}
            />
            <ActionRow icon={<UserX className="w-4 h-4" />} label="حظر" destructive />

            {!confirmDelete ? (
              <ActionRow
                icon={<Trash2 className="w-4 h-4" />}
                label="حذف المحادثة"
                destructive
                onClick={() => setConfirmDelete(true)}
              />
            ) : (
              <div className="mx-2 p-3 rounded-xl bg-[#ed4956]/10 border border-[#ed4956]/25 mt-2 mb-2" style={{ animation: "fadeUp 0.15s ease-out" }}>
                <p className="text-[13px] text-[#ed4956] font-semibold mb-2">تأكيد الحذف نهائياً؟</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-1.5 rounded-lg bg-white/10 text-white text-[12px] font-semibold hover:bg-white/15 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      deleteConversation(conversationId);
                      setLocation("/");
                      onClose();
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-[#ed4956] text-white text-[12px] font-bold hover:bg-[#c0392b] transition-colors"
                  >
                    حذف
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-white/[0.06]">
            <div className="text-[11px] uppercase tracking-widest text-[#444] font-semibold px-2 mb-2 text-right">
              الحساب
            </div>

            {!confirmLogout ? (
              <button
                onClick={() => setConfirmLogout(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.05] text-right transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-[#ed4956]/15 flex items-center justify-center text-[#ed4956]">
                  <LogOut className="w-4 h-4 transform scale-x-[-1]" />
                </div>
                <span className="text-[14px] text-[#ed4956] font-medium">تسجيل الخروج</span>
              </button>
            ) : (
              <div className="mx-2 p-4 rounded-xl bg-[#ed4956]/10 border border-[#ed4956]/25" style={{ animation: "fadeUp 0.15s ease-out" }}>
                <p className="text-[13px] text-[#ed4956] font-semibold mb-1">تسجيل الخروج؟</p>
                <p className="text-[12px] text-[#737373] mb-3">ستحتاج إلى تسجيل الدخول مرة أخرى للوصول إلى رسائلك.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmLogout(false)}
                    className="flex-1 py-2 rounded-lg bg-white/10 text-white text-[13px] font-semibold hover:bg-white/15 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 py-2 rounded-lg bg-[#ed4956] text-white text-[13px] font-bold hover:bg-[#c0392b] transition-colors"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes panelIn {
          from { opacity: 0; transform: translateX(-100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

function ActionRow({ icon, label, destructive, onClick }: { icon: React.ReactNode; label: string; destructive?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.05] text-right transition-colors">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${destructive ? "bg-[#ed4956]/12 text-[#ed4956]" : "bg-white/8 text-[#a8a8a8]"}`}>
        {icon}
      </div>
      <span className={`text-[14px] ${destructive ? "text-[#ed4956]" : "text-[#fafafa]"}`}>{label}</span>
    </button>
  );
}