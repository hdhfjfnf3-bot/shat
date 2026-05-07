import { useState, useMemo } from "react";
import { Message, User, CURRENT_USER } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Sparkles, Zap, RotateCcw } from "lucide-react";

interface Props {
  gameMessage: Message;
  conversationId: string;
  allMessages: Message[];
  participants?: User[];
}

const WYR_QUESTIONS = [
  { opt1: "تاكل كشري طول عمرك", opt2: "تاكل محشي طول عمرك" },
  { opt1: "تعيش في الزمالك مفلس", opt2: "تعيش في منطقة عشوائية بس مليونير" },
  { opt1: "تقرأ أفكار الناس", opt2: "تقدر تطير" },
  { opt1: "تشتغل شغلانة بتكرهها بمرتب خيالي", opt2: "شغلانة بتحبها بمرتب يادوب مكفيك" },
  { opt1: "تمسح كل صورك القديمة", opt2: "تمسح كل رسايلك" },
  { opt1: "تتجوز عن حب وتتعبوا مادياً", opt2: "صالونات وتعيشوا مرتاحين" },
  { opt1: "تعرف إمتى هتموت", opt2: "تعرف إزاي هتموت" },
  { opt1: "تسافر عبر الزمن للماضي", opt2: "تسافر للمستقبل" },
  { opt1: "يكون عندك زرار يرجع الزمن دقيقة", opt2: "زرار يوقف الزمن 10 دقايق" },
  { opt1: "تفقد القدرة على الكلام", opt2: "تفقد القدرة على السمع" },
  { opt1: "تنسى كل ذكرياتك وتعيش من جديد", opt2: "تعيش نفس اليوم بيتكرر كل يوم" },
  { opt1: "تتكلم كل لغات العالم", opt2: "تقدر تعزف على كل الآلات الموسيقية" },
  { opt1: "صاحبك الانتيم يبيعك", opt2: "حبيبك يخونك" },
  { opt1: "تسافر بلد نفسك فيها لوحدك", opt2: "تصيف في جمصة مع كل صحابك" },
  { opt1: "موبايلك يقع في الماية", opt2: "موبايلك يضيع في الزحمة وميتقفلش" },
  { opt1: "تبقى شخص مشهور بس مكروه", opt2: "شخص عادي بس كل الناس بتحبه" },
  { opt1: "تلبس صيفي في عز التلج", opt2: "تلبس شتوي في عز الحر" },
  { opt1: "تنام 12 ساعة متواصل", opt2: "تنام ساعتين وتصحى فايق جداً" },
  { opt1: "تخسر حاسة التذوق", opt2: "تخسر حاسة الشم" },
  { opt1: "تتفرج على فيلم رعب لوحدك في الضلمة", opt2: "تمشي في مقابر بالليل" },
  { opt1: "تعيش في عالم مفيش فيه إنترنت", opt2: "مفيش فيه تلفزيون" },
  { opt1: "تكون أذكى إنسان في العالم بس محدش يصدقك", opt2: "تكون غبي بس الناس مبهورة بيك" },
  { opt1: "تكون دايماً متأخر 10 دقايق", opt2: "توصل بدري ساعة في كل ميعاد" },
  { opt1: "تاكل شاورما من غير تومية", opt2: "كبدة إسكندراني من غير طحينة" },
  { opt1: "تنسى باسوورد الواي فاي للأبد", opt2: "النت يفصل عنك كل نص ساعة" },
  { opt1: "تتكلم مع الحيوانات", opt2: "تتحكم في الطقس" },
  { opt1: "تكتشف سر الكون", opt2: "تعرف سر السعادة الأبدية" },
  { opt1: "تبدل حياتك مع أغنى واحد في العالم ليوم", opt2: "تبدل مع أكتر حد مبسوط ليوم" },
  { opt1: "يكون شكلك حلو جداً بس دمك تقيل", opt2: "شكلك عادي بس دمك خفيف جداً" },
  { opt1: "تغسل المواعين بقية عمرك", opt2: "تطبق الغسيل بقية عمرك" },
  { opt1: "تشرب قهوة باردة", opt2: "تشرب شاي من غير سكر" },
  { opt1: "تعرف كل حاجة بتتقال في ضهرك", opt2: "متعرفش حاجة خالص وتعيش مرتاح" }
];

