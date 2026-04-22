import { useState } from "react";
import { useChatStore } from "@/lib/store";
import { Smile, Mic, Image, Heart } from "lucide-react";

export function Composer({ activeId }: { activeId: string }) {
  const { sendMessage } = useChatStore();
  const [inputText, setInputText] = useState("");

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(activeId, inputText.trim());
    setInputText("");
  };

  return (
    <div className="p-4 pt-2 shrink-0 bg-[#000000]">
      <div className="border border-[#262626] rounded-full pl-3 pr-4 py-2.5 flex items-end min-h-[44px] bg-[#000000]">
        <button className="p-1 hover:opacity-70 transition-opacity self-center mr-1 text-white">
          <Smile className="w-[24px] h-[24px] stroke-[1.5]" />
        </button>
        <textarea 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Message..." 
          className="bg-transparent flex-1 outline-none text-[#fafafa] placeholder:text-[#737373] resize-none max-h-[120px] py-[2px] text-[15px] leading-[20px]" 
          rows={1}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        {inputText.trim() ? (
          <button 
            onClick={handleSend}
            className="ml-2 font-semibold text-[#0095f6] hover:text-white transition-colors self-center"
          >
            Send
          </button>
        ) : (
          <div className="flex items-center gap-3 ml-2 self-center text-white">
            <button className="hover:opacity-70"><Mic className="w-[24px] h-[24px] stroke-[1.5]" /></button>
            <button className="hover:opacity-70"><Image className="w-[24px] h-[24px] stroke-[1.5]" /></button>
            <button 
              className="hover:opacity-70"
              onClick={() => sendMessage(activeId, "❤️", "like")}
            >
              <Heart className="w-[24px] h-[24px] stroke-[1.5]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}