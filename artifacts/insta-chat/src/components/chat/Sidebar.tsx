import { useChatStore } from "@/lib/store";
import { Search, Edit, ChevronDown } from "lucide-react";
import { CURRENT_USER } from "@/lib/types";
import { useLocation } from "wouter";

export function Sidebar({ activeId }: { activeId: string | null }) {
  const [, setLocation] = useLocation();
  const { conversations, setActiveConversation } = useChatStore();
  const convList = Object.values(conversations).sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());

  return (
    <div className={`w-full md:w-[398px] flex flex-col border-r border-[#262626] bg-[#000000] shrink-0 z-10 ${activeId ? 'hidden md:flex' : 'flex'}`}>
      <div className="flex items-center justify-between px-6 pt-[36px] pb-3">
        <button className="flex items-center gap-2 text-[20px] font-bold tracking-tight">
          {CURRENT_USER.username}
          <ChevronDown className="w-5 h-5 text-white" />
        </button>
        <div className="flex gap-4">
          <button><Edit className="w-6 h-6" /></button>
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
                  setLocation(`/t/${conv.id}`);
                }}
              >
                <div className="relative shrink-0">
                  <img src={user.avatarUrl} alt={user.username} className="w-14 h-14 rounded-full object-cover" />
                  {user.isOnline && <div className="absolute bottom-0 right-0 w-[14px] h-[14px] bg-[#00d26a] border-2 border-black rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[15px] truncate ${isUnread ? 'font-semibold text-white' : 'font-normal text-[#fafafa]'}`}>{user.displayName || user.username}</div>
                  <div className={`text-[13px] truncate ${isUnread ? 'text-white font-semibold' : 'text-[#737373]'} mt-0.5`}>
                    {conv.lastMessage?.content || "No messages yet"}
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
    </div>
  );
}