export function WouldYouRatherInline({ gameMessage, conversationId, allMessages, participants }: Props) {
  const { sendMessage } = useChatStore();
  const [isLoading, setIsLoading] = useState(false);

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

  // If no state exists, we need to initialize it.
  // If it exists but we want a "new game", we UPDATE the existing message state so it continues in the same bubble.
  const initializeGame = () => {
    setIsLoading(true);
    setTimeout(() => {
      const q = WYR_QUESTIONS[Math.floor(Math.random() * WYR_QUESTIONS.length)];
      
      // Generate realistic deterministic global votes based on the text
      const seed = q.opt1.length * 13 + q.opt2.length * 7;
      const totalGlobal = 15000 + (seed * 100) % 85000;
      const p1Global = 20 + (seed % 60); // 20% to 80%
      const global1 = Math.floor((totalGlobal * p1Global) / 100);
      const global2 = totalGlobal - global1;

      const newState = {
        kind: "wyr_state",
        opt1: q.opt1,
        opt2: q.opt2,
        votes1: [],
        votes2: [],
        global1,
        global2
      };
      if (gameStateMsg) {
        useChatStore.getState().editMessage(conversationId, gameStateMsg.id, JSON.stringify(newState));
      } else {
        sendMessage(conversationId, JSON.stringify(newState), "game", gameMessage.id);
      }
      setIsLoading(false);
    }, 400);
  };

  if (!state) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-[85vw] sm:w-[70vw] md:w-[320px] rounded-[24px] p-[2px] bg-gradient-to-br from-[#ff0844] to-[#ffb199] shadow-[0_20px_50px_rgba(255,8,68,0.4)] relative overflow-hidden isolate hardware-accelerated mx-auto"
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl rounded-[22px] -z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,8,68,0.5),transparent_70%)] rounded-[22px] -z-10 blur-xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center p-6 border border-white/10 rounded-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          <motion.div 
            animate={{ rotate: [-5, 5, -5], scale: [1, 1.05, 1] }} 
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="mb-4 relative"
          >
            <div className="absolute inset-0 bg-[#ff0844] blur-xl opacity-60 rounded-full" />
            <Scale className="w-14 h-14 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] relative z-10" />
          </motion.div>
          
          <h3 className="text-[19px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-[#ffb199] uppercase mb-2 drop-shadow-sm">لو خيروك</h3>
          <p className="text-[13px] text-white/80 font-bold mb-6">مستعد تختار بين اختيارين أصعب من بعض؟</p>
          
          <motion.button
            whileHover={!isLoading ? { scale: 1.05, boxShadow: "0 10px 25px rgba(255,8,68,0.5)" } : {}}
            whileTap={!isLoading ? { scale: 0.95 } : {}}
            onClick={initializeGame}
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#ff0844] to-[#ff4d4f] text-white font-black text-[15px] rounded-[16px] transition-all relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <Zap className="w-4 h-4" />
                ابدأ اللعبة
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    );
  }

  const { opt1, opt2, votes1, votes2, global1 = 0, global2 = 0 } = state;
  const me = CURRENT_USER.username;
  
  const v1Total = votes1.length + global1;
  const v2Total = votes2.length + global2;
  const totalVotes = v1Total + v2Total;
  
  const p1 = totalVotes > 0 ? Math.round((v1Total / totalVotes) * 100) : 0;
  const p2 = totalVotes > 0 ? Math.round((v2Total / totalVotes) * 100) : 0;
  
  const hasVoted = votes1.includes(me) || votes2.includes(me);
  const myVote = votes1.includes(me) ? 1 : votes2.includes(me) ? 2 : null;

  const handleVote = (optNum: 1 | 2) => {
    if (hasVoted) return;

    const newState = { ...state };
    if (optNum === 1) newState.votes1 = [...votes1, me];
    if (optNum === 2) newState.votes2 = [...votes2, me];

    useChatStore.getState().editMessage(conversationId, gameStateMsg!.id, JSON.stringify(newState));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-[85vw] sm:w-[70vw] md:w-[340px] bg-black/60 backdrop-blur-3xl rounded-[24px] border border-white/10 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] relative isolate hardware-accelerated mx-auto"
    >
      {/* Background glow when voted */}
      <AnimatePresence>
        {hasVoted && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.25 }} 
            className={`absolute inset-0 blur-[60px] -z-10 ${myVote === 1 ? "bg-[#ff0844]" : "bg-[#00d2ff]"}`} 
          />
        )}
      </AnimatePresence>

      <div className="bg-gradient-to-br from-[#ff0844]/20 to-[#ffb199]/20 border-b border-white/[0.05] p-4 text-center relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <div className="flex items-center justify-center gap-2 relative z-10">
          <Scale className="w-5 h-5 text-[#ffb199] drop-shadow-[0_0_8px_rgba(255,177,153,0.8)]" />
          <span className="text-[14px] font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-[#ffb199] drop-shadow-md">لو خيروك</span>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4 relative bg-black/20">
        
        {/* Option 1 */}
        <motion.button
          whileHover={!hasVoted ? { scale: 1.02, boxShadow: "0 5px 20px rgba(255,8,68,0.3)" } : {}}
          whileTap={!hasVoted ? { scale: 0.98 } : {}}
          onClick={() => handleVote(1)}
          disabled={hasVoted}
          className={`relative w-full min-h-[70px] rounded-[18px] overflow-hidden group border transition-all flex flex-col justify-center text-right p-4 preserve-3d ${
            hasVoted 
              ? myVote === 1 
                ? "bg-white/10 border-[#ff0844]/50 shadow-[0_0_20px_rgba(255,8,68,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]" 
                : "bg-white/5 border-white/5 opacity-50 grayscale"
              : "bg-white/5 border-white/10 hover:border-[#ff0844]/40 hover:bg-white/10 shadow-inner cursor-pointer"
          }`}
        >
          <AnimatePresence>
            {hasVoted && (
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${p1}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 15 }}
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#ff0844]/80 to-[#ffb199]/80 backdrop-blur-sm -z-10 shadow-[5px_0_15px_rgba(255,8,68,0.5)]"
              >
                <div className="absolute top-0 right-0 w-[2px] h-full bg-white/50" />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="relative z-10 flex flex-col w-full translate-z-[20px]">
            <span className={`text-[16px] leading-snug ${hasVoted && myVote === 1 ? "font-black text-white drop-shadow-md" : "font-bold text-[#e0e0e0]"}`}>
              {opt1}
            </span>
            {hasVoted && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-[13px] font-black text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)] mt-2 flex justify-between"
              >
                <span>{votes1.length} أصوات</span>
                <span className="text-[#ffb199]">{p1}%</span>
              </motion.div>
            )}
          </div>
        </motion.button>

        <div className="flex justify-center -my-3 relative z-20 pointer-events-none">
          <motion.div 
            animate={!hasVoted ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#222] to-[#000] border border-white/20 flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.8)]"
          >
            <span className="text-[11px] font-black text-[#a8a8a8] uppercase drop-shadow-md">أو</span>
          </motion.div>
        </div>

        {/* Option 2 */}
        <motion.button
          whileHover={!hasVoted ? { scale: 1.02, boxShadow: "0 5px 20px rgba(0,210,255,0.3)" } : {}}
          whileTap={!hasVoted ? { scale: 0.98 } : {}}
          onClick={() => handleVote(2)}
          disabled={hasVoted}
          className={`relative w-full min-h-[70px] rounded-[18px] overflow-hidden group border transition-all flex flex-col justify-center text-right p-4 preserve-3d ${
            hasVoted 
              ? myVote === 2 
                ? "bg-white/10 border-[#00d2ff]/50 shadow-[0_0_20px_rgba(0,210,255,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]" 
                : "bg-white/5 border-white/5 opacity-50 grayscale"
              : "bg-white/5 border-white/10 hover:border-[#00d2ff]/40 hover:bg-white/10 shadow-inner cursor-pointer"
          }`}
        >
          <AnimatePresence>
            {hasVoted && (
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${p2}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 15 }}
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#00d2ff]/80 to-[#3a7bd5]/80 backdrop-blur-sm -z-10 shadow-[5px_0_15px_rgba(0,210,255,0.5)]"
              >
                <div className="absolute top-0 right-0 w-[2px] h-full bg-white/50" />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="relative z-10 flex flex-col w-full translate-z-[20px]">
            <span className={`text-[16px] leading-snug ${hasVoted && myVote === 2 ? "font-black text-white drop-shadow-md" : "font-bold text-[#e0e0e0]"}`}>
              {opt2}
            </span>
            {hasVoted && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-[13px] font-black text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)] mt-2 flex justify-between"
              >
                <span>{votes2.length} أصوات</span>
                <span className="text-[#00d2ff]">{p2}%</span>
              </motion.div>
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
            <RotateCcw className="w-3.5 h-3.5" />
            سؤال جديد
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
