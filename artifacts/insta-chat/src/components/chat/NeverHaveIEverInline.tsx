import { useState, useMemo } from "react";
import { Message, User, CURRENT_USER } from "@/lib/types";
import { useChatStore } from "@/lib/store";

interface Props {
  gameMessage: Message;
  conversationId: string;
  allMessages: Message[];
  participants?: User[];
}

const NHIE_QUESTIONS = [
  "عمرك عملت نفسك نايم عشان متقومش ترد على حد؟",
  "عمرك كلت أكل حد تاني من التلاجة؟",
  "عمرك بصيت في تليفون حد وهو بيكتب رسالة؟",
  "عمرك بعت رسالة بالغلط للشخص اللي كنت بتتكلم عليه؟",
  "عمرك ضحكت على نكتة مش فاهمها؟",
  "عمرك وقعت في الشارع وعملت نفسك بتبص في التليفون؟",
  "عمرك نسيت اسم حد وانت بتكلمه؟",
  "عمرك سرقت شبشب من المسجد؟",
  "عمرك طلعت من جروب واتساب من غير ما حد يلاحظ؟",
  "عمرك استنيت رسالة من حد وعملت نفسك مش مهتم؟"
];

export function NeverHaveIEverInline({ gameMessage, conversationId, allMessages, participants }: Props) {
  const { sendMessage } = useChatStore();

  const gameStateMsg = allMessages.find(
    (m) => m.replyToId === gameMessage.id && m.content.startsWith('{"kind":"nhi_state"')
  );

  const state = useMemo(() => {
    if (!gameStateMsg) return null;
    try {
      return JSON.parse(gameStateMsg.content);
    } catch {
      return null;
    }
  }, [gameStateMsg]);

  const initializeGame = () => {
    const q = NHIE_QUESTIONS[Math.floor(Math.random() * NHIE_QUESTIONS.length)];
    const initialState = {
      kind: "nhi_state",
      question: q,
      have: [],
      haveNot: [],
    };
    sendMessage(conversationId, JSON.stringify(initialState), "game", gameMessage.id);
  };

  if (!state) {
    return (
      <div className="w-[85vw] sm:w-[70vw] md:w-[320px] bg-gradient-to-br from-[#8E2DE2] to-[#4A00E0] rounded-[22px] p-5 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="text-[40px] mb-2 leading-none">🚫</div>
          <h3 className="text-[18px] font-black tracking-wide uppercase mb-1">عمرك عملت كذا؟</h3>
          <p className="text-[13px] text-white/80 font-medium mb-5">لعبة الاعترافات الخطيرة والفضايح المضحكة!</p>
          <button
            onClick={initializeGame}
            className="w-full py-3 bg-white text-[#4A00E0] font-bold text-[15px] rounded-xl hover:bg-white/90 transition-all active:scale-95 shadow-md"
          >
            اسأل سؤال
          </button>
        </div>
      </div>
    );
  }

  const { question, have, haveNot } = state;
  const me = CURRENT_USER.username;
  const totalVotes = have.length + haveNot.length;
  const pHave = totalVotes > 0 ? Math.round((have.length / totalVotes) * 100) : 0;
  const pHaveNot = totalVotes > 0 ? Math.round((haveNot.length / totalVotes) * 100) : 0;
  
  const hasVoted = have.includes(me) || haveNot.includes(me);

  const handleVote = (didIt: boolean) => {
    if (hasVoted) return;

    const newState = { ...state };
    if (didIt) newState.have = [...have, me];
    else newState.haveNot = [...haveNot, me];

    useChatStore.getState().editMessage(conversationId, gameStateMsg!.id, JSON.stringify(newState));
  };

  return (
    <div className="w-[85vw] sm:w-[70vw] md:w-[340px] bg-[#1a1a1a] rounded-[22px] border border-white/10 overflow-hidden shadow-lg">
      <div className="bg-gradient-to-br from-[#8E2DE2] to-[#4A00E0] px-4 py-3 text-center">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[20px] mb-1">🤫</span>
          <span className="text-[14px] font-black tracking-widest text-white leading-snug">{question}</span>
        </div>
      </div>

      <div className="p-4 flex gap-3 relative">
        <button
          onClick={() => handleVote(true)}
          disabled={hasVoted}
          className="relative flex-1 min-h-[60px] rounded-xl overflow-hidden group bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center p-2"
        >
          {hasVoted && (
            <div 
              className="absolute left-0 right-0 bottom-0 bg-[#00d26a]/40 transition-all duration-700 ease-out"
              style={{ height: `${pHave}%` }}
            />
          )}
          <div className="relative z-10 flex flex-col items-center">
            <span className={`text-[15px] ${have.includes(me) ? "font-bold text-white" : "font-medium text-[#e0e0e0]"}`}>
              عملتها 🫣
            </span>
            {hasVoted && (
              <span className="text-[12px] font-bold text-[#00d26a] mt-1">{pHave}%</span>
            )}
          </div>
        </button>

        <button
          onClick={() => handleVote(false)}
          disabled={hasVoted}
          className="relative flex-1 min-h-[60px] rounded-xl overflow-hidden group bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center p-2"
        >
          {hasVoted && (
            <div 
              className="absolute left-0 right-0 bottom-0 bg-[#ed4956]/40 transition-all duration-700 ease-out"
              style={{ height: `${pHaveNot}%` }}
            />
          )}
          <div className="relative z-10 flex flex-col items-center">
            <span className={`text-[15px] ${haveNot.includes(me) ? "font-bold text-white" : "font-medium text-[#e0e0e0]"}`}>
              معملتهاش 😇
            </span>
            {hasVoted && (
              <span className="text-[12px] font-bold text-[#ed4956] mt-1">{pHaveNot}%</span>
            )}
          </div>
        </button>
      </div>

      {hasVoted && (
        <div className="px-4 pb-4 flex justify-between items-center text-[11px] text-[#737373]">
          <div>إجمالي الاعترافات: {totalVotes}</div>
          <button
            onClick={initializeGame}
            className="text-[#3797f0] hover:text-white font-bold transition-colors"
          >
            سؤال جديد
          </button>
        </div>
      )}
    </div>
  );
}
