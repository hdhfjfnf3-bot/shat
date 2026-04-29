import { useState, useMemo } from "react";
import { Message } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import { Heart } from "lucide-react";

interface Props {
  gameMessage: Message;
  conversationId: string;
  allMessages: Message[];
}

export function LoveCalculatorInline({ gameMessage, conversationId, allMessages }: Props) {
  const { sendMessage } = useChatStore();
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");

  const gameStateMsg = allMessages.find(
    (m) => m.replyToId === gameMessage.id && m.content.startsWith('{"kind":"lovecalc_state"')
  );

  const state = useMemo(() => {
    if (!gameStateMsg) return null;
    try {
      return JSON.parse(gameStateMsg.content);
    } catch {
      return null;
    }
  }, [gameStateMsg]);

  // Use a stable, deterministic way to calculate percentage based on names
  const calculateLove = (n1: string, n2: string) => {
    const combined = (n1.toLowerCase().trim() + n2.toLowerCase().trim()).replace(/\s+/g, '');
    let sum = 0;
    for (let i = 0; i < combined.length; i++) {
      sum += combined.charCodeAt(i);
    }
    // Modulo 101 to get 0-100
    return sum % 101;
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name1.trim() || !name2.trim()) return;

    const percentage = calculateLove(name1, name2);
    
    let message = "";
    if (percentage > 90) message = "توأم روح! مستحيل يسيبوا بعض 💍✨";
    else if (percentage > 75) message = "قصة حب جامدة جداً! ❤️🔥";
    else if (percentage > 50) message = "في إعجاب، محتاجين شوية مجهود 😉";
    else if (percentage > 30) message = "فريندز زون قوي، بلاش عشم 😅";
    else message = "مفيش أمل خالص! بلوك أريح 💔🏃‍♂️";

    const newState = {
      kind: "lovecalc_state",
      name1: name1.trim(),
      name2: name2.trim(),
      percentage,
      message
    };
    
    // We send a new message so the calculation result stays in chat history
    sendMessage(conversationId, JSON.stringify(newState), "game", gameMessage.id);
    setName1("");
    setName2("");
  };

  if (!state) {
    return (
      <div className="w-[85vw] sm:w-[70vw] md:w-[320px] bg-gradient-to-br from-[#ff0844] to-[#ffb199] rounded-[22px] p-5 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="text-[40px] mb-2 leading-none animate-pulse">💖</div>
          <h3 className="text-[18px] font-black tracking-wide uppercase mb-1">مقياس الحب</h3>
          <p className="text-[13px] text-white/80 font-medium mb-5">عايز تعرف نسبة التوافق بين اسمين؟</p>
          
          <form onSubmit={handleCalculate} className="w-full flex flex-col gap-2">
            <input
              type="text"
              value={name1}
              onChange={(e) => setName1(e.target.value)}
              placeholder="الاسم الأول"
              className="w-full bg-white/20 border border-white/30 placeholder:text-white/60 rounded-xl px-4 py-3 text-white text-[15px] focus:outline-none focus:border-white transition-colors text-center"
            />
            <div className="flex justify-center -my-1 relative z-10">
              <div className="w-6 h-6 rounded-full bg-[#ff0844] border border-white/30 flex items-center justify-center text-[10px] text-white">
                <Heart className="w-3 h-3 fill-white" />
              </div>
            </div>
            <input
              type="text"
              value={name2}
              onChange={(e) => setName2(e.target.value)}
              placeholder="الاسم التاني"
              className="w-full bg-white/20 border border-white/30 placeholder:text-white/60 rounded-xl px-4 py-3 text-white text-[15px] focus:outline-none focus:border-white transition-colors text-center"
            />
            <button
              type="submit"
              disabled={!name1.trim() || !name2.trim()}
              className="mt-3 w-full py-3 bg-white text-[#ff0844] font-bold text-[15px] rounded-xl hover:bg-white/90 disabled:opacity-50 transition-all active:scale-95 shadow-md"
            >
              احسب النسبة!
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { name1: n1, name2: n2, percentage, message } = state;

  return (
    <div className="w-[85vw] sm:w-[70vw] md:w-[320px] bg-gradient-to-br from-[#1a1a1a] to-[#2a0815] rounded-[22px] border border-[#ff0844]/30 overflow-hidden shadow-lg p-5 flex flex-col items-center text-center relative">
      {/* Decorative background heart */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] text-[200px] pointer-events-none select-none">
        ❤️
      </div>
      
      <div className="text-[12px] font-bold tracking-widest text-[#ff8c94] uppercase mb-4">نتيجة مقياس الحب</div>
      
      <div className="flex items-center gap-3 w-full justify-center mb-6 relative z-10">
        <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-white font-bold truncate">
          {n1}
        </div>
        <Heart className={`w-6 h-6 text-[#ff0844] shrink-0 ${percentage > 50 ? 'animate-pulse fill-[#ff0844]' : 'opacity-50'}`} />
        <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-white font-bold truncate">
          {n2}
        </div>
      </div>

      <div className="relative mb-6 z-10">
        <svg viewBox="0 0 36 36" className="w-24 h-24 circular-chart">
          <path
            className="stroke-white/10"
            strokeWidth="3"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="stroke-[#ff0844] animate-[dash_1.5s_ease-out_forwards]"
            strokeWidth="3"
            strokeDasharray={`${percentage}, 100`}
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[28px] font-black text-white leading-none">
            {percentage}%
          </div>
        </div>
      </div>

      <div className="text-[14px] text-white font-bold bg-white/10 px-4 py-2 rounded-xl w-full relative z-10">
        {message}
      </div>

      <style>{`
        @keyframes dash {
          0% { stroke-dasharray: 0, 100; }
        }
      `}</style>
    </div>
  );
}
