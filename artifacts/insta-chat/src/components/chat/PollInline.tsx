import { Message, CURRENT_USER, User } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import { useMemo } from "react";
import { Check, BarChart2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  msg: Message;
  conversationId: string;
  isOwn: boolean;
  participants: User[];
}

export function PollInline({ msg, conversationId, isOwn, participants }: Props) {
  const { votePoll } = useChatStore();
  const poll = msg.poll;
  if (!poll) return null;

  const totalVotes = useMemo(() => {
    return poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);
  }, [poll.options]);

  const allVoters = useMemo(() => {
    const set = new Set<string>();
    poll.options.forEach(opt => opt.votes.forEach(v => set.add(v)));
    return set.size;
  }, [poll.options]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`w-[85vw] sm:w-[70vw] md:w-[340px] max-w-full rounded-[24px] overflow-hidden ${isOwn ? "bg-gradient-to-br from-[#00d2ff]/10 to-[#3a7bd5]/10 border-[#00d2ff]/20" : "bg-black/60 border-white/10"} border backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] relative isolate hardware-accelerated mx-auto`}
    >
      {/* Background glow if there are votes */}
      <AnimatePresence>
        {totalVotes > 0 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.15 }} 
            className="absolute top-0 right-0 w-40 h-40 bg-[#00d2ff] blur-[60px] rounded-full -z-10 pointer-events-none" 
          />
        )}
      </AnimatePresence>

      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 className={`w-5 h-5 ${isOwn ? "text-[#00d2ff]" : "text-[#a8a8a8]"} drop-shadow-[0_0_8px_rgba(0,210,255,0.5)]`} />
          <span className={`text-[12px] font-black tracking-widest uppercase ${isOwn ? "text-[#00d2ff]" : "text-[#a8a8a8]"}`}>تصويت</span>
        </div>
        <h3 className="text-[17px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#e0e0e0] mb-5 leading-snug drop-shadow-sm">{poll.question}</h3>

        <div className="flex flex-col gap-2.5">
          {poll.options.map((opt) => {
            const votesCount = opt.votes.length;
            const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
            const isMyVote = opt.votes.includes(CURRENT_USER.username);

            return (
              <motion.button
                key={opt.id}
                whileHover={{ scale: 1.02, boxShadow: isMyVote ? "0 5px 15px rgba(0,210,255,0.3)" : "0 5px 15px rgba(0,0,0,0.5)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => votePoll(conversationId, msg.id, opt.id)}
                className={`relative w-full text-right transition-all rounded-[16px] overflow-hidden min-h-[50px] flex items-center group preserve-3d border ${
                  isMyVote 
                    ? "bg-white/10 border-[#00d2ff]/50 shadow-[0_0_15px_rgba(0,210,255,0.1),inset_0_1px_0_rgba(255,255,255,0.2)]" 
                    : "bg-black/40 hover:bg-white/5 border-white/5 hover:border-white/10"
                }`}
              >
                {/* Progress Bar Background */}
                <AnimatePresence>
                  {totalVotes > 0 && (
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ type: "spring", stiffness: 50, damping: 15 }}
                      className={`absolute left-0 top-0 bottom-0 -z-10 ${isMyVote ? "bg-gradient-to-r from-[#00d2ff]/40 to-[#3a7bd5]/40 backdrop-blur-sm shadow-[5px_0_15px_rgba(0,210,255,0.5)]" : "bg-white/5"}`}
                    >
                      {isMyVote && <div className="absolute top-0 right-0 w-[2px] h-full bg-white/50" />}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content */}
                <div className="relative z-10 flex items-center justify-between w-full px-4 py-3 translate-z-[10px]">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors shadow-sm ${isMyVote ? "border-[#00d2ff] bg-[#00d2ff] shadow-[0_0_10px_rgba(0,210,255,0.8)]" : "border-white/20 group-hover:border-white/40"}`}>
                      <AnimatePresence>
                        {isMyVote && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className={`text-[15px] ${isMyVote ? "font-black text-white drop-shadow-md" : "font-semibold text-[#e0e0e0]"}`}>
                      {opt.text}
                    </span>
                  </div>

                  <AnimatePresence>
                    {totalVotes > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 shrink-0">
                        {/* Avatar piles */}
                        <div className="flex -space-x-2 space-x-reverse mr-2">
                          {opt.votes.slice(0, 3).map((v, i) => {
                            const p = participants.find(x => x.username === v) || (v === CURRENT_USER.username ? CURRENT_USER : null);
                            if (!p) return null;
                            return (
                              <motion.img 
                                initial={{ scale: 0, x: -10 }} animate={{ scale: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                key={v} src={p.avatarUrl} 
                                className={`w-6 h-6 rounded-full ring-2 ${isMyVote ? "ring-[#3a7bd5]" : "ring-[#1c1c1c]"} object-cover shadow-md`} 
                                alt="" 
                              />
                            );
                          })}
                        </div>
                        <span className={`text-[13px] ${isMyVote ? "font-black text-[#00d2ff] drop-shadow-[0_0_5px_rgba(0,210,255,0.5)]" : "font-bold text-[#a8a8a8]"}`}>
                          {percentage}%
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            );
          })}
        </div>
        
        <div className="mt-4 flex justify-between items-center text-[11px] font-bold text-[#888] bg-black/20 px-3 py-2 rounded-xl border border-white/5">
          <div className="flex items-center gap-1.5 text-white/70">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{allVoters} {allVoters === 1 ? "صوت" : "أصوات"}</span>
          </div>
          {poll.multipleAnswers && <span className="bg-white/5 px-2 py-0.5 rounded text-white/50 border border-white/5">أكثر من إجابة</span>}
        </div>
      </div>
    </motion.div>
  );
}
