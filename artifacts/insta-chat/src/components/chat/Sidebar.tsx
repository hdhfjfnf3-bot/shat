import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Search, Check, X, UserX, Loader2, ArrowLeft, LogOut, MessageSquarePlus, Gamepad2, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { useChatStore } from "@/lib/store";
import { useMe } from "@/lib/me";
import { useEmojiStyle, EMOJI_STYLE_OPTIONS } from "@/lib/emojiStyle";
import { EmojiText } from "./EmojiText";
import { checkUserExists } from "@/lib/auth";
import { CURRENT_USER } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "@/hooks/use-lenis";

/* ── debounce ───────────────────────────────────────────────────── */
function debounce<T extends (...a: any[]) => any>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout>;
  return ((...a: any[]) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }) as T;
}

type CheckState = "idle" | "loading" | "found" | "notfound" | "error";

/* ── Animation Variants ─────────────────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } }
};

/* ── Sidebar Item (Memoized for 120 FPS performance) ────────────── */
const SidebarItem = React.memo(({ conv, isActive, onClick }: any) => {
  const isUnread = conv.unreadCount > 0;
  const title = conv.isGroup ? (conv.groupName || "مجموعة") : (conv.participants[0]?.displayName || conv.participants[0]?.username || "مستخدم");
  const avatar = conv.isGroup ? `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=262626&color=fff` : conv.participants[0]?.avatarUrl;
  const isOnline = !conv.isGroup && conv.participants[0]?.isOnline;

  return (
    <motion.button 
      variants={itemVariants}
      className={`relative flex items-center px-6 py-4 w-full text-right transition-all group ${isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.03]"}`}
      onClick={onClick}
    >
      {/* Active Indicator & Background Glow */}
      {isActive && (
        <>
          <div className="absolute right-0 top-[10%] bottom-[10%] w-1 bg-[#007aff] rounded-l-full shadow-[0_0_15px_rgba(0,122,255,0.8)]" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#007aff]/5 to-transparent pointer-events-none" />
        </>
      )}
      
      <div className="relative shrink-0 ml-4 group-hover:scale-105 transition-transform duration-300">
        <img src={avatar} alt="" className={`w-[56px] h-[56px] rounded-full object-cover shadow-[0_5px_15px_rgba(0,0,0,0.5)] border ${isActive ? 'border-[#007aff]/30' : 'border-white/5'}`} />
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#00d26a] border-[2px] border-black rounded-full shadow-[0_0_10px_rgba(0,210,106,0.6)]" />
        )}
      </div>
      
      <div className="flex-1 min-w-0 text-right">
        <div className="flex justify-between items-baseline mb-1">
          <div className={`text-[16px] tracking-tight truncate flex items-center gap-2 ${isUnread ? "font-black text-white drop-shadow-sm" : (isActive ? "text-white font-black" : "text-[#eaeaea] font-bold")}`}>
            {title}
            {conv.isGroup && <span className="bg-white/10 text-white/80 text-[10px] px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-wider font-black">Group</span>}
          </div>
          {conv.lastMessage?.createdAt && (
            <span className={`text-[11px] font-bold shrink-0 mr-2 ${isUnread ? "text-[#007aff]" : "text-[#737373]"}`}>
              {new Date(conv.lastMessage.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div className={`text-[14px] truncate flex items-center justify-between ${isUnread ? "text-white font-black" : "text-[#888] font-medium group-hover:text-[#aaa] transition-colors"}`}>
          <span className="truncate">
            {conv.lastMessage
              ? conv.lastMessage.type === "voice" ? "🎤 رسالة صوتية"
                : conv.lastMessage.type === "game" ? <><Gamepad2 className="w-3.5 h-3.5 inline mr-1 mb-0.5"/> دعوة للعب</>
                : <EmojiText text={conv.lastMessage.content} size={14} disableJumbo />
              : "اضغط للبدء بالدردشة"}
          </span>
          {isUnread && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 rounded-full bg-[#007aff] text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,122,255,0.5)]">
              {conv.unreadCount > 9 ? "+9" : conv.unreadCount}
            </motion.div>
          )}
        </div>
      </div>
    </motion.button>
  );
});

/* ═══════════════════════════════════════════════════════════════ */
export function Sidebar({ activeId }: { activeId: string | null }) {
  const [, setLocation] = useLocation();
  const conversations = useChatStore((s) => s.conversations);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const createConversation = useChatStore((s) => s.createConversation);
  const clearAll = useChatStore((s) => s.clearAll);
  const { style, setStyle } = useEmojiStyle();
  const username  = useMe((s) => s.username);
  const clearAuth = useMe((s) => s.clearAuth);
  const messagesStore = useChatStore((s) => s.messages);

  const eligibleFriends = useMemo(() => {
    const friends = new Set<string>();
    Object.values(conversations).forEach(conv => {
      if (!conv.isGroup && conv.participants.length > 0) {
        const otherUser = conv.participants[0].username;
        const msgs = messagesStore[conv.id] || [];
        const iSent = msgs.some(m => m.senderId === CURRENT_USER.id);
        const theySent = msgs.some(m => m.senderId !== CURRENT_USER.id);
        if (iSent && theySent) friends.add(otherUser);
      }
    });
    return Array.from(friends);
  }, [conversations, messagesStore]);

  /* State */
  const [openEmoji,   setOpenEmoji]   = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newName,     setNewName]     = useState("");
  const [search,      setSearch]      = useState("");
  const [checkState,  setCheckState]  = useState<CheckState>("idle");
  const [foundUser,   setFoundUser]   = useState<string | null>(null);

  /* Group Chat State */
  const [chatMode,    setChatMode]    = useState<"single" | "group">("single");
  const [groupName,   setGroupName]   = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);

  const emojiRef  = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  useLenis(listRef);

  /* Logout */
  const handleLogout = () => { clearAll(); clearAuth(); setLocation("/"); };

  /* Check user exists */
  const checkUser = useCallback(
    debounce(async (name: string) => {
      const clean = name.trim().toLowerCase().replace(/^@/, "");
      if (!clean || clean.length < 2) { setCheckState("idle"); return; }
      if (clean === username?.toLowerCase()) { setCheckState("notfound"); return; }
      setCheckState("loading");
      try {
        const result = await checkUserExists(clean);
        setCheckState(result.exists ? "found" : "notfound");
        setFoundUser(result.exists ? result.username : null);
      } catch { setCheckState("error"); }
    }, 450),
    [username]
  );

  useEffect(() => { checkUser(newName); }, [newName, checkUser]);

  const handleCreate = () => {
    if (chatMode === "single") {
      if (checkState !== "found" || !foundUser) return;
      const id = createConversation(foundUser);
      if (id) { setActiveConversation(id); setLocation(`/${id}`); }
      closeModal();
    } else {
      if (!groupName.trim() || groupMembers.length === 0) return;
      const { createGroupConversation } = useChatStore.getState();
      const id = createGroupConversation(groupName.trim(), groupMembers);
      if (id) { setActiveConversation(id); setLocation(`/${id}`); }
      closeModal();
    }
  };
  const closeModal = () => { setShowNewChat(false); setNewName(""); setCheckState("idle"); setFoundUser(null); setChatMode("single"); setGroupName(""); setGroupMembers([]); };
  
  /* Emoji picker outside click */
  useEffect(() => {
    if (!openEmoji) return;
    const fn = (e: MouseEvent) => { if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setOpenEmoji(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [openEmoji]);

  /* Focus on open */
  useEffect(() => { if (showNewChat) setTimeout(() => inputRef.current?.focus(), 60); }, [showNewChat]);

  /* Filtered sorted conversations */
  const convList = Object.values(conversations)
    .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
    .filter((c) => {
      if (!search) return true;
      if (c.isGroup) return (c.groupName || "").toLowerCase().includes(search.toLowerCase());
      const p = c.participants[0];
      return p?.username.toLowerCase().includes(search.toLowerCase()) || (p?.displayName || "").includes(search);
    });

  /* Status badge */
  const Badge = () => {
    if (checkState === "loading")  return <Loader2 className="w-4 h-4 animate-spin text-[#a8a8a8]" />;
    if (checkState === "found")    return <span className="text-[#00d26a] text-[12px] font-bold flex items-center gap-1 drop-shadow-[0_0_8px_rgba(0,210,106,0.8)]"><Check className="w-3.5 h-3.5" />موجود</span>;
    if (checkState === "notfound") return <span className="text-[#ed4956] text-[12px] font-bold flex items-center gap-1 drop-shadow-[0_0_8px_rgba(237,73,86,0.8)]"><UserX className="w-3.5 h-3.5" />غير موجود</span>;
    if (checkState === "error")    return <span className="text-[#ed4956] text-[12px] font-bold">خطأ</span>;
    return null;
  };

  /* ─────────────────────────────────────────────────────────── */
  return (
    <>
      <div className={`w-full md:w-[380px] flex flex-col border-l border-white/[0.05] shrink-0 z-20 bg-[#0a0a0c] shadow-[20px_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden ${activeId ? "hidden md:flex" : "flex"}`}>
        
        {/* Ambient background glow */}
        <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(147,51,234,0.15),transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.15),transparent_70%)] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-8 pb-5 relative z-10">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            className="text-[24px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 flex items-center gap-2 drop-shadow-md"
          >
            {username || "رسائل"}
          </motion.button>
          
          <div className="flex items-center gap-2" ref={emojiRef}>
            {/* Settings/Emoji Style */}
            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)", rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setOpenEmoji((s) => !s)} 
                className="w-10 h-10 flex items-center justify-center rounded-full transition-all text-[#a8a8a8] hover:text-white border border-transparent hover:border-white/10"
              >
                <Settings className="w-[20px] h-[20px] stroke-[2.5]" />
              </motion.button>
              <AnimatePresence>
                {openEmoji && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="absolute left-0 top-12 z-50 w-[240px] bg-[#0a0a0c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden"
                  >
                    <div className="px-5 pt-4 pb-2 text-[11px] uppercase tracking-widest text-[#737373] font-black border-b border-white/5">تخصيص الإيموجي</div>
                    <div className="py-2">
                      {EMOJI_STYLE_OPTIONS.map((opt) => (
                        <button key={opt.key} onClick={() => { setStyle(opt.key); setOpenEmoji(false); }}
                          className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.06] text-[14px] text-right text-white font-bold transition-all group">
                          <span className="group-hover:translate-x-[-4px] transition-transform">{opt.label}</span>
                          {style === opt.key && <Check className="w-4 h-4 text-[#007aff] drop-shadow-[0_0_8px_rgba(0,122,255,0.8)]" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* New chat */}
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: "rgba(0,122,255,0.1)" }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowNewChat(true)} 
              className="w-10 h-10 flex items-center justify-center rounded-full transition-all text-[#007aff] hover:text-[#3395ff] border border-transparent hover:border-[#007aff]/20"
            >
              <MessageSquarePlus className="w-[20px] h-[20px] stroke-[2.5]" />
            </motion.button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 mb-5 relative z-10">
          <div className="bg-black/40 border border-white/10 rounded-[18px] flex items-center px-4 py-3.5 gap-3 text-[#a8a8a8] focus-within:bg-white/[0.05] focus-within:border-white/20 focus-within:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all relative overflow-hidden group">
            {/* Subtle highlight gradient that follows focus */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-focus-within:animate-[shimmer_2s_infinite]" />
            <Search className="w-5 h-5 shrink-0 text-[#737373] group-focus-within:text-white transition-colors relative z-10" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن محادثة..." className="bg-transparent outline-none flex-1 placeholder:text-[#555] text-[15px] text-white font-bold tracking-wide relative z-10" />
            {search && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSearch("")} className="relative z-10">
                <X className="w-4 h-4 bg-white/20 text-white rounded-full p-[2px] hover:bg-white/40 transition-colors" />
              </motion.button>
            )}
          </div>
        </div>

        {/* List — Lenis smooth scroll at 120 FPS */}
        <div ref={listRef} className="flex-1 overflow-y-auto pt-1 pb-4 hide-scrollbar relative z-10">
          {convList.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring" }}
              className="flex flex-col items-center justify-center h-[70%] gap-5 text-[#737373] px-8 text-center"
            >
              {search ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                    <UserX className="w-10 h-10 text-[#555]" />
                  </div>
                  <p className="text-[16px] font-bold">لم نعثر على "<span className="text-white drop-shadow-md">{search}</span>"</p>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(0,122,255,0.1)] relative">
                    <MessageSquarePlus className="w-10 h-10 text-white/50" />
                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute inset-0 rounded-full border border-[#007aff]/30" />
                  </div>
                  <p className="text-[15px] font-black text-[#a8a8a8] leading-relaxed">تواصل مع أصدقائك وابدأ الدردشة الآن.</p>
                  <motion.button 
                    whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setShowNewChat(true)} 
                    className="mt-3 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#007aff] to-[#0056b3] text-white text-[15px] font-black shadow-[0_10px_25px_rgba(0,122,255,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all"
                  >
                    محادثة جديدة
                  </motion.button>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show">
              <AnimatePresence>
                {convList.map((conv) => (
                  <SidebarItem 
                    key={conv.id} 
                    conv={conv} 
                    isActive={activeId === conv.id} 
                    onClick={() => { setActiveConversation(conv.id); setLocation(`/${conv.id}`); }} 
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── New Chat Modal (God-Mode) ──────────────────────────────────────── */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 perspective-[1000px]" 
            onClick={closeModal}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, rotateX: 20, y: 30 }} 
              animate={{ scale: 1, opacity: 1, rotateX: 0, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, rotateX: -20, y: 30 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-[#0f0f13] border border-white/10 rounded-[32px] w-full max-w-[440px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Inner Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-1 bg-gradient-to-r from-transparent via-[#007aff]/50 to-transparent" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-[radial-gradient(ellipse_at_center,rgba(0,122,255,0.2),transparent_70%)] pointer-events-none" />

              {/* Modal header */}
              <div className="relative flex items-center justify-center px-6 py-6 border-b border-white/[0.05] z-10">
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 text-[18px] tracking-wide drop-shadow-md">بدء محادثة جديدة</span>
                <motion.button whileHover={{ scale: 1.15, rotate: 90, backgroundColor: "rgba(255,255,255,0.1)" }} whileTap={{ scale: 0.9 }} onClick={closeModal} className="absolute left-4 w-10 h-10 flex items-center justify-center rounded-full transition-all text-[#a8a8a8] hover:text-white border border-transparent hover:border-white/10">
                  <X className="w-5 h-5 stroke-[2.5]" />
                </motion.button>
              </div>

              {/* Tabs for Mode */}
              <div className="flex border-b border-white/[0.05] bg-black/20 relative z-10">
                <button
                  onClick={() => setChatMode("single")}
                  className={`flex-1 py-4 text-[15px] font-black transition-all relative ${chatMode === "single" ? "text-white" : "text-[#737373] hover:text-[#a8a8a8]"}`}
                >
                  صديق واحد
                  {chatMode === "single" && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#007aff] shadow-[0_-2px_15px_rgba(0,122,255,0.8)]" />}
                </button>
                <button
                  onClick={() => setChatMode("group")}
                  className={`flex-1 py-4 text-[15px] font-black transition-all relative ${chatMode === "group" ? "text-white" : "text-[#737373] hover:text-[#a8a8a8]"}`}
                >
                  مجموعة
                  {chatMode === "group" && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#007aff] shadow-[0_-2px_15px_rgba(0,122,255,0.8)]" />}
                </button>
              </div>

              {/* Input Area */}
              <div className="px-6 pt-8 pb-6 min-h-[220px] relative z-10">
                {chatMode === "group" ? (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="mb-8">
                      <label className="text-[11px] text-[#007aff] font-black uppercase tracking-widest block mb-3 drop-shadow-[0_0_5px_rgba(0,122,255,0.3)]">اسم المجموعة</label>
                      <div className="border-b-2 border-white/10 focus-within:border-[#007aff] pb-3 transition-colors relative">
                        <input value={groupName} onChange={(e) => setGroupName(e.target.value)}
                          placeholder="اكتب اسم المجموعة المميز..."
                          className="bg-transparent outline-none text-white text-[18px] w-full font-black placeholder:text-[#444] placeholder:font-bold"
                        />
                      </div>
                    </div>

                    <label className="text-[11px] text-[#737373] font-black uppercase tracking-widest block mb-4">
                      إضافة أعضاء <span className="text-white/50 bg-white/10 px-2 py-0.5 rounded-md ml-2">{groupMembers.length}/20</span>
                    </label>
                    
                    {eligibleFriends.length === 0 ? (
                      <div className="text-[14px] text-[#a8a8a8] bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center leading-relaxed font-bold shadow-inner">
                        لا يوجد أصدقاء مؤهلين 😔<br/>
                        <span className="text-[12px] text-[#737373] mt-3 block font-medium">يجب أن تتواصل مع شخص في محادثة فردية ويرد عليك أولاً لتتمكن من إضافته لمجموعة.</span>
                      </div>
                    ) : (
                      <div className="max-h-[240px] overflow-y-auto space-y-2 pr-2 hide-scrollbar">
                        {eligibleFriends.map(friend => {
                          const isSelected = groupMembers.includes(friend);
                          return (
                            <motion.button 
                              whileHover={{ scale: 1.01, x: -2 }} whileTap={{ scale: 0.98 }}
                              key={friend}
                              onClick={() => {
                                if (isSelected) setGroupMembers(prev => prev.filter(x => x !== friend));
                                else if (groupMembers.length < 20) setGroupMembers(prev => [...prev, friend]);
                              }}
                              className={`flex items-center justify-between w-full p-3.5 rounded-2xl transition-all border ${isSelected ? "bg-[#007aff]/15 border-[#007aff]/40 shadow-[0_0_15px_rgba(0,122,255,0.1)]" : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.08]"}`}
                            >
                              <div className="flex items-center gap-3.5">
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(friend)}&background=random&color=fff&size=150`} className="w-11 h-11 rounded-full shadow-md" alt="" />
                                <span className={`text-[16px] font-black ${isSelected ? "text-white" : "text-[#eaeaea]"}`}>{friend}</span>
                              </div>
                              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shadow-inner ${isSelected ? "bg-[#007aff] border-[#007aff]" : "border-white/10 bg-black/40"}`}>
                                {isSelected && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <label className="text-[11px] text-[#007aff] font-black uppercase tracking-widest block mb-4 drop-shadow-[0_0_5px_rgba(0,122,255,0.3)]">البحث باستخدام الـ Username</label>
                    
                    <div className={`flex items-center gap-3 border-b-2 pb-4 transition-all ${
                      checkState === "found" ? "border-[#00d26a] shadow-[0_10px_20px_-10px_rgba(0,210,106,0.3)]" : checkState === "notfound" ? "border-[#ed4956] shadow-[0_10px_20px_-10px_rgba(237,73,86,0.3)]" : "border-white/10 focus-within:border-[#007aff]"}`}>
                      <span className="text-[#737373] font-black text-[22px]">@</span>
                      <input ref={inputRef} value={newName} onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { 
                          if (e.key === "Enter") handleCreate();
                          if (e.key === "Escape") closeModal(); 
                        }}
                        placeholder="username"
                        className="bg-transparent outline-none text-white text-[20px] font-black tracking-wide flex-1 placeholder:text-[#333]"
                        autoComplete="off" spellCheck={false} dir="ltr" />
                      <Badge />
                    </div>

                    {/* Not found error */}
                    <AnimatePresence>
                      {checkState === "notfound" && newName.trim().length >= 2 && (
                        <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="mt-6 flex items-start gap-4 bg-[#ed4956]/10 border border-[#ed4956]/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(237,73,86,0.1)]">
                          <div className="w-10 h-10 rounded-full bg-[#ed4956]/20 flex items-center justify-center shrink-0 border border-[#ed4956]/20">
                            <UserX className="w-5 h-5 text-[#ed4956]" />
                          </div>
                          <div>
                            <p className="text-[15px] text-[#ed4956] font-black tracking-wide mb-1">المستخدم غير موجود</p>
                            <p className="text-[12px] text-[#a8a8a8] font-bold leading-relaxed">تحقق من كتابة الاسم بشكل صحيح، أو أن المستخدم قام بتسجيل الدخول.</p>
                          </div>
                        </motion.div>
                      )}

                      {/* Found user card */}
                      {checkState === "found" && foundUser && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-6 flex items-center justify-between bg-gradient-to-r from-[#00d26a]/20 to-[#00d26a]/5 border border-[#00d26a]/40 rounded-2xl p-5 shadow-[0_10px_30px_rgba(0,210,106,0.15)] relative overflow-hidden">
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#00d26a] shadow-[0_0_15px_rgba(0,210,106,1)]" />
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(foundUser)}&background=random&color=fff&size=150`} className="w-14 h-14 rounded-full ring-4 ring-[#00d26a]/40 shadow-lg" alt="" />
                              <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#00d26a] border-[2px] border-[#0a0a0c] rounded-full" />
                            </div>
                            <div>
                              <p className="text-[18px] text-white font-black tracking-wide drop-shadow-md">{foundUser}</p>
                              <p className="text-[13px] text-[#00d26a] font-black mt-0.5 flex items-center gap-1.5"><Check className="w-4 h-4 stroke-[3]"/> جاهز لبدء الدردشة</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>

              {/* CTA */}
              <div className="px-6 pb-6 pt-2 bg-gradient-to-t from-black/60 to-transparent relative z-10">
                <motion.button 
                  whileHover={(chatMode === "single" ? checkState === "found" : (groupMembers.length > 0 && groupName.trim())) ? { scale: 1.02, y: -2 } : {}}
                  whileTap={(chatMode === "single" ? checkState === "found" : (groupMembers.length > 0 && groupName.trim())) ? { scale: 0.98 } : {}}
                  onClick={handleCreate} 
                  disabled={chatMode === "single" ? checkState !== "found" : (groupMembers.length === 0 || !groupName.trim())}
                  className="w-full py-4.5 rounded-2xl text-white font-black text-[16px] tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:scale-100 shadow-[0_10px_30px_rgba(0,122,255,0.3)] relative overflow-hidden group"
                  style={{ background: (chatMode === "single" && checkState === "found") || (chatMode === "group" && groupMembers.length > 0 && groupName.trim()) ? "linear-gradient(135deg, #007aff, #0056b3)" : "#222" }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {chatMode === "single" ? "ابدأ المحادثة الآن" : "إنشاء المجموعة الفاخرة"} <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                  </span>
                  {(chatMode === "single" && checkState === "found" || chatMode === "group" && groupMembers.length > 0 && groupName.trim()) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}