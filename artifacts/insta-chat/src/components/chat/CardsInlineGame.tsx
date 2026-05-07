import { useMemo } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { Coins, Swords } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type CardsStartPayload = { kind: "cards_start"; gameId: string; createdBy: string; createdAt: string; mode: "war" | "high_card"; };
type CardsDrawPayload = { kind: "cards_draw"; gameId: string; by: string; at: string; };

type Suit = "S" | "H" | "D" | "C";
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
type Card = { suit: Suit; rank: Rank };

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

function xorshift32(seed: number): () => number {
  let x = seed | 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function makeDeck(): Card[] {
  const suits: Suit[] = ["S", "H", "D", "C"];
  const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const out: Card[] = [];
  for (const su of suits) for (const r of ranks) out.push({ suit: su, rank: r });
  return out;
}

function shuffle(deck: Card[], seed: string): Card[] {
  const rnd = xorshift32(hashSeed(seed));
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

function rankLabel(r: Rank): string {
  if (r <= 10) return String(r);
  if (r === 11) return "J";
  if (r === 12) return "Q";
  if (r === 13) return "K";
  return "A";
}

function suitEmoji(s: Suit): string {
  if (s === "S") return "♠";
  if (s === "H") return "♥";
  if (s === "D") return "♦";
  return "♣";
}

function cmpCard(a: Card, b: Card): -1 | 0 | 1 {
  if (a.rank === b.rank) return 0;
  return a.rank > b.rank ? 1 : -1;
}

function pickLastDraw(messages: Message[], gameId: string, by: string): number {
  let n = 0;
  for (const m of messages) {
    if (m.type !== "game") continue;
    const p = safeJsonParse<CardsDrawPayload>(m.content);
    if (!p || p.kind !== "cards_draw" || p.gameId !== gameId) continue;
    if (p.by.toLowerCase() !== by.toLowerCase()) continue;
    n++;
  }
  return n;
}

export function CardsInlineGame({ gameMessage, otherUserId, conversationId, allMessages }: { gameMessage: Message; otherUserId: string; conversationId: string; allMessages: Message[] }) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();

  const start = useMemo(() => safeJsonParse<CardsStartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "cards_start" ? start.gameId : null;

  const deck = useMemo(() => (gameId ? shuffle(makeDeck(), `cards:${gameId}`) : []), [gameId]);

  const myDrawCount = useMemo(() => (gameId ? pickLastDraw(allMessages, gameId, me) : 0), [allMessages, gameId, me]);
  const theirDrawCount = useMemo(() => (gameId ? pickLastDraw(allMessages, gameId, otherUserId) : 0), [allMessages, gameId, otherUserId]);

  const myCard = deck[myDrawCount - 1] ?? null;
  const theirCard = deck[theirDrawCount - 1] ?? null;

  const status = useMemo(() => {
    if (!start || !gameId) return { title: "كوتشينة", sub: "خطأ في بيانات اللعبة.", myPts: 0, theirPts: 0, winner: 0 };
    if (start.mode === "high_card") {
      if (!myCard && !theirCard) return { title: "أعلى ورقة", sub: "اسحبوا ورقة... الأعلى يكسب.", myPts: 0, theirPts: 0, winner: -1 };
      if (myCard && !theirCard) return { title: "أعلى ورقة", sub: "ممتاز... في انتظار الطرف التاني.", myPts: 0, theirPts: 0, winner: -1 };
      if (!myCard && theirCard) return { title: "أعلى ورقة", sub: "الطرف التاني سحب... دورك.", myPts: 0, theirPts: 0, winner: -1 };
      const c = cmpCard(myCard!, theirCard!);
      if (c === 0) return { title: "تعادل!", sub: "لا يوجد فائز", myPts: 0, theirPts: 0, winner: 0 };
      if (c === 1) return { title: "أنت كسبت! 🎉", sub: `ورقتك أعلى`, myPts: 1, theirPts: 0, winner: 1 };
      return { title: "الخصم كسب", sub: `ورقته أعلى`, myPts: 0, theirPts: 1, winner: 2 };
    }

    const rounds = Math.min(myDrawCount, theirDrawCount);
    let myPts = 0; let theirPts = 0;
    for (let i = 0; i < rounds; i++) {
      const a = deck[i]!; const b = deck[i + 26] ?? deck[i]!;
      const c = cmpCard(a, b);
      if (c === 1) myPts++; else if (c === -1) theirPts++;
    }
    const needs = myDrawCount === theirDrawCount ? "اسحبوا للجولة التالية." : myDrawCount < theirDrawCount ? "دورك تسحب." : "في انتظار الطرف التاني.";
    
    let winner = -1;
    if (myCard && theirCard) {
      const currentCmp = cmpCard(myCard, theirCard);
      winner = currentCmp === 1 ? 1 : currentCmp === -1 ? 2 : 0;
    }
    
    return { title: `حرب (نقط)`, sub: `${needs}`, myPts, theirPts, winner };
  }, [deck, gameId, myCard, myDrawCount, start, theirCard, theirDrawCount]);

  if (!start || !gameId) return <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">رسالة كوتشينة غير صالحة.</div>;

  const canDraw = start.mode === "high_card" ? myDrawCount === 0 : myDrawCount <= theirDrawCount;

  const draw = () => {
    if (!canDraw) return;
    sendMessage(conversationId, JSON.stringify({ kind: "cards_draw", gameId, by: me, at: new Date().toISOString() }), "game");
  };

  const renderCard = (card: Card | null, isHidden: boolean = false, isMine: boolean = false) => {
    if (!card) {
      return (
        <div className="w-[72px] h-[104px] sm:w-[88px] sm:h-[128px] rounded-xl border-2 border-dashed border-white/20 bg-black/10 flex flex-col items-center justify-center text-white/30 font-bold text-[11px] shadow-inner">
          <span className="opacity-50">فارغ</span>
        </div>
      );
    }
    
    return (
      <div className="w-[72px] h-[104px] sm:w-[88px] sm:h-[128px] perspective-[1000px]">
        <motion.div
          className="w-full h-full relative preserve-3d"
          initial={{ rotateY: 180, scale: 0.8, y: 50, opacity: 0 }}
          animate={{ rotateY: isHidden ? 180 : 0, scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, duration: 0.8 }}
        >
          {/* Front of Card */}
          <div className="absolute inset-0 backface-hidden rounded-xl bg-gradient-to-br from-[#ffffff] to-[#f4f1ea] shadow-[0_10px_25px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(0,0,0,0.05)] flex flex-col justify-between p-1.5 sm:p-2 select-none overflow-hidden">
            {/* Subtle glow if winner */}
            {!isHidden && status.winner === (isMine ? 1 : 2) && (
              <div className="absolute inset-0 ring-4 ring-yellow-400/80 rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-pulse pointer-events-none z-20" />
            )}
            
            {(() => {
              const isRed = card.suit === "H" || card.suit === "D";
              const colorClass = isRed ? "text-[#d90000]" : "text-[#111111]";
              return (
                <>
                  <div className={`text-left text-[14px] sm:text-[18px] font-black leading-none ${colorClass}`}>
                    <div>{rankLabel(card.rank)}</div>
                    <div className="text-[10px] sm:text-[14px] -mt-1">{suitEmoji(card.suit)}</div>
                  </div>
                  <div className={`absolute inset-0 flex flex-col items-center justify-center opacity-90 ${colorClass}`}>
                    <div className="text-4xl sm:text-5xl drop-shadow-sm">{suitEmoji(card.suit)}</div>
                  </div>
                  <div className={`text-right text-[14px] sm:text-[18px] font-black leading-none rotate-180 ${colorClass}`}>
                    <div>{rankLabel(card.rank)}</div>
                    <div className="text-[10px] sm:text-[14px] -mt-1">{suitEmoji(card.suit)}</div>
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* Back of Card */}
          <div className="absolute inset-0 backface-hidden rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.6)] p-1.5 flex items-center justify-center rotate-y-180">
            <div className="w-full h-full rounded-md bg-[#8b0000] border-2 border-white/20 flex items-center justify-center overflow-hidden relative shadow-inner">
              <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]" />
              <div className="w-8 h-12 border border-white/40 rounded-sm relative z-10" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="rounded-[32px] border border-white/10 bg-[#0a1a0f] overflow-hidden w-full max-w-[400px] mx-auto shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.05)] relative font-sans">
      {/* 3D Green Felt Table */}
      <div 
        className="absolute inset-0 opacity-80 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')] mix-blend-overlay"
        style={{
          boxShadow: 'inset 0 100px 100px rgba(0,0,0,0.9), inset 0 -50px 50px rgba(0,0,0,0.8)'
        }}
      />
      
      {/* Light spotlight from top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-white/10 blur-[80px] pointer-events-none" />
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-green-950/80 via-emerald-900/80 to-green-950/80 px-4 py-3 flex items-center justify-between border-b border-white/5 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-black/40 border border-white/10 shadow-inner">
            {start.mode === "war" ? <Swords className="w-4 h-4 text-yellow-500" /> : <Coins className="w-4 h-4 text-yellow-500" />}
          </div>
          <div>
            <div className="text-[14px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 tracking-wide drop-shadow-sm">{status.title}</div>
            <div className="text-[10px] text-green-300/80 font-medium">{status.sub}</div>
          </div>
        </div>
        {start.mode === "war" && (
          <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
            <span className="text-blue-400 font-black text-[14px] drop-shadow-sm">{status.myPts ?? 0}</span>
            <span className="text-white/30 text-[10px]">-</span>
            <span className="text-red-400 font-black text-[14px] drop-shadow-sm">{status.theirPts ?? 0}</span>
          </div>
        )}
      </div>

      <div className="p-5 pb-6 relative z-10 perspective-[800px]">
        {/* Draw Button Area */}
        <div className="flex justify-center mb-8 relative z-20">
          <motion.button
            whileHover={canDraw ? { scale: 1.05, y: -2 } : {}}
            whileTap={canDraw ? { scale: 0.95 } : {}}
            onClick={draw}
            disabled={!canDraw}
            className={`w-full max-w-[200px] py-3 rounded-2xl text-[14px] font-black transition-all shadow-xl relative overflow-hidden border ${
              canDraw
                ? "bg-gradient-to-b from-yellow-400 to-amber-600 text-black border-yellow-300/50 shadow-[0_10px_20px_rgba(217,119,6,0.4),inset_0_1px_0_rgba(255,255,255,0.4)]"
                : "bg-black/40 text-white/30 cursor-not-allowed border-white/5 backdrop-blur-sm"
            }`}
          >
            {canDraw ? "🃏 اسحب ورقة" : "في انتظار الخصم"}
            {canDraw && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />}
          </motion.button>
        </div>

        {/* Cards Area with Perspective */}
        <div className="flex justify-between items-center px-2 sm:px-4 relative preserve-3d" style={{ transform: "rotateX(10deg)" }}>
          
          {/* Table Center Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-green-500/20 blur-[40px] pointer-events-none rounded-full" />

          {/* My Card */}
          <div className="flex flex-col items-center gap-4 relative z-10">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-black/60 px-4 py-1.5 rounded-full text-[11px] text-white font-bold border border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.5)] backdrop-blur-md">
              أنت
            </motion.div>
            {renderCard(myCard, false, true)}
          </div>
          
          <div className="text-white/10 font-black italic text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pb-4 z-0">
            VS
          </div>

          {/* Their Card */}
          <div className="flex flex-col items-center gap-4 relative z-10">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-black/60 px-4 py-1.5 rounded-full text-[11px] text-[#a8a8a8] border border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.5)] backdrop-blur-md">
              الخصم
            </motion.div>
            {renderCard(theirCard, start.mode === "high_card" && theirCard && !myCard, false)}
          </div>
        </div>
      </div>
    </div>
  );
}
