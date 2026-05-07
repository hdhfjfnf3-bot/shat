import { useState, useRef } from "react";
import { X, LogOut, BellOff, Trash2, UserX, Image as ImageIcon } from "lucide-react";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { useLocation } from "wouter";
import type { User } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

/* Stable empty array — prevents Zustand infinite loop from inline `?? []` */
const EMPTY_MSGS: import("@/lib/types").Message[] = [];

interface Props {
  user: User;
  conversationId: string;
  onClose: () => void;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } }
};

export function InfoPanel({ user, conversationId, onClose }: Props) {
  const clearAuth = useMe((s) => s.clearAuth);
  const { toggleMute, deleteConversation } = useChatStore();
  const [, setLocation] = useLocation();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conv = useChatStore((s) => s.conversations[conversationId]);
  const vanishModeOn = useChatStore((s) => s.vanishMode[conversationId] ?? false);
  const allMessages = useChatStore((s) => s.messages[conversationId] ?? EMPTY_MSGS);

  const isMuted = conv?.isMuted || false;
  const currentThemeMsg = allMessages.length > 0 ? [...allMessages].reverse().find(m => m.type === "theme") : undefined;
  const currentTheme = currentThemeMsg?.content || "default";

  const themes = [
    { id: "default", name: "انستجرام الأساسي", colors: "from-[#3797f0] to-[#833ab4]" },
    { id: "monochrome", name: "وضع التخفي (أسود)", colors: "from-[#444444] to-[#111111]" },
    { id: "ocean", name: "أمواج المحيط", colors: "from-[#00c6ff] to-[#0072ff]" },
    { id: "love", name: "حب ورومانسية", colors: "from-[#ff0844] to-[#ffb199]" },
    { id: "cyberpunk", name: "سايبر بانك نيون", colors: "from-[#f000ff] to-[#00d4ff]" },
    { id: "forest", name: "غابة استوائية", colors: "from-[#11998e] to-[#38ef7d]" },
    { id: "halloween", name: "نار وهالوين", colors: "from-[#ff8c00] to-[#e52e71]" },
    { id: "sunset", name: "غروب الشمس", colors: "from-[#fc4a1a] to-[#f7b733]" },
    { id: "aurora", name: "أضواء الشفق", colors: "from-[#00b09b] to-[#96c93d]" },
    { id: "royal", name: "ملكي فخم", colors: "from-[#141E30] to-[#243B55]" },
  ];

  const handleLogout = () => {
    useChatStore.getState().clearAll();
    clearAuth();
    setLocation("/");
  };

  const changeTheme = (themeId: string) => {
    if (themeId !== currentTheme) {
      useChatStore.getState().sendMessage(conversationId, themeId, "theme");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        useChatStore.getState().setConversationBackground(conversationId, ev.target.result as string, undefined);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
        animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="fixed inset-0 z-[150] bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "-100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "-100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
        className="fixed left-0 top-0 bottom-0 z-[160] w-full max-w-[340px] bg-black/70 backdrop-blur-3xl border-r border-white/10 flex flex-col overflow-hidden shadow-[40px_0_100px_rgba(0,0,0,0.8),inset_-1px_0_0_rgba(255,255,255,0.05)]"
      >
        {/* Subtle mesh background inside panel */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] shrink-0 relative z-10 bg-black/20 backdrop-blur-md">
          <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a8a8a8] text-[18px] tracking-wide drop-shadow-sm">معلومات المحادثة</span>
          <motion.button
            whileHover={{ scale: 1.15, rotate: 90, backgroundColor: "rgba(255,255,255,0.15)" }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#a8a8a8] hover:text-white transition-all shadow-sm border border-transparent hover:border-white/10"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Scrollable Content */}
        <motion.div 
          variants={staggerContainer} 
          initial="hidden" 
          animate="show" 
          className="flex-1 overflow-y-auto hide-scrollbar relative z-10"
        >
          {/* User/Group card */}
          <motion.div variants={fadeUp} className="flex flex-col items-center pt-10 pb-8 px-6 border-b border-white/[0.05] relative overflow-hidden">
            {/* Spotlight behind avatar */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-white/5 blur-[40px] rounded-full pointer-events-none" />
            
            <div className="relative mb-5 group cursor-pointer">
              <motion.img
                whileHover={{ scale: 1.05, rotateY: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                src={conv?.isGroup ? `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.groupName || "مجموعة")}&background=262626&color=fff` : user.avatarUrl}
                className="w-28 h-28 rounded-full object-cover ring-[4px] ring-white/10 group-hover:ring-white/30 transition-all shadow-[0_15px_35px_rgba(0,0,0,0.5)]"
                alt={conv?.isGroup ? conv.groupName : user.username}
              />
              {!conv?.isGroup && user.isOnline && (
                <motion.span 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-[#00d26a] border-[3px] border-black shadow-[0_0_15px_rgba(0,210,106,0.8)]" 
                />
              )}
            </div>
            <h2 className="text-white font-black text-[22px] mb-1 text-center drop-shadow-md tracking-wide">
              {conv?.isGroup ? conv.groupName : (user.displayName || user.username)}
            </h2>
            {!conv?.isGroup && <p className="text-[#a8a8a8] font-bold text-[14px]">@{user.username}</p>}
            
            {conv?.isGroup ? (
              <p className="text-white/50 text-[13px] mt-2 font-bold px-4 py-1 rounded-full bg-white/5 border border-white/5">{conv.participants.length} أعضاء</p>
            ) : (
              <motion.div 
                className="mt-4 px-4 py-1.5 rounded-full text-[12px] font-black shadow-inner border" 
                style={{
                  background: user.isOnline ? "rgba(0,210,106,0.1)" : "rgba(255,255,255,0.03)",
                  color: user.isOnline ? "#00d26a" : "#737373",
                  borderColor: user.isOnline ? "rgba(0,210,106,0.2)" : "rgba(255,255,255,0.05)",
                  boxShadow: user.isOnline ? "0 0 20px rgba(0,210,106,0.15)" : "none"
                }}
              >
                {user.isOnline ? "● نشط الآن" : "غير متصل"}
              </motion.div>
            )}
          </motion.div>

          <div className="px-5 py-5">
            {/* Themes Section */}
            <motion.div variants={fadeUp}>
              <div className="text-[11px] uppercase tracking-widest text-[#737373] font-black mb-3 text-right">
                ثيم المحادثة الفاخر
              </div>
              <div className="flex flex-col gap-1.5 mb-6">
                {themes.map((theme) => (
                  <motion.button
                    whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.05)", x: -4 }}
                    whileTap={{ scale: 0.98 }}
                    key={theme.id}
                    onClick={() => changeTheme(theme.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all group ${currentTheme === theme.id ? "bg-white/10 border-white/20 shadow-[0_5px_15px_rgba(0,0,0,0.3)]" : "bg-white/[0.02] border-white/[0.02]"}`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${theme.colors} shadow-md border border-white/30 group-hover:rotate-12 transition-transform`} />
                      <span className={`text-[14px] font-bold ${currentTheme === theme.id ? "text-white drop-shadow-sm" : "text-[#a8a8a8] group-hover:text-white"}`}>
                        {theme.name}
                      </span>
                    </div>
                    {currentTheme === theme.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="w-5 h-5 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] flex items-center justify-center"
                      >
                        <div className="w-2 h-2 rounded-full bg-black" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Custom Background Section */}
            <motion.div variants={fadeUp}>
              <div className="text-[11px] uppercase tracking-widest text-[#737373] font-black mb-3 text-right border-t border-white/[0.05] pt-5">
                خلفية مخصصة
              </div>
              <div className="mb-6">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-white/[0.05] to-transparent hover:from-white/10 border border-white/10 transition-colors group mb-3 shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white group-hover:bg-white/20 group-hover:scale-110 transition-all shadow-inner">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[14px] font-bold text-white transition-colors">
                      {conv?.bgImage ? "تغيير الخلفية" : "إضافة خلفية مخصصة"}
                    </span>
                  </div>
                </motion.button>

                <AnimatePresence>
                  {conv?.bgImage && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between text-[12px] text-[#a8a8a8] font-bold mb-3">
                          <span>شفافية الخلفية</span>
                          <span className="bg-white/10 px-2 py-0.5 rounded-md">{Math.round((conv.bgOpacity ?? 0.15) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={conv.bgOpacity ?? 0.15}
                          onChange={(e) => useChatStore.getState().setConversationBackground(conversationId, undefined, parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-300 transition-colors"
                        />
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => useChatStore.getState().setConversationBackground(conversationId, "", undefined)}
                            className="text-[12px] font-black text-[#ed4956] hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg bg-[#ed4956]/10 hover:bg-[#ed4956]/20"
                          >
                            إزالة الخلفية
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Settings Section */}
            <motion.div variants={fadeUp}>
              <div className="text-[11px] uppercase tracking-widest text-[#737373] font-black mb-3 text-right border-t border-white/[0.05] pt-5">
                الخصوصية والوضع السري
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const next = !vanishModeOn;
                  useChatStore.getState().setVanishMode(conversationId, next);
                  useChatStore.getState().sendMessage(conversationId, next ? "on" : "off", "vanish_mode");
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all group mb-6 border ${vanishModeOn ? "bg-white/10 border-white/20 shadow-[0_10px_30px_rgba(255,255,255,0.1)]" : "bg-black/40 hover:bg-black/60 border-white/10"}`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-inner ${vanishModeOn ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.6)] scale-110" : "bg-[#121212] border border-white/10 text-white"}`}>
                    <span className="text-[16px]">🤫</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`text-[14px] font-black ${vanishModeOn ? "text-white" : "text-[#a8a8a8] group-hover:text-white"}`}>
                      وضع التدمير الذاتي
                    </span>
                    <span className="text-[11px] text-[#737373] font-bold">الرسائل تختفي بعد الخروج</span>
                  </div>
                </div>
                {/* iOS Style Toggle */}
                <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 flex items-center ${vanishModeOn ? "bg-white" : "bg-[#333]"}`}>
                  <div className={`w-5 h-5 rounded-full shadow-md transition-transform duration-300 ${vanishModeOn ? "bg-black translate-x-5" : "bg-[#a8a8a8] translate-x-0"}`} />
                </div>
              </motion.button>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div className="text-[11px] uppercase tracking-widest text-[#737373] font-black mb-3 text-right border-t border-white/[0.05] pt-5">
                خيارات أخرى
              </div>
              
              <div className="flex flex-col gap-1.5">
                <ActionRow
                  icon={<BellOff className="w-4 h-4" />}
                  label={isMuted ? "إلغاء كتم الإشعارات" : "كتم الإشعارات"}
                  onClick={() => toggleMute(conversationId)}
                />
                <ActionRow icon={<UserX className="w-4 h-4" />} label="حظر المستخدم" destructive />

                <AnimatePresence mode="popLayout">
                  {!confirmDelete ? (
                    <motion.div key="deleteBtn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <ActionRow
                        icon={<Trash2 className="w-4 h-4" />}
                        label="حذف المحادثة نهائياً"
                        destructive
                        onClick={() => setConfirmDelete(true)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="deleteConfirm"
                      initial={{ opacity: 0, height: 0, scale: 0.9 }} 
                      animate={{ opacity: 1, height: "auto", scale: 1 }} 
                      exit={{ opacity: 0, height: 0, scale: 0.9 }}
                      className="p-4 rounded-2xl bg-[#ed4956]/10 border border-[#ed4956]/30 mt-2 mb-2 shadow-[0_15px_30px_rgba(237,73,86,0.15)] backdrop-blur-md"
                    >
                      <p className="text-[14px] text-[#ed4956] font-black mb-4 text-center">هل أنت متأكد من الحذف؟</p>
                      <div className="flex gap-3">
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-[13px] font-bold hover:bg-white/20 transition-colors">إلغاء</motion.button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { deleteConversation(conversationId); setLocation("/"); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-[#ed4956] text-white text-[13px] font-bold shadow-[0_0_20px_rgba(237,73,86,0.4)]">تأكيد الحذف</motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          <motion.div variants={fadeUp} className="px-5 py-6 border-t border-white/[0.05] bg-black/40 mt-4 backdrop-blur-md relative">
            <div className="text-[11px] uppercase tracking-widest text-[#737373] font-black mb-3 text-right">
              الحساب الخاص بك
            </div>

            <AnimatePresence mode="popLayout">
              {!confirmLogout ? (
                <motion.button
                  key="logoutBtn"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setConfirmLogout(true)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.02] transition-colors group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-[#ed4956]/15 flex items-center justify-center text-[#ed4956] shadow-inner group-hover:bg-[#ed4956]/25 group-hover:scale-110 transition-all border border-[#ed4956]/20">
                      <LogOut className="w-4 h-4 transform scale-x-[-1] translate-x-[1px]" />
                    </div>
                    <span className="text-[14px] text-[#ed4956] font-black tracking-wide">تسجيل الخروج</span>
                  </div>
                </motion.button>
              ) : (
                <motion.div 
                  key="logoutConfirm"
                  initial={{ opacity: 0, height: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, height: "auto", scale: 1 }} 
                  exit={{ opacity: 0, height: 0, scale: 0.9 }}
                  className="p-5 rounded-2xl bg-[#ed4956]/10 border border-[#ed4956]/30 shadow-[0_15px_30px_rgba(237,73,86,0.15)] backdrop-blur-md"
                >
                  <p className="text-[15px] text-[#ed4956] font-black mb-2">تسجيل الخروج؟</p>
                  <p className="text-[12px] text-[#a8a8a8] mb-5 font-bold leading-relaxed">ستحتاج إلى تسجيل الدخول مرة أخرى للوصول إلى رسائلك ومحادثاتك.</p>
                  <div className="flex gap-3">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setConfirmLogout(false)} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-[13px] font-bold hover:bg-white/20 transition-colors">تراجع</motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout} className="flex-1 py-2.5 rounded-xl bg-[#ed4956] text-white text-[13px] font-bold shadow-[0_0_20px_rgba(237,73,86,0.4)]">خروج</motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}

function ActionRow({ icon, label, destructive, onClick }: { icon: React.ReactNode; label: string; destructive?: boolean; onClick?: () => void }) {
  return (
    <motion.button 
      whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.06)", x: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick} 
      className="w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl bg-transparent text-right transition-all border border-transparent hover:border-white/5"
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-inner ${destructive ? "bg-[#ed4956]/15 text-[#ed4956] border border-[#ed4956]/20" : "bg-black/40 text-white border border-white/10"}`}>
        {icon}
      </div>
      <span className={`text-[14px] font-bold ${destructive ? "text-[#ed4956]" : "text-[#eaeaea]"}`}>{label}</span>
    </motion.button>
  );
}