import { useChatStore } from "@/lib/store";
import { Search, Edit, ChevronDown, Smile, Check } from "lucide-react";
import { CURRENT_USER } from "@/lib/types";
import { useLocation } from "wouter";
import { EmojiText } from "./EmojiText";
import { useEmojiStyle, EMOJI_STYLE_OPTIONS } from "@/lib/emojiStyle";
import { useEffect, useRef, useState } from "react";

export function Sidebar({ activeId }: { activeId: string | null }) {
  const [, setLocation] = useLocation();
  const { conversations, setActiveConversation, createConversation } = useChatStore();
  const { style, setStyle } = useEmojiStyle();
  const [openStylePicker, setOpenStylePicker] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newName, setNewName] = useState("");
  const stylePickerRef = useRef<HTMLDivElement>(null);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const id = createConversation(name);
    if (id) {
      setActiveConversation(id);
      setLocation(`/${id}`);
    }
    setNewName("");
    setShowNewChat(false);
  };
  const convList = Object.values(conversations).sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());

  useEffect(() => {
    if (!openStylePicker) return;
    const onDoc = (e: MouseEvent) => {
      if (stylePickerRef.current && !stylePickerRef.current.contains(e.target as Node)) {
        setOpenStylePicker(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openStylePicker]);

  return (
    <div className={`w-full md:w-[398px] flex flex-col border-r border-[#262626] bg-[#000000] shrink-0 z-10 ${activeId ? 'hidden md:flex' : 'flex'}`}>
      <div className="flex items-center justify-between px-6 pt-[36px] pb-3">
        <button className="flex items-center gap-2 text-[20px] font-bold tracking-tight">
          {CURRENT_USER.username}
          <ChevronDown className="w-5 h-5 text-white" />
        </button>
        <div className="flex gap-4 items-center relative" ref={stylePickerRef}>
          <button
            onClick={() => setOpenStylePicker((s) => !s)}
            aria-label="Emoji style"
            className="text-white hover:opacity-70"
            title="Emoji style"
          >
            <Smile className="w-6 h-6 stroke-[1.5]" />
          </button>
          <button onClick={() => setShowNewChat(true)} aria-label="New message" className="text-white hover:opacity-70">
            <Edit className="w-6 h-6 stroke-[1.5]" />
          </button>
          {openStylePicker && (
            <div className="absolute right-0 top-9 z-50 w-[230px] bg-[#1a1a1a] border border-[#363636] rounded-xl shadow-2xl overflow-hidden">
              <div className="px-4 pt-3 pb-2 text-[12px] uppercase tracking-wider text-[#a8a8a8] font-semibold">
                Emoji style
              </div>
              {EMOJI_STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setStyle(opt.key);
                    setOpenStylePicker(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#262626] text-[14px] text-left text-[#fafafa]"
                >
                  <span>{opt.label}</span>
                  {style === opt.key && <Check className="w-4 h-4 text-[#0095f6]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 mb-4 mt-2">
        <div className="bg-[#262626] rounded-[8px] flex items-center px-4 py-[6px] gap-3 text-[#a8a8a8]">
          <Search className="w-4 h-4" />
          <input type="text" placeholder="Search" className="bg-transparent outline-none flex-1 placeholder:text-[#a8a8a8] text-[15px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex px-6 mb-2 font-semibold text-[15px]">
          <button className="mr-6 pb-2 border-b border-white">Messages</button>
          <button className="text-[#a8a8a8]">Requests</button>
        </div>

        <div className="flex flex-col">
          {convList.map(conv => {
            const user = conv.participants[0];
            const isActive = activeId === conv.id;
            const isUnread = conv.unreadCount > 0;
            return (
              <button 
                key={conv.id} 
                className={`flex items-center px-6 py-[8px] gap-3 hover:bg-[#121212] transition-colors w-full text-left ${isActive ? 'bg-[#121212]' : ''}`}
                onClick={() => {
                  setActiveConversation(conv.id);
                  setLocation(`/${conv.id}`);
                }}
              >
                <div className="relative shrink-0">
                  <img src={user.avatarUrl} alt={user.username} className="w-14 h-14 rounded-full object-cover" />
                  {user.isOnline && <div className="absolute bottom-0 right-0 w-[14px] h-[14px] bg-[#00d26a] border-2 border-black rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[15px] truncate ${isUnread ? 'font-semibold text-white' : 'font-normal text-[#fafafa]'}`}>{user.displayName || user.username}</div>
                  <div className={`text-[13px] truncate ${isUnread ? 'text-white font-semibold' : 'text-[#737373]'} mt-0.5`}>
                    {conv.lastMessage
                      ? (conv.lastMessage.type === "voice"
                          ? "🎤 Voice message"
                          : <EmojiText text={conv.lastMessage.content} size={14} />)
                      : "No messages yet"}
                    <span className="mx-1">·</span>
                    <span className="text-[#737373] font-normal">
                      {conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
                {isUnread && <div className="w-2 h-2 bg-[#4f5bd5] rounded-full shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {showNewChat && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowNewChat(false)}>
          <div
            className="bg-[#1a1a1a] border border-[#363636] rounded-2xl w-full max-w-[400px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-[#262626] text-center font-semibold text-white text-[16px]">
              New message
            </div>
            <div className="px-5 py-4">
              <label className="text-[13px] text-[#a8a8a8] block mb-2">To:</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setShowNewChat(false);
                }}
                placeholder="Username"
                className="w-full bg-transparent border-b border-[#363636] outline-none text-white text-[15px] py-2 placeholder:text-[#737373]"
              />
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="w-full py-2.5 rounded-lg ig-gradient text-white font-semibold disabled:opacity-50"
              >
                Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}