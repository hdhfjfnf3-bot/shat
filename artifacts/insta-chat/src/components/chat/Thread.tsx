import { useEffect, useRef } from "react";
import { useChatStore } from "@/lib/store";
import { CURRENT_USER } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";

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

        let borderRadius = "22px";
        if (isOwn) {
          if (!isFirstInGroup && !isLastInGroup) borderRadius = "22px 4px 4px 22px";
          else if (!isFirstInGroup && isLastInGroup) borderRadius = "22px 4px 22px 22px";
          else if (isFirstInGroup && !isLastInGroup) borderRadius = "22px 22px 4px 22px";
        } else {
          if (!isFirstInGroup && !isLastInGroup) borderRadius = "4px 22px 22px 4px";
          else if (!isFirstInGroup && isLastInGroup) borderRadius = "4px 22px 22px 22px";
          else if (isFirstInGroup && !isLastInGroup) borderRadius = "22px 22px 22px 4px";
        }

        return (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={isOwn}
            isFirstInGroup={isFirstInGroup}
            isLastInGroup={isLastInGroup}
            isLastOverall={idx === arr.length - 1}
            borderRadius={borderRadius}
            otherUser={otherUser}
            conversationId={activeId}
            allMessages={arr}
          />
        );
      })}
    </div>
  );
}
