import { Message, CURRENT_USER, User } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import { useMemo } from "react";
import { Check } from "lucide-react";

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
    <div className={`w-[85vw] sm:w-[70vw] md:w-[320px] max-w-full rounded-[22px] overflow-hidden ${isOwn ? "bg-white/10" : "bg-[#1c1c1c]"} border border-white/10`}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[18px]">📊</span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-[#a8a8a8]">تصويت</span>
        </div>
        <h3 className="text-[16px] font-bold text-white mb-4 leading-snug">{poll.question}</h3>

        <div className="flex flex-col gap-2">
          {poll.options.map((opt) => {
            const votesCount = opt.votes.length;
            const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
            const isMyVote = opt.votes.includes(CURRENT_USER.username);

            return (
              <button
                key={opt.id}
                onClick={() => votePoll(conversationId, msg.id, opt.id)}
                className="relative w-full text-right bg-black/40 hover:bg-black/60 transition-colors rounded-xl overflow-hidden min-h-[44px] flex items-center group"
              >
                {/* Progress Bar Background */}
                <div 
                  className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out ${isMyVote ? "bg-[#0095f6]/30" : "bg-white/10"}`}
                  style={{ width: `${percentage}%` }}
                />

                {/* Content */}
                <div className="relative z-10 flex items-center justify-between w-full px-4 py-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isMyVote ? "border-[#0095f6] bg-[#0095f6]" : "border-white/30 group-hover:border-white/50"}`}>
                      {isMyVote && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className={`text-[14px] ${isMyVote ? "font-bold text-white" : "font-medium text-[#e0e0e0]"}`}>
                      {opt.text}
                    </span>
                  </div>

                  {totalVotes > 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Avatar piles */}
                      <div className="flex -space-x-1 space-x-reverse mr-2">
                        {opt.votes.slice(0, 3).map(v => {
                          const p = participants.find(x => x.username === v) || (v === CURRENT_USER.username ? CURRENT_USER : null);
                          if (!p) return null;
                          return (
                            <img key={v} src={p.avatarUrl} className="w-5 h-5 rounded-full ring-2 ring-[#1c1c1c] object-cover" alt="" />
                          );
                        })}
                      </div>
                      <span className={`text-[12px] ${isMyVote ? "font-bold text-[#0095f6]" : "text-[#a8a8a8]"}`}>
                        {percentage}%
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        
        <div className="mt-3 text-[11px] text-[#737373] text-left">
          {allVoters} {allVoters === 1 ? "صوت" : "أصوات"} {poll.multipleAnswers ? "• يمكن اختيار أكثر من إجابة" : ""}
        </div>
      </div>
    </div>
  );
}
