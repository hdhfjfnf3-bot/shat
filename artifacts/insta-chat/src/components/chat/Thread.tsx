import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/store";
import { CURRENT_USER } from "@/lib/types";
import { motion } from "framer-motion";

export function Thread({ activeId }: { activeId: string }) {
  const { messages, conversations } = useChatStore();
  const activeConv = conversations[activeId];
  const otherUser = activeConv?.participants[0];
  const msgs = messages[activeId] || [];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-[2px]">
      {msgs.map((msg, idx, arr) => {
        const isOwn = msg.senderId === CURRENT_USER.id;
        const prevMsg = arr[idx - 1];
        const nextMsg = arr[idx + 1];
        
        const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
        const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;

        let borderRadius = '22px';
        if (isOwn) {
          if (!isFirstInGroup && !isLastInGroup) borderRadius = '22px 4px 4px 22px';
          else if (!isFirstInGroup && isLastInGroup) borderRadius = '22px 4px 22px 22px';
          else if (isFirstInGroup && !isLastInGroup) borderRadius = '22px 22px 4px 22px';
        } else {
          if (!isFirstInGroup && !isLastInGroup) borderRadius = '4px 22px 22px 4px';
          else if (!isFirstInGroup && isLastInGroup) borderRadius = '4px 22px 22px 22px';
          else if (isFirstInGroup && !isLastInGroup) borderRadius = '22px 22px 22px 4px';
        }

        return (
          <motion.div 
            initial={isLastInGroup && isOwn && msg.status === 'sending' ? { opacity: 0, scale: 0.9, y: 10 } : false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            key={msg.id} 
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2' : ''} group relative`}
          >
            {!isOwn && isLastInGroup && (
              <div className="w-[28px] mr-2 flex-shrink-0 flex items-end pb-1">
                <img src={otherUser?.avatarUrl} className="w-[28px] h-[28px] rounded-full object-cover" />
              </div>
            )}
            {!isOwn && !isLastInGroup && <div className="w-[36px] flex-shrink-0" />}

            <div className="flex flex-col max-w-[65%]">
              <div 
                className={`px-[16px] py-[10px] text-[15px] leading-[19px] break-words ${isOwn ? 'ig-gradient text-white' : 'bg-[#262626] text-[#fafafa]'}`} 
                style={{ borderRadius }}
                dir="auto"
              >
                {msg.content}
              </div>
              
              {/* Status */}
              {isOwn && isLastInGroup && idx === arr.length - 1 && (
                <div className="text-[12px] text-[#a8a8a8] mt-1 text-right mr-1 transition-all">
                  {msg.status === 'sending' ? <span className="italic">Sending...</span> : 
                   msg.status === 'sent' ? 'Sent' : 
                   msg.status === 'delivered' ? 'Delivered' : 'Seen'}
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  );
}