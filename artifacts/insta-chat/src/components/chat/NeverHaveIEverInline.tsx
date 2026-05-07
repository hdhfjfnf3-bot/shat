import { useState, useMemo } from "react";
import { Message, User, CURRENT_USER } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sparkles, RefreshCcw, Hand } from "lucide-react";

interface Props {
  gameMessage: Message;
  conversationId: string;
  allMessages: Message[];
  participants?: User[];
}

const NHIE_QUESTIONS = [
  "عمرك عملت نفسك نايم عشان متقومش ترد على حد؟",
  "عمرك كلت أكل حد تاني من التلاجة ونكرت؟",
  "عمرك بصيت في تليفون حد وهو بيكتب رسالة في المواصلات؟",
  "عمرك بعت رسالة بالغلط للشخص اللي كنت بتتكلم عليه؟",
  "عمرك ضحكت على نكتة مش فاهمها عشان متكسفش اللي قدامك؟",
  "عمرك وقعت في الشارع وعملت نفسك بتبص في التليفون؟",
  "عمرك نسيت اسم حد وانت بتكلمه وقلتله يا باشا أو يا برو؟",
  "عمرك سرقت شبشب من المسجد أو بدلت جزمتك بجزمة أنضف؟",
  "عمرك طلعت من جروب واتساب وعملت نفسك النت فصل؟",
  "عمرك استنيت رسالة من حد وعملت نفسك مش مهتم لما اتبعتت؟",
  "عمرك كدبت بخصوص مكانك وقلت أنا في السكة وانت لسه في السرير؟",
  "عمرك لبست شراب فرده وفرده عشان مكسل تدور؟",
  "عمرك دخلت سوبر ماركت ومشتريتش حاجة وعملت نفسك بتكلم في التليفون وانت طالع؟",
  "عمرك شربت من قزازة الماية بتاعت التلاجة بوقك ورجعتها تاني؟",
  "عمرك قولت لحد (الشبكة بتقطع) وقشت عشان مش عايز تكلمه؟",
  "عمرك روحت فرح حد متعرفوش عشان البوفيه بس؟",
  "عمرك نمت في الشغل أو المحاضرة وانت فاتح عينيك؟",
  "عمرك حبيت حد من صحابك وخوفت تقوله؟",
  "عمرك فتحت الكاميرا بالغلط واتخضيت من شكلك؟",
  "عمرك جربت تعمل بلوك لحد عشان تشوف هيعمل إيه؟",
  "عمرك دخلت الحمام ومعاك الموبايل وقعدت ساعة ناسي نفسك؟",
  "عمرك قولت لحد (أنا مشغول) وانت قاعد بتبص في السقف؟",
  "عمرك عيطت بسبب فيلم أو مسلسل خيالي؟",
  "عمرك كدبت في الـ CV بتاعك عشان تتقبل في شغل؟",
  "عمرك سرقت واي فاي الجيران؟",
  "عمرك عملت أكونت فيك عشان تراقب حد؟",
  "عمرك شفت حد تعرفه في الشارع وعملت نفسك مش واخد بالك؟",
  "عمرك كلت حاجة وقعت على الأرض عشان مكسل ترميها؟",
  "عمرك غنيت في الحمام بصوت عالي وعملت فيها نجم؟",
  "عمرك وقفت قدام المراية وكلمت نفسك وتخيلت سيناريو وهمي؟",
  "عمرك قفلت المنبه وكملت نوم وحلفت إنك مسمعتوش؟"
];

