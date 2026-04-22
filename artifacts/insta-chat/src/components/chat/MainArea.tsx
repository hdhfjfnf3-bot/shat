import { useChatStore } from "@/lib/store";
import { Camera, ChevronLeft, Phone, Video, Info } from "lucide-react";
import { useLocation } from "wouter";
import { Thread } from "./Thread";
import { Composer } from "./Composer";
import { EmojiStylePicker } from "./EmojiStylePicker";

export function MainArea({ activeId }: { activeId: string | null }) {
  const [, setLocation] = useLocation();
  const { conversations } = useChatStore();
  const activeConv = activeId ? conversations[activeId] : null;
  const otherUser = activeConv?.participants[0];

  if (!activeId || !activeConv) {
    return (
      <div className={`flex-1 flex-col bg-[#000000] relative ${!activeId ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-[96px] h-[96px] border-2 border-white rounded-full flex items-center justify-center mb-4">
            <Camera className="w-[44px] h-[44px] stroke-[1.5]" />
          </div>
          <h2 className="text-[20px] font-normal mb-2 text-[#fafafa]">Your messages</h2>
          <p className="text-[#a8a8a8] text-[14px] mb-6">Send private photos and messages to a friend or group.</p>
          <button className="bg-[#0095f6] hover:bg-[#1877f2] text-white px-4 py-[6px] rounded-lg font-semibold text-[14px] transition-colors">
            Send message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#000000] relative h-full overflow-hidden">
      {/* Thread Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#262626] bg-[#000000] z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/")} className="md:hidden mr-2">
            <ChevronLeft className="w-8 h-8 stroke-[1.5]" />
          </button>
          <img src={otherUser?.avatarUrl} className="w-11 h-11 rounded-full object-cover cursor-pointer" />
          <div className="flex flex-col cursor-pointer">
            <div className="font-semibold text-[16px] text-[#fafafa]">{otherUser?.displayName}</div>
            <div className="text-[12px] text-[#a8a8a8]">{otherUser?.isOnline ? 'Active now' : 'Active 5m ago'}</div>
          </div>
        </div>
        <div className="flex items-center gap-5 text-white">
          <button><Phone className="w-6 h-6 stroke-[1.5]" /></button>
          <button><Video className="w-6 h-6 stroke-[1.5]" /></button>
          <EmojiStylePicker align="right" />
          <button><Info className="w-6 h-6 stroke-[1.5]" /></button>
        </div>
      </div>

      <Thread activeId={activeId} />
      <Composer activeId={activeId} />
    </div>
  );
}