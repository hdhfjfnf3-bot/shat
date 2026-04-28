import { useMemo } from "react";

import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";

type BankStartPayload = {
  kind: "bank_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
  token: "🚗" | "🏎️" | "🚕" | "🛻";
};

type BankJoinPayload = {
  kind: "bank_join";
  gameId: string;
  by: string;
  token: "🚗" | "🏎️" | "🚕" | "🛻";
  at: string;
};

type BankRollPayload = {
  kind: "bank_roll";
  gameId: string;
  by: string;
  d1: 1 | 2 | 3 | 4 | 5 | 6;
  d2: 1 | 2 | 3 | 4 | 5 | 6;
  at: string;
};

type BankBuyPayload = {
  kind: "bank_buy";
  gameId: string;
  by: string;
  square: number;
  at: string;
};

type BankPayPayload = {
  kind: "bank_pay";
  gameId: string;
  by: string;
  to: string;
  amount: number;
  reason: "rent" | "tax";
  at: string;
};

type BankPayload = BankStartPayload | BankJoinPayload | BankRollPayload | BankBuyPayload | BankPayPayload;

type Square =
  | { kind: "go"; name: "انطلاق"; salary: number }
  | { kind: "property"; name: string; price: number; rent: number; color: string }
  | { kind: "tax"; name: string; amount: number }
  | { kind: "chance"; name: "حظ"; min: number; max: number };

const TOKENS: Array<BankStartPayload["token"]> = ["🚗", "🏎️", "🚕", "🛻"];

const BOARD: Square[] = [
  { kind: "go", name: "انطلاق", salary: 200 },
  { kind: "property", name: "شارع الهرم", price: 120, rent: 18, color: "أحمر" },
  { kind: "chance", name: "حظ", min: -120, max: 160 },
  { kind: "property", name: "فيصل", price: 140, rent: 22, color: "أحمر" },
  { kind: "tax", name: "ضريبة", amount: 120 },
  { kind: "property", name: "المعادي", price: 160, rent: 26, color: "أزرق" },
  { kind: "property", name: "الزمالك", price: 180, rent: 30, color: "أزرق" },
  { kind: "chance", name: "حظ", min: -160, max: 200 },
  { kind: "property", name: "مدينة نصر", price: 200, rent: 34, color: "أصفر" },
  { kind: "tax", name: "فاتورة مفاجئة", amount: 80 },
  { kind: "property", name: "العباسية", price: 220, rent: 38, color: "أصفر" },
  { kind: "chance", name: "حظ", min: -200, max: 240 },
  { kind: "property", name: "الشيخ زايد", price: 240, rent: 42, color: "أخضر" },
  { kind: "property", name: "التجمع", price: 260, rent: 46, color: "أخضر" },
  { kind: "tax", name: "رسوم", amount: 100 },
  { kind: "property", name: "العجوزة", price: 280, rent: 52, color: "بنفسجي" },
  { kind: "chance", name: "حظ", min: -220, max: 280 },
  { kind: "property", name: "6 أكتوبر", price: 300, rent: 56, color: "بنفسجي" },
  { kind: "property", name: "المهندسين", price: 320, rent: 60, color: "أسود" },
  { kind: "tax", name: "ضريبة رفاهية", amount: 140 },
];

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function pickRandomToken(exclude?: string | null): BankStartPayload["token"] {
  const list = TOKENS.filter((t) => t !== exclude);
  return (list[Math.floor(Math.random() * list.length)] ?? TOKENS[0]) as BankStartPayload["token"];
}

