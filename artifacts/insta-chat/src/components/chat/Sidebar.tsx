import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Edit, Smile, Check, X, UserX, Loader2, ArrowLeft, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useChatStore } from "@/lib/store";
import { useMe } from "@/lib/me";
import { useEmojiStyle, EMOJI_STYLE_OPTIONS } from "@/lib/emojiStyle";
import { EmojiText } from "./EmojiText";

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
  const token     = useMe((s) => s.token);
  const clearAuth = useMe((s) => s.clearAuth);

  /* State */
  const [openEmoji,   setOpenEmoji]   = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newName,     setNewName]     = useState("");
  const [search,      setSearch]      = useState("");
  const [checkState,  setCheckState]  = useState<CheckState>("idle");
  const [foundUser,   setFoundUser]   = useState<string | null>(null);

  const emojiRef  = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

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
        const res = await fetch(`/api/auth/check-user/${encodeURIComponent(clean)}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (res.status === 404) { setCheckState("notfound"); setFoundUser(null); return; }
        if (!res.ok) { setCheckState("error"); return; }
        const d = await res.json();
        setCheckState(d.exists ? "found" : "notfound");
        setFoundUser(d.exists ? d.username : null);
      } catch { setCheckState("error"); }
    }, 450),
    [username, token]
  );

  useEffect(() => { checkUser(newName); }, [newName, checkUser]);

  const handleCreate = () => {
    if (checkState !== "found" || !foundUser) return;
    const id = createConversation(foundUser);
    if (id) { setActiveConversation(id); setLocation(`/${id}`); }
    closeModal();
  };
  const closeModal = () => { setShowNewChat(false); setNewName(""); setCheckState("idle"); setFoundUser(null); };

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
      const p = c.participants[0];
      return p.username.includes(search.toLowerCase()) || (p.displayName || "").includes(search);
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
      <div className={`w-full md:w-[360px] flex flex-col border-l border-white/[0.06] bg-black shrink-0 z-10 ${activeId ? "hidden md:flex" : "flex"}`}>

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
        <div className="px-4 mb-3">
          <div className="bg-[#1a1a1a] rounded-xl flex items-center px-3.5 py-2 gap-2.5 text-[#555] focus-within:bg-[#222] transition-colors">
            <Search className="w-4 h-4 shrink-0" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث" className="bg-transparent outline-none flex-1 placeholder:text-[#555] text-[14px] text-white" />
            {search && <button onClick={() => setSearch("")}><X className="w-4 h-4" /></button>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-5 mb-1 border-b border-white/[0.06]">
          <button className="pb-2.5 text-[14px] font-semibold text-white border-b-2 border-white -mb-px">الرسائل</button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-1">
          {convList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[#444] px-6 text-center">
              {search ? (
                <><UserX className="w-9 h-9" /><p className="text-[13px]">لا توجد نتائج لـ "<span className="text-[#737373]">{search}</span>"</p></>
              ) : (
                <><Edit className="w-9 h-9" /><p className="text-[13px]">ابدأ محادثة جديدة</p>
                <button onClick={() => setShowNewChat(true)} className="mt-1 px-5 py-2 rounded-xl bg-[#0095f6] text-white text-[13px] font-semibold hover:bg-[#1877f2] transition-colors">
                  رسالة جديدة
                </button></>
              )}
            </div>
          ) : (
            convList.map((conv) => {
              const peer = conv.participants[0];
              const isActive = activeId === conv.id;
              const isUnread = conv.unreadCount > 0;
              return (
                <button key={conv.id}
                  className={`flex items-center px-4 py-2.5 gap-3 w-full text-right transition-colors rounded-xl mx-1 active:opacity-70 ${isActive ? "bg-white/10" : "hover:bg-white/[0.05]"}`}
                  style={{ width: "calc(100% - 8px)" }}
                  onClick={() => { setActiveConversation(conv.id); setLocation(`/${conv.id}`); }}
                >
                  <div className="relative shrink-0">
                    <img src={peer.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
                    {peer.isOnline && <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-[#00d26a] border-2 border-black rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className={`text-[14px] truncate ${isUnread ? "font-semibold text-white" : "text-[#e0e0e0]"}`}>
                      {peer.displayName || peer.username}
                    </div>
                    <div className={`text-[12px] truncate mt-0.5 ${isUnread ? "text-white font-medium" : "text-[#555]"}`}>
                      {conv.lastMessage
                        ? conv.lastMessage.type === "voice" ? "🎤 رسالة صوتية"
                          : <EmojiText text={conv.lastMessage.content} size={12} />
                        : "اضغط للبدء بالدردشة"}
                      {conv.lastMessage?.createdAt && (
                        <span className="mr-1 text-[#444]">
                          · {new Date(conv.lastMessage.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                  {isUnread && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "linear-gradient(135deg,#4f5bd5,#d62976)" }} />}
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

            {/* Input */}
            <div className="px-5 pt-5 pb-3">
              <label className="text-[11px] text-[#555] font-semibold uppercase tracking-wider block mb-3">إلى</label>
              <div className={`flex items-center gap-2 border-b-2 pb-2 transition-colors ${
                checkState === "found" ? "border-[#00d26a]" : checkState === "notfound" ? "border-[#ed4956]" : "border-white/20 focus-within:border-[#0095f6]"}`}>
                <span className="text-[#555]">@</span>
                <input ref={inputRef} value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") closeModal(); }}
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
                <div className="mt-3 flex items-center gap-3 bg-[#00d26a]/10 border border-[#00d26a]/25 rounded-xl px-3.5 py-3">
                  <img src={`https://i.pravatar.cc/150?u=${foundUser}`} className="w-9 h-9 rounded-full ring-2 ring-[#00d26a]/30" alt="" />
                  <div>
                    <p className="text-[13px] text-white font-semibold">{foundUser}</p>
                    <p className="text-[12px] text-[#00d26a]">جاهز للدردشة ✓</p>
                  </div>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="px-5 pb-5">
              <button onClick={handleCreate} disabled={checkState !== "found"}
                className="w-full py-3 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                style={{ background: checkState === "found" ? "linear-gradient(135deg,#4f5bd5,#962fbf,#d62976,#fa7e1e)" : "#222" }}>
                فتح المحادثة <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}