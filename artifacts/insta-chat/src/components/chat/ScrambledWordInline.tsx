import { useState, useMemo } from "react";
import { Message, CURRENT_USER } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import { Send } from "lucide-react";

interface Props {
  gameMessage: Message;
  conversationId: string;
  allMessages: Message[];
}

const WORDS = [
  "فراولة", "تلفزيون", "مبرمج", "سفينة", "مكتبة", "مستشفى", "طيارة", "بحرية",
  "خوارزمية", "ميكروفون", "كيبورد", "انستجرام", "سيارة", "اسكندرية", "عنكبوت"
];

function shuffleString(str: string) {
  const arr = str.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join(" ");
}

export function ScrambledWordInline({ gameMessage, conversationId, allMessages }: Props) {
  const { sendMessage } = useChatStore();
  const [guess, setGuess] = useState("");

  const gameStateMsg = allMessages.find(
    (m) => m.replyToId === gameMessage.id && m.content.startsWith('{"kind":"scramble_state"')
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
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    const scrambled = shuffleString(w);
    const initialState = {
      kind: "scramble_state",
      word: w,
      scrambled,
      winner: null, // username of winner if solved
      winnerTime: null,
      startTime: Date.now(),
    };
    sendMessage(conversationId, JSON.stringify(initialState), "game", gameMessage.id);
  };

  if (!state) {
    return (
      <div className="w-[85vw] sm:w-[70vw] md:w-[320px] bg-gradient-to-br from-[#11998e] to-[#38ef7d] rounded-[22px] p-5 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="text-[40px] mb-2 leading-none">🔠</div>
          <h3 className="text-[18px] font-black tracking-wide uppercase mb-1">فك الشفرة</h3>
          <p className="text-[13px] text-white/80 font-medium mb-5">كلمة حروفها ملخبطة، أسرع واحد يرتبها يكسب!</p>
          <button
            onClick={initializeGame}
            className="w-full py-3 bg-white text-[#11998e] font-bold text-[15px] rounded-xl hover:bg-white/90 transition-all active:scale-95 shadow-md"
          >
            ابدأ اللغز
          </button>
        </div>
      </div>
    );
  }

  const { word, scrambled, winner, startTime, winnerTime } = state;
  const isFinished = !!winner;

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFinished || !guess.trim()) return;

    if (guess.trim() === word) {
      // Won!
      const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
      const newState = {
        ...state,
        winner: CURRENT_USER.username,
        winnerTime: timeTaken,
      };
      useChatStore.getState().editMessage(conversationId, gameStateMsg!.id, JSON.stringify(newState));
    } else {
      // Shake animation can be added here
      setGuess("");
    }
  };

  return (
    <div className="w-[85vw] sm:w-[70vw] md:w-[340px] bg-[#1a1a1a] rounded-[22px] border border-white/10 overflow-hidden shadow-lg">
      <div className="bg-gradient-to-br from-[#11998e] to-[#38ef7d] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[20px]">🔠</span>
            <span className="text-[13px] font-black tracking-widest uppercase text-white">فك الشفرة</span>
          </div>
          {isFinished && <div className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">انتهت</div>}
        </div>
      </div>

      <div className="p-4 flex flex-col items-center relative">
        <div className="text-[12px] text-[#a8a8a8] mb-2 text-center">
          رتب الحروف دي عشان تطلّع الكلمة الصح:
        </div>
        
        <div className="text-[28px] font-black tracking-[8px] text-white bg-white/5 py-4 px-6 rounded-xl border border-white/10 w-full text-center mb-4" dir="ltr">
          {scrambled}
        </div>

        {isFinished ? (
          <div className="w-full bg-[#00d26a]/10 border border-[#00d26a]/30 rounded-xl p-4 text-center animate-in zoom-in-95 duration-300">
            <div className="text-[30px] mb-2">🏆</div>
            <div className="text-[16px] font-bold text-white mb-1">
              الكلمة كانت: <span className="text-[#00d26a]">{word}</span>
            </div>
            <div className="text-[13px] text-[#a8a8a8]">
              <span className="font-bold text-white">@{winner}</span> حلها في {winnerTime} ثانية!
            </div>
            <button
              onClick={initializeGame}
              className="mt-4 w-full py-2 bg-[#00d26a] text-black font-bold text-[13px] rounded-lg hover:bg-[#00e676] transition-all"
            >
              لغز جديد
            </button>
          </div>
        ) : (
          <form onSubmit={handleGuess} className="w-full flex gap-2">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="اكتب الكلمة هنا..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-[15px] focus:outline-none focus:border-[#11998e] transition-colors"
            />
            <button
              type="submit"
              disabled={!guess.trim()}
              className="w-12 h-[50px] bg-[#11998e] flex items-center justify-center rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#14b3a6] transition-colors"
            >
              <Send className="w-5 h-5 -ml-1" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
