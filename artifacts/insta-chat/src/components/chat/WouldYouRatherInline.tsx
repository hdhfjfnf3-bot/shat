import { useState, useMemo } from "react";
import { Message, User, CURRENT_USER } from "@/lib/types";
import { useChatStore } from "@/lib/store";

interface Props {
  gameMessage: Message;
  conversationId: string;
  allMessages: Message[];
  participants?: User[];
}

const WYR_QUESTIONS = [
  { opt1: "تسافر عبر الزمن للمستقبل", opt2: "تسافر عبر الزمن للماضي" },
  { opt1: "تقرأ أفكار الناس", opt2: "تطير في السما" },
  { opt1: "تأكل بيتزا طول عمرك", opt2: "تأكل برجر طول عمرك" },
  { opt1: "تعيش في جزيرة منعزلة غني جداً", opt2: "تعيش بين الناس بس فقير" },
  { opt1: "تفقد القدرة على الكلام", opt2: "تفقد القدرة على السمع" },
  { opt1: "تتكلم كل لغات العالم", opt2: "تقدر تعزف على كل الآلات الموسيقية" },
  { opt1: "يكون عندك زرار يرجع الزمن دقيقة واحدة", opt2: "زرار يوقف الزمن 10 دقايق" },
  { opt1: "تعرف إمتى هتموت", opt2: "تعرف إزاي هتموت" },
  { opt1: "تنسى كل ذكرياتك وتعيش من جديد", opt2: "تعيش وكل يوم يتكرر كأنه نفس اليوم" },
];

export function WouldYouRatherInline({ gameMessage, conversationId, allMessages, participants }: Props) {
  const { sendMessage } = useChatStore();

  const gameStateMsg = allMessages.find(
    (m) => m.replyToId === gameMessage.id && m.content.startsWith('{"kind":"wyr_state"')
  );

  const state = useMemo(() => {
    if (!gameStateMsg) return null;
    try {
      return JSON.parse(gameStateMsg.content);
    } catch {
      return null;
    }
  }, [gameStateMsg]);

  // If no state exists, we need to initialize it
  const initializeGame = () => {
    const q = WYR_QUESTIONS[Math.floor(Math.random() * WYR_QUESTIONS.length)];
    const initialState = {
      kind: "wyr_state",
      opt1: q.opt1,
      opt2: q.opt2,
      votes1: [],
      votes2: [],
    };
    sendMessage(conversationId, JSON.stringify(initialState), "game", gameMessage.id);
  };

  if (!state) {
    return (
      <div className="w-[85vw] sm:w-[70vw] md:w-[320px] bg-gradient-to-br from-[#ff0844] to-[#ffb199] rounded-[22px] p-5 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="text-[40px] mb-2 leading-none">⚖️</div>
          <h3 className="text-[18px] font-black tracking-wide uppercase mb-1">لو خيروك</h3>
          <p className="text-[13px] text-white/80 font-medium mb-5">مستعد تختار بين اختيارين أصعب من بعض؟</p>
          <button
            onClick={initializeGame}
            className="w-full py-3 bg-white text-[#ff0844] font-bold text-[15px] rounded-xl hover:bg-white/90 transition-all active:scale-95 shadow-md"
          >
            ابدأ اللعبة
          </button>
        </div>
      </div>
    );
  }

  const { opt1, opt2, votes1, votes2 } = state;
  const me = CURRENT_USER.username;
  const totalVotes = votes1.length + votes2.length;
  const p1 = totalVotes > 0 ? Math.round((votes1.length / totalVotes) * 100) : 0;
  const p2 = totalVotes > 0 ? Math.round((votes2.length / totalVotes) * 100) : 0;
  
  const hasVoted = votes1.includes(me) || votes2.includes(me);

  const handleVote = (optNum: 1 | 2) => {
    if (hasVoted) return; // Prevent multiple votes

    const newState = { ...state };
    if (optNum === 1) newState.votes1 = [...votes1, me];
    if (optNum === 2) newState.votes2 = [...votes2, me];

    // Overwrite the existing state message using its ID
    useChatStore.getState().editMessage(conversationId, gameStateMsg!.id, JSON.stringify(newState));
  };

  return (
    <div className="w-[85vw] sm:w-[70vw] md:w-[340px] bg-[#1a1a1a] rounded-[22px] border border-white/10 overflow-hidden shadow-lg">
      <div className="bg-gradient-to-br from-[#ff0844] to-[#ffb199] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[20px]">⚖️</span>
          <span className="text-[13px] font-black tracking-widest uppercase text-white">لو خيروك</span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 relative">
        {/* Option 1 */}
        <button
          onClick={() => handleVote(1)}
          disabled={hasVoted}
          className="relative w-full min-h-[50px] rounded-xl overflow-hidden group bg-white/5 border border-white/5"
        >
          {hasVoted && (
            <div 
              className="absolute left-0 top-0 bottom-0 bg-[#ff0844]/40 transition-all duration-700 ease-out"
              style={{ width: `${p1}%` }}
            />
          )}
          <div className="relative z-10 flex flex-col justify-center w-full h-full p-3 text-right">
            <span className={`text-[15px] ${votes1.includes(me) ? "font-bold text-white" : "font-medium text-[#e0e0e0]"}`}>
              {opt1}
            </span>
            {hasVoted && (
              <span className="text-[12px] font-bold text-[#ffb199] mt-1">{p1}% ({votes1.length} أصوات)</span>
            )}
          </div>
        </button>

        <div className="flex justify-center -my-1 relative z-10 pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-[10px] font-black text-[#a8a8a8]">
            أو
          </div>
        </div>

        {/* Option 2 */}
        <button
          onClick={() => handleVote(2)}
          disabled={hasVoted}
          className="relative w-full min-h-[50px] rounded-xl overflow-hidden group bg-white/5 border border-white/5"
        >
          {hasVoted && (
            <div 
              className="absolute left-0 top-0 bottom-0 bg-[#0095f6]/40 transition-all duration-700 ease-out"
              style={{ width: `${p2}%` }}
            />
          )}
          <div className="relative z-10 flex flex-col justify-center w-full h-full p-3 text-right">
            <span className={`text-[15px] ${votes2.includes(me) ? "font-bold text-white" : "font-medium text-[#e0e0e0]"}`}>
              {opt2}
            </span>
            {hasVoted && (
              <span className="text-[12px] font-bold text-[#66bfff] mt-1">{p2}% ({votes2.length} أصوات)</span>
            )}
          </div>
        </button>
      </div>

      {hasVoted && (
        <div className="px-4 pb-4">
          <button
            onClick={initializeGame}
            className="w-full py-2 bg-white/10 text-white font-bold text-[13px] rounded-lg hover:bg-white/15 transition-all"
          >
            سؤال جديد
          </button>
        </div>
      )}
    </div>
  );
}
