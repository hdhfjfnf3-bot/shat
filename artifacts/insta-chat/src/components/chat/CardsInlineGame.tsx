import { useMemo } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { Coins, Swords } from "lucide-react";

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
    if (!start || !gameId) return { title: "كوتشينة", sub: "خطأ في بيانات اللعبة." };
    if (start.mode === "high_card") {
      if (!myCard && !theirCard) return { title: "أعلى ورقة", sub: "اسحبوا ورقة... الأعلى يكسب." };
      if (myCard && !theirCard) return { title: "أعلى ورقة", sub: "ممتاز... في انتظار الطرف التاني." };
      if (!myCard && theirCard) return { title: "أعلى ورقة", sub: "الطرف التاني سحب... دورك." };
      const c = cmpCard(myCard!, theirCard!);
      if (c === 0) return { title: "تعادل!", sub: "لا يوجد فائز" };
      if (c === 1) return { title: "أنت كسبت! 🎉", sub: `ورقتك أعلى` };
      return { title: "الخصم كسب", sub: `ورقته أعلى` };
    }

    const rounds = Math.min(myDrawCount, theirDrawCount);
    let myPts = 0; let theirPts = 0;
    for (let i = 0; i < rounds; i++) {
      const a = deck[i]!; const b = deck[i + 26] ?? deck[i]!;
      const c = cmpCard(a, b);
      if (c === 1) myPts++; else if (c === -1) theirPts++;
    }
    const needs = myDrawCount === theirDrawCount ? "اسحبوا للجولة التالية." : myDrawCount < theirDrawCount ? "دورك تسحب." : "في انتظار الطرف التاني.";
    return { title: `حرب (نقط)`, sub: `${needs}`, myPts, theirPts };
  }, [deck, gameId, myCard, myDrawCount, start, theirCard, theirDrawCount]);

  if (!start || !gameId) return <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">رسالة كوتشينة غير صالحة.</div>;

  const canDraw = start.mode === "high_card" ? myDrawCount === 0 : myDrawCount <= theirDrawCount;

  const draw = () => {
    if (!canDraw) return;
    sendMessage(conversationId, JSON.stringify({ kind: "cards_draw", gameId, by: me, at: new Date().toISOString() }), "game");
  };

  const renderCard = (card: Card | null, isHidden: boolean = false) => {
    if (!card) {
      return (
        <div className="w-[72px] h-[104px] sm:w-[88px] sm:h-[128px] rounded-xl border-2 border-dashed border-white/20 bg-black/10 flex flex-col items-center justify-center text-white/30 font-bold text-[11px] shadow-inner">
          <span className="opacity-50">فارغ</span>
        </div>
      );
    }
    if (isHidden) {
      return (
        <div className="w-[72px] h-[104px] sm:w-[88px] sm:h-[128px] rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.6)] p-1.5 flex items-center justify-center animate-pulse">
          <div className="w-full h-full rounded-md bg-[#8b0000] border-2 border-white/20 flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]" />
            <div className="w-8 h-12 border border-white/40 rounded-sm" />
          </div>
        </div>
      );
    }
    
    const isRed = card.suit === "H" || card.suit === "D";
    const colorClass = isRed ? "text-[#d90000]" : "text-[#111111]";
    
    return (
      <div className={`w-[72px] h-[104px] sm:w-[88px] sm:h-[128px] rounded-xl bg-gradient-to-br from-[#ffffff] to-[#f4f1ea] shadow-[0_4px_15px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(0,0,0,0.05)] flex flex-col justify-between p-1.5 sm:p-2 select-none relative animate-in fade-in zoom-in duration-300 ${myDrawCount > 0 ? "slide-in-from-bottom-5" : ""}`}>
        {/* Top Left */}
        <div className={`text-left text-[14px] sm:text-[18px] font-black leading-none ${colorClass}`}>
          <div>{rankLabel(card.rank)}</div>
          <div className="text-[10px] sm:text-[14px] -mt-1">{suitEmoji(card.suit)}</div>
        </div>
        
        {/* Center Large Suit */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center opacity-90 ${colorClass}`}>
          <div className="text-4xl sm:text-5xl drop-shadow-sm">{suitEmoji(card.suit)}</div>
        </div>

        {/* Bottom Right */}
        <div className={`text-right text-[14px] sm:text-[18px] font-black leading-none rotate-180 ${colorClass}`}>
          <div>{rankLabel(card.rank)}</div>
          <div className="text-[10px] sm:text-[14px] -mt-1">{suitEmoji(card.suit)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f2414] overflow-hidden w-[300px] sm:w-[350px] shadow-2xl relative font-sans">
      {/* Green Felt Texture */}
      <div className="absolute inset-0 opacity-50 mix-blend-overlay pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-green-900 to-emerald-900 px-4 py-3 flex items-center justify-between border-b border-black/20 shadow-md relative z-10">
        <div className="flex items-center gap-2">
          {start.mode === "war" ? <Swords className="w-5 h-5 text-yellow-500" /> : <Coins className="w-5 h-5 text-yellow-500" />}
          <div>
            <div className="text-[14px] font-black text-white tracking-wide">{status.title}</div>
            <div className="text-[11px] text-green-200 font-medium">{status.sub}</div>
          </div>
        </div>
        {start.mode === "war" && (
          <div className="flex items-center gap-2 bg-black/30 px-2.5 py-1 rounded-lg border border-white/10">
            <span className="text-blue-400 font-bold">{status.myPts ?? 0}</span>
            <span className="text-white/50 text-[10px]">-</span>
            <span className="text-red-400 font-bold">{status.theirPts ?? 0}</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 relative z-10">
        {/* Draw Button Area */}
        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={draw}
            disabled={!canDraw}
            className={`w-full max-w-[200px] py-2.5 rounded-xl text-[14px] font-black transition-all shadow-lg relative overflow-hidden ${
              canDraw
                ? "bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:scale-105 active:scale-95 shadow-yellow-500/30"
                : "bg-white/5 text-white/30 cursor-not-allowed border border-white/10"
            }`}
          >
            {canDraw ? "🃏 اسحب ورقة" : "في انتظار الخصم"}
            {canDraw && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />}
          </button>
        </div>

        {/* Cards Area */}
        <div className="flex justify-between items-center px-1 sm:px-3">
          {/* My Card */}
          <div className="flex flex-col items-center gap-3">
            <div className="bg-black/40 px-4 py-1 rounded-full text-[11px] text-white font-bold border border-white/10 shadow-sm">
              أنت
            </div>
            {renderCard(myCard)}
          </div>
          
          <div className="text-white/20 font-black italic text-3xl drop-shadow-md pb-4">VS</div>

          {/* Their Card */}
          <div className="flex flex-col items-center gap-3">
            <div className="bg-black/40 px-4 py-1 rounded-full text-[11px] text-[#a8a8a8] border border-white/10 shadow-sm">
              الخصم
            </div>
            {renderCard(theirCard, start.mode === "high_card" && theirCard && !myCard)}
          </div>
        </div>
      </div>
    </div>
  );
}
