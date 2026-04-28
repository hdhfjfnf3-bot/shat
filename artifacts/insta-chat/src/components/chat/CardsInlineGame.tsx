import { useMemo } from "react";

import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";

type CardsStartPayload = {
  kind: "cards_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
  mode: "war" | "high_card";
};

type CardsDrawPayload = {
  kind: "cards_draw";
  gameId: string;
  by: string;
  at: string;
};

type Payload = CardsStartPayload | CardsDrawPayload;

type Suit = "S" | "H" | "D" | "C";
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // J=11 Q=12 K=13 A=14
type Card = { suit: Suit; rank: Rank };

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function xorshift32(seed: number): () => number {
  let x = seed | 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    // convert to [0,1)
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
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
  if (s === "S") return "♠️";
  if (s === "H") return "♥️";
  if (s === "D") return "♦️";
  return "♣️";
}

function cardText(c: Card): string {
  return `${rankLabel(c.rank)}${suitEmoji(c.suit)}`;
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

export function CardsInlineGame({
  gameMessage,
  otherUserId,
  conversationId,
  allMessages,
}: {
  gameMessage: Message;
  otherUserId: string;
  conversationId: string;
  allMessages: Message[];
}) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();

  const start = useMemo(() => safeJsonParse<CardsStartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "cards_start" ? start.gameId : null;

  const deck = useMemo(() => (gameId ? shuffle(makeDeck(), `cards:${gameId}`) : []), [gameId]);

  const myDrawCount = useMemo(() => (gameId ? pickLastDraw(allMessages, gameId, me) : 0), [allMessages, gameId, me]);
  const theirDrawCount = useMemo(
    () => (gameId ? pickLastDraw(allMessages, gameId, otherUserId) : 0),
    [allMessages, gameId, otherUserId],
  );

  const myCard = deck[myDrawCount - 1] ?? null;
  const theirCard = deck[theirDrawCount - 1] ?? null;

  const status = useMemo(() => {
    if (!start || !gameId) return { title: "كوتشينة", sub: "فيه مشكلة في بيانات اللعبة." };
    if (start.mode === "high_card") {
      if (!myCard && !theirCard) return { title: "أعلى ورقة", sub: "اسحبوا ورقة… الأعلى يكسب." };
      if (myCard && !theirCard) return { title: "أعلى ورقة", sub: "تمام… مستني الطرف التاني يسحب." };
      if (!myCard && theirCard) return { title: "أعلى ورقة", sub: "الطرف التاني سحب… دورك." };
      const c = cmpCard(myCard!, theirCard!);
      if (c === 0) return { title: "تعادل", sub: `${cardText(myCard!)} = ${cardText(theirCard!)}` };
      if (c === 1) return { title: "أنت كسبت", sub: `${cardText(myCard!)} أعلى من ${cardText(theirCard!)}` };
      return { title: "الطرف التاني كسب", sub: `${cardText(theirCard!)} أعلى من ${cardText(myCard!)}` };
    }

    // war mode: points per round; each player draw increments a personal index → we compare latest round only when both have drawn that round
    const rounds = Math.min(myDrawCount, theirDrawCount);
    let myPts = 0;
    let theirPts = 0;
    for (let i = 0; i < rounds; i++) {
      const a = deck[i]!;
      const b = deck[i + 26] ?? deck[i]!;
      const c = cmpCard(a, b);
      if (c === 1) myPts++;
      else if (c === -1) theirPts++;
    }
    const needs = myDrawCount === theirDrawCount ? "اسحبوا الجولة الجاية." : myDrawCount < theirDrawCount ? "دورك تسحب." : "مستني الطرف التاني.";
    return { title: `حرب (نقط)`, sub: `${myPts} - ${theirPts} • ${needs}` };
  }, [deck, gameId, myCard, myDrawCount, otherUserId, start, theirCard, theirDrawCount]);

  if (!start || !gameId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
        رسالة كوتشينة غير صالحة.
      </div>
    );
  }

  const canDraw =
    start.mode === "high_card"
      ? myDrawCount === 0
      : myDrawCount <= theirDrawCount; // allow catch-up

  const draw = () => {
    if (!canDraw) return;
    const payload: CardsDrawPayload = { kind: "cards_draw", gameId, by: me, at: new Date().toISOString() };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  const renderCard = (card: Card | null, isHidden: boolean = false) => {
    if (!card) {
      return (
        <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg border-2 border-white/10 bg-black/20 flex flex-col items-center justify-center text-white/20 font-bold text-xs shadow-inner">
          مكان الورقة
        </div>
      );
    }
    if (isHidden) {
      return (
        <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg border border-black/50 bg-[#8b0000] shadow-md flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]">
          <div className="w-12 h-20 sm:w-16 sm:h-24 border border-white/20 rounded-md"></div>
        </div>
      );
    }
    
    const isRed = card.suit === "H" || card.suit === "D";
    const colorClass = isRed ? "text-[#ed4956]" : "text-[#262626]";
    
    return (
      <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] flex flex-col justify-between p-1.5 sm:p-2 select-none relative animate-in fade-in zoom-in duration-300">
        <div className={`text-left text-sm sm:text-base font-bold leading-none ${colorClass}`}>
          <div>{rankLabel(card.rank)}</div>
          <div className="text-[10px] sm:text-[12px]">{suitEmoji(card.suit)}</div>
        </div>
        
        <div className={`absolute inset-0 flex items-center justify-center text-3xl sm:text-4xl opacity-20 ${colorClass}`}>
          {suitEmoji(card.suit)}
        </div>

        <div className={`text-right text-sm sm:text-base font-bold leading-none rotate-180 ${colorClass}`}>
          <div>{rankLabel(card.rank)}</div>
          <div className="text-[10px] sm:text-[12px]">{suitEmoji(card.suit)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a2e1f] overflow-hidden w-[280px] sm:w-[340px] shadow-xl relative">
      {/* Green Felt Texture Overlay */}
      <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')" }} />
      
      <div className="p-4 relative z-10">
        <div className="flex items-start justify-between gap-3 bg-black/40 rounded-xl p-3 backdrop-blur-sm border border-white/5">
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-white tracking-wide">🃏 {status.title}</div>
            <div className="text-[11px] text-[#a8a8a8] mt-0.5">{status.sub}</div>
          </div>
          <button
            type="button"
            onClick={draw}
            disabled={!canDraw}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all shadow-lg ${
              canDraw
                ? "bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-white hover:scale-105 active:scale-95"
                : "bg-white/5 text-white/30 cursor-not-allowed border border-white/10"
            }`}
          >
            اسحب ورقة
          </button>
        </div>

        <div className="mt-6 flex justify-between items-center px-2">
          {/* My Side */}
          <div className="flex flex-col items-center gap-3">
            <div className="bg-black/40 px-3 py-1 rounded-full text-[11px] text-white font-medium border border-white/10">
              أنت
            </div>
            {renderCard(myCard)}
          </div>
          
          <div className="text-white/30 font-black italic text-2xl">VS</div>

          {/* Their Side */}
          <div className="flex flex-col items-center gap-3">
            <div className="bg-black/40 px-3 py-1 rounded-full text-[11px] text-[#a8a8a8] border border-white/10">
              الطرف التاني
            </div>
            {renderCard(theirCard, start.mode === "high_card" && theirCard && !myCard)}
          </div>
        </div>
      </div>
    </div>
  );
}