export function NeverHaveIEverInline({ gameMessage, conversationId, allMessages, participants }: Props) {
  const { sendMessage } = useChatStore();
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);
    setTimeout(() => {
      const q = NHIE_QUESTIONS[Math.floor(Math.random() * NHIE_QUESTIONS.length)];
      
      const seed = q.length * 17;
      const totalGlobal = 10000 + (seed * 150) % 90000;
      const pHaveGlobal = 15 + (seed % 70); // 15% to 85%
      const globalHave = Math.floor((totalGlobal * pHaveGlobal) / 100);
      const globalHaveNot = totalGlobal - globalHave;

      const newState = {
        kind: "nhi_state",
        question: q,
        have: [],
        haveNot: [],
        globalHave,
        globalHaveNot
      };
      if (gameStateMsg) {
        useChatStore.getState().editMessage(conversationId, gameStateMsg.id, JSON.stringify(newState));
      } else {
        sendMessage(conversationId, JSON.stringify(newState), "game", gameMessage.id);
      }
      setIsLoading(false);
    }, 400); // Small delay for dramatic effect
  };

  if (!state) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-[85vw] sm:w-[70vw] md:w-[320px] rounded-[24px] p-[2px] bg-gradient-to-br from-[#8E2DE2] to-[#4A00E0] shadow-[0_20px_50px_rgba(74,0,224,0.4)] relative overflow-hidden isolate hardware-accelerated mx-auto"
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl rounded-[22px] -z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(142,45,226,0.5),transparent_70%)] rounded-[22px] -z-10 blur-xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center p-6 border border-white/10 rounded-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          
          <motion.div 
            animate={{ rotate: [-5, 5, -5], scale: [1, 1.1, 1] }} 
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="mb-4 relative"
          >
            <div className="absolute inset-0 bg-[#8E2DE2] blur-xl opacity-50 rounded-full" />
            <Hand className="w-14 h-14 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] relative z-10" />
          </motion.div>
          
          <h3 className="text-[18px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-[#e0c3fc] uppercase mb-1.5 drop-shadow-sm">عمرك عملت كذا؟</h3>
          <p className="text-[13px] text-white/70 font-bold mb-6">لعبة الاعترافات الخطيرة والفضايح المضحكة!</p>
          
          <motion.button
            whileHover={!isLoading ? { scale: 1.05, boxShadow: "0 10px 25px rgba(142,45,226,0.5)" } : {}}
            whileTap={!isLoading ? { scale: 0.95 } : {}}
            onClick={initializeGame}
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#8E2DE2] to-[#4A00E0] text-white font-black text-[15px] rounded-[16px] transition-all relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                اسأل سؤال جديد
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    );
  }

  const { question, have, haveNot, globalHave = 0, globalHaveNot = 0 } = state;
  const me = CURRENT_USER.username;
  
  const hTotal = have.length + globalHave;
  const hnTotal = haveNot.length + globalHaveNot;
  const totalVotes = hTotal + hnTotal;
  
  const pHave = totalVotes > 0 ? Math.round((hTotal / totalVotes) * 100) : 0;
  const pHaveNot = totalVotes > 0 ? Math.round((hnTotal / totalVotes) * 100) : 0;
  
  const hasVoted = have.includes(me) || haveNot.includes(me);

  const handleVote = (didIt: boolean) => {
    if (hasVoted) return;

    const newState = { ...state };
    if (didIt) newState.have = [...have, me];
    else newState.haveNot = [...haveNot, me];

    useChatStore.getState().editMessage(conversationId, gameStateMsg!.id, JSON.stringify(newState));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-[85vw] sm:w-[70vw] md:w-[340px] bg-black/60 backdrop-blur-3xl rounded-[24px] border border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] relative isolate hardware-accelerated mx-auto"
    >
      {/* Background glow when voted */}
      <AnimatePresence>
        {hasVoted && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.3 }} 
            className={`absolute inset-0 blur-[60px] -z-10 ${have.includes(me) ? "bg-[#ff0844]" : "bg-[#00d2ff]"}`} 
          />
        )}
      </AnimatePresence>

      <div className="bg-gradient-to-br from-[#8E2DE2] to-[#4A00E0] p-5 text-center relative overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.3)]">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <div className="flex flex-col items-center gap-2 relative z-10">
          <motion.div animate={{ rotate: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 3 }} className="bg-white/20 p-2 rounded-full border border-white/10 backdrop-blur-md mb-1 shadow-lg">
            <Flame className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </motion.div>
          <span className="text-[16px] font-black tracking-wide text-white leading-relaxed drop-shadow-md">"{question}"</span>
        </div>
      </div>

      <div className="p-5 flex gap-3.5 relative bg-black/20">
        {/* Yes Button */}
        <motion.button
          whileHover={!hasVoted ? { scale: 1.03, boxShadow: "0 5px 15px rgba(255,8,68,0.3)" } : {}}
          whileTap={!hasVoted ? { scale: 0.95 } : {}}
          onClick={() => handleVote(true)}
          disabled={hasVoted}
          className={`relative flex-1 min-h-[90px] rounded-[18px] overflow-hidden group border transition-all flex flex-col items-center justify-center text-center p-3 preserve-3d ${
            hasVoted 
              ? have.includes(me) 
                ? "bg-white/10 border-[#ff0844]/50 shadow-[0_0_20px_rgba(255,8,68,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]" 
                : "bg-white/5 border-white/5 opacity-50 grayscale"
              : "bg-white/5 border-white/10 hover:border-[#ff0844]/40 hover:bg-white/10 shadow-inner cursor-pointer"
          }`}
        >
          {/* Liquid Progress Fill */}
          <AnimatePresence>
            {hasVoted && (
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${pHave}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 15 }}
                className="absolute left-0 right-0 bottom-0 bg-gradient-to-t from-[#ff0844]/80 to-[#ffb199]/80 backdrop-blur-sm -z-10 shadow-[0_-5px_15px_rgba(255,8,68,0.5)]"
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-white/50" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10 flex flex-col items-center gap-1.5 translate-z-[20px]">
            <span className={`text-[16px] ${hasVoted && have.includes(me) ? "font-black text-white drop-shadow-md" : "font-bold text-[#e0e0e0]"}`}>
              عملتها 🫣
            </span>
            {hasVoted && (
              <motion.span 
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                className="text-[18px] font-black text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]"
              >
                {pHave}%
              </motion.span>
            )}
          </div>
        </motion.button>

        {/* No Button */}
        <motion.button
          whileHover={!hasVoted ? { scale: 1.03, boxShadow: "0 5px 15px rgba(0,210,255,0.3)" } : {}}
          whileTap={!hasVoted ? { scale: 0.95 } : {}}
          onClick={() => handleVote(false)}
          disabled={hasVoted}
          className={`relative flex-1 min-h-[90px] rounded-[18px] overflow-hidden group border transition-all flex flex-col items-center justify-center text-center p-3 preserve-3d ${
            hasVoted 
              ? haveNot.includes(me) 
                ? "bg-white/10 border-[#00d2ff]/50 shadow-[0_0_20px_rgba(0,210,255,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]" 
                : "bg-white/5 border-white/5 opacity-50 grayscale"
              : "bg-white/5 border-white/10 hover:border-[#00d2ff]/40 hover:bg-white/10 shadow-inner cursor-pointer"
          }`}
        >
          {/* Liquid Progress Fill */}
          <AnimatePresence>
            {hasVoted && (
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${pHaveNot}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 15 }}
                className="absolute left-0 right-0 bottom-0 bg-gradient-to-t from-[#00d2ff]/80 to-[#3a7bd5]/80 backdrop-blur-sm -z-10 shadow-[0_-5px_15px_rgba(0,210,255,0.5)]"
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-white/50" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10 flex flex-col items-center gap-1.5 translate-z-[20px]">
            <span className={`text-[16px] ${hasVoted && haveNot.includes(me) ? "font-black text-white drop-shadow-md" : "font-bold text-[#e0e0e0]"}`}>
              معملتهاش 😇
            </span>
            {hasVoted && (
              <motion.span 
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                className="text-[18px] font-black text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]"
              >
                {pHaveNot}%
              </motion.span>
            )}
          </div>
        </motion.button>
      </div>

      {hasVoted && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="px-5 pb-5 pt-1 flex justify-between items-center text-[12px] font-bold text-[#888] bg-black/20"
        >
          <div className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 shadow-inner flex items-center gap-1.5">
            إجمالي المشاركات: <span className="text-white ml-1 font-black">{totalVotes.toLocaleString("ar-EG")}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={initializeGame}
            className="flex items-center gap-1.5 text-[#00d2ff] hover:text-white transition-colors bg-[#00d2ff]/10 px-3 py-1.5 rounded-md border border-[#00d2ff]/20"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            سؤال جديد
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