function squareLabel(i: number, s: Square): string {
  if (s.kind === "go") return `#${i} ${s.name}`;
  if (s.kind === "property") return `#${i} ${s.name} (${s.color})`;
  if (s.kind === "tax") return `#${i} ${s.name}`;
  return `#${i} ${s.name}`;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function BankElHazInline({
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

  const start = useMemo(() => safeJsonParse<BankStartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "bank_start" ? start.gameId : null;

  const events = useMemo(() => {
    if (!gameId) return [] as BankPayload[];
    const out: BankPayload[] = [];
    for (const m of allMessages) {
      if (m.type !== "game") continue;
      const p = safeJsonParse<BankPayload>(m.content);
      if (!p || p.gameId !== gameId) continue;
      out.push(p);
    }
    return out;
  }, [allMessages, gameId]);

  const state = useMemo(() => {
    const createdBy = (start?.createdBy ?? me).toLowerCase();
    const p1 = createdBy;
    const p2 = otherUserId;

    const tokenBy: Record<string, BankStartPayload["token"]> = {
      [p1]: start?.token ?? "🚗",
    };

    let joined = false;
    let turn = p1;
    let pos: Record<string, number> = { [p1]: 0, [p2]: 0 };
    let cash: Record<string, number> = { [p1]: 1500, [p2]: 1500 };
    let owner: Record<number, string> = {};
    let last: { text: string; by?: string } | null = null;

    const applyPay = (by: string, to: string, amount: number, reason: string) => {
      cash[by] = (cash[by] ?? 0) - amount;
      cash[to] = (cash[to] ?? 0) + amount;
      last = { by, text: `💸 دفع ${amount}$ لـ ${to} (${reason})` };
    };

    for (const e of events) {
      if (e.kind === "bank_join") {
        tokenBy[e.by.toLowerCase()] = e.token;
        joined = true;
        last = { by: e.by, text: `🚗 انضم بعربية ${e.token}` };
      }

      if (e.kind === "bank_roll") {
        const by = e.by.toLowerCase();
        if (by !== turn) {
          continue;
        }
        const steps = e.d1 + e.d2;
        const from = pos[by] ?? 0;
        const next = from + steps;
        const wrapped = next >= BOARD.length;
        pos[by] = mod(next, BOARD.length);

        if (wrapped) {
          const go = BOARD[0] as Extract<Square, { kind: "go" }>;
          cash[by] = (cash[by] ?? 0) + go.salary;
        }

        const sq = BOARD[pos[by]!]!;
        last = { by, text: `🎲 ${e.d1}+${e.d2} = ${steps} → وقفت على ${squareLabel(pos[by]!, sq)}` };

        // Auto actions: tax & chance.
        if (sq.kind === "tax") {
          cash[by] = (cash[by] ?? 0) - sq.amount;
          last = { by, text: `🧾 ${sq.name}: -${sq.amount}$` };
        }
        if (sq.kind === "chance") {
          const delta = Math.floor((sq.min + sq.max) / 2);
          // deterministic-ish "luck": based on steps
          const applied = delta === 0 ? 40 : delta;
          cash[by] = (cash[by] ?? 0) + applied;
          last = { by, text: `🎁 حظ: ${applied >= 0 ? "+" : ""}${applied}$` };
        }

        // Rent auto-pay only when opponent owns.
        if (sq.kind === "property") {
          const o = owner[pos[by]!];
          if (o && o !== by) {
            applyPay(by, o, sq.rent, "إيجار");
          }
        }

        // Switch turn after rolling.
        turn = by === p1 ? p2 : p1;
      }

      if (e.kind === "bank_buy") {
        const by = e.by.toLowerCase();
        const sq = BOARD[e.square];
        if (!sq || sq.kind !== "property") continue;
        if (owner[e.square]) continue;
        if ((pos[by] ?? -1) !== e.square) continue;
        if ((cash[by] ?? 0) < sq.price) continue;
        cash[by] = (cash[by] ?? 0) - sq.price;
        owner[e.square] = by;
        last = { by, text: `🏠 اشترى ${sq.name} بـ ${sq.price}$` };
      }

      if (e.kind === "bank_pay") {
        applyPay(e.by.toLowerCase(), e.to.toLowerCase(), clamp(e.amount, 0, 99999), e.reason);
      }
    }

    const p1Token = tokenBy[p1] ?? "🚗";
    const p2Token = tokenBy[p2] ?? pickRandomToken(p1Token);

    return {
      p1,
      p2,
      tokens: { [p1]: p1Token, [p2]: p2Token } as Record<string, BankStartPayload["token"]>,
      joined,
      turn,
      pos,
      cash,
      owner,
      last,
    };
  }, [events, me, otherUserId, start?.createdBy, start?.token]);

  if (!start || !gameId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
        رسالة بنك الحظ غير صالحة.
      </div>
    );
  }

  const myTurn = state.turn === me;
  const mePos = state.pos[me] ?? 0;
  const otherPos = state.pos[otherUserId] ?? 0;
  const meCash = state.cash[me] ?? 0;
  const otherCash = state.cash[otherUserId] ?? 0;

  const sq = BOARD[mePos]!;
  const canBuy = sq.kind === "property" && !state.owner[mePos] && meCash >= sq.price;

  const join = () => {
    const payload: BankJoinPayload = {
      kind: "bank_join", gameId, by: me,
      token: pickRandomToken(state.tokens[state.p1]),
      at: new Date().toISOString(),
    };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  const roll = () => {
    if (!myTurn) return;
    const d1 = (Math.floor(Math.random() * 6) + 1) as BankRollPayload["d1"];
    const d2 = (Math.floor(Math.random() * 6) + 1) as BankRollPayload["d2"];
    const payload: BankRollPayload = {
      kind: "bank_roll", gameId, by: me, d1, d2, at: new Date().toISOString(),
    };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  const buy = () => {
    if (!canBuy) return;
    const payload: BankBuyPayload = {
      kind: "bank_buy", gameId, by: me, square: mePos, at: new Date().toISOString(),
    };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  function getGridArea(index: number) {
    if (index >= 0 && index <= 5) return { gridColumn: 6 - index, gridRow: 6 };
    if (index >= 6 && index <= 9) return { gridColumn: 1, gridRow: 6 - (index - 5) };
    if (index >= 10 && index <= 15) return { gridColumn: index - 9, gridRow: 1 };
    if (index >= 16 && index <= 19) return { gridColumn: 6, gridRow: index - 14 };
    return {};
  }

  function getColorClass(c: string) {
    switch(c) {
      case "أحمر": return "bg-[#ef4444]";
      case "أزرق": return "bg-[#3b82f6]";
      case "أصفر": return "bg-[#eab308]";
      case "أخضر": return "bg-[#22c55e]";
      case "بنفسجي": return "bg-[#a855f7]";
      case "أسود": return "bg-[#555]";
      default: return "bg-transparent";
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden w-[280px] sm:w-[340px]">
      <div className="p-2 aspect-square relative flex items-center justify-center">
        
        {/* The Board Grid */}
        <div className="absolute inset-2 grid grid-cols-6 grid-rows-6 gap-1" dir="ltr">
          {BOARD.map((square, i) => {
            const hasMe = mePos === i;
            const hasOther = otherPos === i;
            const isOwnedByMe = state.owner[i] === me;
            const isOwnedByOther = state.owner[i] === otherUserId;

            return (
              <div 
                key={i} 
                className={`relative flex flex-col items-center justify-center rounded-[4px] border border-white/10 bg-black/40 overflow-hidden text-center leading-none ${isOwnedByMe ? "ring-1 ring-[#0095f6]" : isOwnedByOther ? "ring-1 ring-[#ed4956]" : ""}`}
                style={getGridArea(i)}
              >
                {square.kind === "property" && (
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${getColorClass(square.color)}`} />
                )}
                
                <div className={`mt-1 text-[7px] sm:text-[8px] font-bold text-white px-0.5 line-clamp-2 ${square.kind === "property" ? "pt-0.5" : ""}`}>
                  {square.kind === "chance" ? "❓ حظ" : square.kind === "go" ? "🚀 البداية" : square.kind === "tax" ? "💰 ضريبة" : square.name}
                </div>
                {square.kind === "property" && (
                  <div className="text-[7px] text-[#00d26a] font-semibold mt-0.5">${square.price}</div>
                )}

                {/* Tokens */}
                <div className="absolute bottom-0.5 w-full flex items-center justify-center gap-0.5 text-[10px] sm:text-[12px] z-10">
                  {hasMe && <span>{state.tokens[me] ?? "🚗"}</span>}
                  {hasOther && <span>{state.tokens[otherUserId] ?? "🚕"}</span>}
                </div>
              </div>
            );
          })}

          {/* Center Area */}
          <div className="bg-[#1a1a1a] rounded-xl border border-white/10 flex flex-col items-center justify-center p-2 text-center" style={{ gridColumn: "2 / 6", gridRow: "2 / 6" }} dir="rtl">
            <h3 className="text-[15px] font-bold text-white mb-2 tracking-wide">🏦 بنك الحظ</h3>
            
            <div className="flex w-full justify-between gap-2 text-[11px] mb-3">
              <div className={`flex-1 rounded-lg border ${myTurn ? "border-[#0095f6] bg-[#0095f6]/10" : "border-white/10 bg-black/40"} p-1.5`}>
                <div className="text-[#a8a8a8] mb-0.5">إنت {state.tokens[me] ?? "🚗"}</div>
                <div className="text-[#00d26a] font-bold">${meCash}</div>
              </div>
              <div className={`flex-1 rounded-lg border ${!myTurn ? "border-[#ed4956] bg-[#ed4956]/10" : "border-white/10 bg-black/40"} p-1.5`}>
                <div className="text-[#a8a8a8] mb-0.5">هو {state.tokens[otherUserId] ?? "🚕"}</div>
                <div className="text-[#00d26a] font-bold">${otherCash}</div>
              </div>
            </div>

            {state.last && (
              <div className="text-[10px] sm:text-[11px] text-white/80 bg-white/5 rounded-lg px-2 py-1.5 mb-3 w-full text-center">
                {state.last.text}
              </div>
            )}

            {!state.joined ? (
              <button onClick={join} className="w-full rounded-lg bg-[#0095f6] py-2 text-[12px] font-bold text-white active:scale-95 transition-transform">
                انضم للعب 🚗
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={roll}
                  disabled={!myTurn}
                  className={`flex-1 rounded-lg py-2 text-[12px] font-bold transition-all ${myTurn ? "bg-[#00d26a] text-black active:scale-95 shadow-[0_0_10px_rgba(0,210,106,0.2)]" : "bg-white/5 text-[#555]"}`}
                >
                  🎲 إرمي
                </button>
                <button
                  onClick={buy}
                  disabled={!canBuy}
                  className={`flex-1 rounded-lg py-2 text-[12px] font-bold transition-all ${canBuy ? "bg-[#3797f0] text-white active:scale-95 shadow-[0_0_10px_rgba(55,151,240,0.2)]" : "bg-white/5 text-[#555]"}`}
                >
                  🏠 إشتري
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

