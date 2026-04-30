import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Search, Edit, Smile, Check, X, UserX, Loader2, ArrowLeft, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useChatStore } from "@/lib/store";
import { useMe } from "@/lib/me";
import { useEmojiStyle, EMOJI_STYLE_OPTIONS } from "@/lib/emojiStyle";
import { EmojiText } from "./EmojiText";
import { checkUserExists } from "@/lib/auth";
import { CURRENT_USER } from "@/lib/types";

/* ── debounce ───────────────────────────────────────────────────── */
function debounce<T extends (...a: any[]) => any>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout>;
  return ((...a: any[]) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }) as T;
}

type CheckState = "idle" | "loading" | "found" | "notfound" | "error";

/* ═══════════════════════════════════════════════════════════════ */
export function Sidebar({ activeId }: { activeId: string | null }) {
  const [, setLocation] = useLocation();
  const { conversations, setActiveConversation, createConversation, clearAll } = useChatStore();
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

  /* Logout */
  const handleLogout = () => { clearAll(); clearAuth(); setLocation("/"); };

  /* Check user exists — direct Supabase query, no RPC functions needed */
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
  
  const handleAddMember = () => {}; // Replaced by direct inline toggle

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
    if (checkState === "loading")  return <Loader2 className="w-4 h-4 animate-spin text-[#737373]" />;
    if (checkState === "found")    return <span className="text-[#00d26a] text-[12px] font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" />موجود</span>;
    if (checkState === "notfound") return <span className="text-[#ed4956] text-[12px] font-semibold flex items-center gap-1"><UserX className="w-3.5 h-3.5" />غير موجود</span>;
    if (checkState === "error")    return <span className="text-[#ed4956] text-[12px]">خطأ</span>;
    return null;
  };

  /* ─────────────────────────────────────────────────────────── */
  return (
    <>
      <div className={`w-full md:w-[360px] flex flex-col border-l border-white/[0.05] shrink-0 z-10 glass-panel ${activeId ? "hidden md:flex" : "flex"}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-8 pb-3">
          <button className="text-[18px] font-bold tracking-tight text-white flex items-center gap-1 hover:opacity-70 transition-opacity">
            {username || "رسائل"}
          </button>
          <div className="flex items-center gap-1" ref={emojiRef}>
            {/* Emoji style */}
            <div className="relative">
              <button onClick={() => setOpenEmoji((s) => !s)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white">
                <Smile className="w-[22px] h-[22px] stroke-[1.5]" />
              </button>
              {openEmoji && (
                <div className="absolute left-0 top-11 z-50 w-[210px] bg-[#1c1c1c] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
                  style={{ animation: "bubblePop .15s cubic-bezier(.34,1.3,.64,1) both" }}>
                  <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-widest text-[#555] font-semibold">نمط الإيموجي</div>
                  {EMOJI_STYLE_OPTIONS.map((opt) => (
                    <button key={opt.key} onClick={() => { setStyle(opt.key); setOpenEmoji(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.06] text-[14px] text-right text-[#fafafa] transition-colors">
                      <span>{opt.label}</span>
                      {style === opt.key && <Check className="w-4 h-4 text-[#0095f6]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* New chat */}
            <button onClick={() => setShowNewChat(true)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white">
              <Edit className="w-[22px] h-[22px] stroke-[1.5]" />
            </button>

            {/* Logout */}
            <button onClick={handleLogout} title="تسجيل الخروج"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#ed4956]/15 hover:text-[#ed4956] transition-colors text-[#444]">
              <LogOut className="w-[19px] h-[19px] stroke-[1.5]" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 mb-4">
          <div className="bg-[#262626] rounded-2xl flex items-center px-4 py-2.5 gap-2.5 text-[#a8a8a8] focus-within:bg-[#333] transition-colors">
            <Search className="w-4 h-4 shrink-0 text-[#888]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث" className="bg-transparent outline-none flex-1 placeholder:text-[#888] text-[15px] text-white font-medium" />
            {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 bg-[#a8a8a8] text-[#262626] rounded-full p-[1px]" /></button>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 mb-1">
          <button className="pb-3 text-[15px] font-bold text-white border-b-2 border-white">الرسائل</button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto pt-2 pb-4">
          {convList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[#444] px-6 text-center">
              {search ? (
                <><UserX className="w-10 h-10" /><p className="text-[14px]">لا توجد نتائج لـ "<span className="text-[#737373]">{search}</span>"</p></>
              ) : (
                <><Edit className="w-10 h-10" /><p className="text-[14px] text-[#737373]">ابدأ محادثة جديدة</p>
                <button onClick={() => setShowNewChat(true)} className="mt-2 px-6 py-2.5 rounded-xl bg-[#0095f6] text-white text-[14px] font-semibold hover:bg-[#1877f2] transition-colors">
                  رسالة جديدة
                </button></>
              )}
            </div>
          ) : (
            convList.map((conv) => {
              const isActive = activeId === conv.id;
              const isUnread = conv.unreadCount > 0;
              const title = conv.isGroup ? (conv.groupName || "مجموعة") : (conv.participants[0]?.displayName || conv.participants[0]?.username || "مستخدم");
              const avatar = conv.isGroup ? `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=262626&color=fff` : conv.participants[0]?.avatarUrl;
              const isOnline = !conv.isGroup && conv.participants[0]?.isOnline;

              return (
                <button key={conv.id}
                  className={`flex items-center px-5 py-3 gap-3.5 w-full text-right transition-colors ${isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"}`}
                  onClick={() => { setActiveConversation(conv.id); setLocation(`/${conv.id}`); }}
                >
                  <div className="relative shrink-0">
                    <img src={avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
                    {isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#00d26a] border-[3px] border-black rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className={`text-[15px] tracking-tight truncate flex items-center gap-2 ${isUnread ? "font-bold text-white" : "text-[#fafafa] font-medium"}`}>
                      {title}
                      {conv.isGroup && <span className="bg-white/10 text-white/50 text-[10px] px-1.5 py-0.5 rounded-md">مجموعة</span>}
                    </div>
                    <div className={`text-[13px] truncate mt-[2px] ${isUnread ? "text-white font-semibold" : "text-[#a8a8a8]"}`}>
                      {conv.lastMessage
                        ? conv.lastMessage.type === "voice" ? "🎤 رسالة صوتية"
                          : <EmojiText text={conv.lastMessage.content} size={13} disableJumbo />
                        : "اضغط للبدء بالدردشة"}
                      {conv.lastMessage?.createdAt && (
                        <span className="mr-1 text-[#737373]">
                          · {new Date(conv.lastMessage.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                  {isUnread && <div className="w-2 h-2 rounded-full shrink-0 bg-[#0095f6]" />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── New Chat Modal ──────────────────────────────────────── */}
      {showNewChat && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-[400px] overflow-hidden shadow-2xl"
            style={{ animation: "modalIn 0.18s cubic-bezier(.34,1.2,.64,1) both" }}
            onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="relative flex items-center justify-center px-5 py-4 border-b border-white/[0.06]">
              <span className="font-bold text-white text-[15px]">رسالة جديدة</span>
              <button onClick={closeModal} className="absolute left-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-[#737373] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs for Mode */}
            <div className="flex border-b border-white/[0.06]">
              <button
                onClick={() => setChatMode("single")}
                className={`flex-1 py-3 text-[13px] font-semibold transition-colors ${chatMode === "single" ? "text-white border-b-2 border-[#0095f6]" : "text-[#737373] hover:text-[#a8a8a8]"}`}
              >
                محادثة فردية
              </button>
              <button
                onClick={() => setChatMode("group")}
                className={`flex-1 py-3 text-[13px] font-semibold transition-colors ${chatMode === "group" ? "text-white border-b-2 border-[#0095f6]" : "text-[#737373] hover:text-[#a8a8a8]"}`}
              >
                مجموعة (إلى 20 شخص)
              </button>
            </div>

            {/* Input Area */}
            <div className="px-5 pt-4 pb-3">
              {chatMode === "group" ? (
                <>
                  <div className="mb-4">
                    <label className="text-[11px] text-[#555] font-semibold uppercase tracking-wider block mb-2">اسم المجموعة</label>
                    <div className="border-b-2 border-white/20 focus-within:border-[#0095f6] pb-2 transition-colors">
                      <input value={groupName} onChange={(e) => setGroupName(e.target.value)}
                        placeholder="اكتب اسم الجروب..."
                        className="bg-transparent outline-none text-white text-[15px] w-full placeholder:text-[#444]"
                      />
                    </div>
                  </div>

                  <label className="text-[11px] text-[#555] font-semibold uppercase tracking-wider block mb-2">
                    إضافة عضو ({groupMembers.length}/20)
                  </label>
                  
                  {eligibleFriends.length === 0 ? (
                    <div className="text-[13px] text-[#a8a8a8] bg-white/5 border border-white/10 rounded-xl p-4 text-center leading-relaxed">
                      لا يوجد أصدقاء مؤهلين 😔<br/>
                      <span className="text-[12px] text-[#737373]">يجب أن تتواصل مع شخص في محادثة فردية ويرد عليك أولاً لتتمكن من إضافته لمجموعة.</span>
                    </div>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {eligibleFriends.map(friend => {
                        const isSelected = groupMembers.includes(friend);
                        return (
                          <button 
                            key={friend}
                            onClick={() => {
                              if (isSelected) setGroupMembers(prev => prev.filter(x => x !== friend));
                              else if (groupMembers.length < 20) setGroupMembers(prev => [...prev, friend]);
                            }}
                            className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(friend)}&background=random&color=fff&size=150`} className="w-9 h-9 rounded-full" alt="" />
                              <span className="text-[14px] text-white font-medium">{friend}</span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? "bg-[#0095f6] border-[#0095f6]" : "border-white/20"}`}>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <label className="text-[11px] text-[#555] font-semibold uppercase tracking-wider block mb-3">إلى</label>
                  
                  <div className={`flex items-center gap-2 border-b-2 pb-2 transition-colors ${
                    checkState === "found" ? "border-[#00d26a]" : checkState === "notfound" ? "border-[#ed4956]" : "border-white/20 focus-within:border-[#0095f6]"}`}>
                    <span className="text-[#555]">@</span>
                    <input ref={inputRef} value={newName} onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { 
                        if (e.key === "Enter") handleCreate();
                        if (e.key === "Escape") closeModal(); 
                      }}
                      placeholder="اسم المستخدم"
                      className="bg-transparent outline-none text-white text-[15px] flex-1 placeholder:text-[#444]"
                      autoComplete="off" spellCheck={false} dir="ltr" />
                    <Badge />
                  </div>

                  {/* Not found error */}
                  {checkState === "notfound" && newName.trim().length >= 2 && (
                    <div className="mt-3 flex items-start gap-2 bg-[#ed4956]/10 border border-[#ed4956]/25 rounded-xl px-3.5 py-3">
                      <UserX className="w-4 h-4 text-[#ed4956] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[13px] text-[#ed4956] font-semibold">المستخدم غير موجود</p>
                        <p className="text-[12px] text-[#555] mt-0.5">تحقق من الاسم وحاول مجدداً. ربما لم يسجّل بعد.</p>
                      </div>
                    </div>
                  )}

                  {/* Found user card */}
                  {checkState === "found" && foundUser && (
                    <div className="mt-3 flex items-center justify-between bg-[#00d26a]/10 border border-[#00d26a]/25 rounded-xl px-3.5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(foundUser)}&background=random&color=fff&size=150`} className="w-9 h-9 rounded-full ring-2 ring-[#00d26a]/30" alt="" />
                        <div>
                          <p className="text-[13px] text-white font-semibold">{foundUser}</p>
                          <p className="text-[12px] text-[#00d26a]">جاهز للدردشة ✓</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* CTA */}
            <div className="px-5 pb-5">
              <button onClick={handleCreate} 
                disabled={chatMode === "single" ? checkState !== "found" : (groupMembers.length === 0 || !groupName.trim())}
                className="w-full py-3 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                style={{ background: (chatMode === "single" && checkState === "found") || (chatMode === "group" && groupMembers.length > 0 && groupName.trim()) ? "linear-gradient(135deg,#4f5bd5,#962fbf,#d62976,#fa7e1e)" : "#222" }}>
                {chatMode === "single" ? "فتح المحادثة" : "إنشاء المجموعة"} <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}