import { useMemo, useState, useEffect } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { Coins, Siren, Train, Zap, Droplets, MapPin, Building2, Gavel, Landmark, Home, WalletCards } from "lucide-react";

type BankStartPayload = { kind: "bank_start"; gameId: string; createdBy: string; createdAt: string; token: "🚗" | "🏎️" | "🚕" | "🛻" };
type BankJoinPayload = { kind: "bank_join"; gameId: string; by: string; token: "🚗" | "🏎️" | "🚕" | "🛻"; at: string };
type BankRollPayload = { kind: "bank_roll"; gameId: string; by: string; d1: number; d2: number; at: string };
type BankBuyPayload = { kind: "bank_buy"; gameId: string; by: string; square: number; at: string };
type BankPayPayload = { kind: "bank_pay"; gameId: string; by: string; to: string; amount: number; reason: string; at: string };
type BankUpgradePayload = { kind: "bank_upgrade"; gameId: string; by: string; square: number; at: string };
type BankSellPayload = { kind: "bank_sell"; gameId: string; by: string; square: number; at: string };
type BankUseJailCardPayload = { kind: "bank_use_jail_card"; gameId: string; by: string; at: string };

type BankPayload =
  | BankStartPayload
  | BankJoinPayload
  | BankRollPayload
  | BankBuyPayload
  | BankPayPayload
  | BankUpgradePayload
  | BankSellPayload
  | BankUseJailCardPayload;

type Square =
  | { kind: "go"; name: "البداية"; salary: number }
  | { kind: "property"; name: string; price: number; rent: number; color: string; group: string }
  | { kind: "tax"; name: string; amount: number }
  | { kind: "chance"; name: string; deck: "chance" | "chest" }
  | { kind: "jail"; name: "السجن" }
  | { kind: "parking"; name: string }
  | { kind: "gotojail"; name: "البوليس" }
  | { kind: "utility"; name: string; price: number; type: "water" | "electric" | "station" };

type BankCard = {
  title: string;
  text: string;
  effect:
    | { kind: "money"; amount: number }
    | { kind: "move"; to: number }
    | { kind: "jail" }
    | { kind: "jail_card" };
};

const TOKENS: Array<BankStartPayload["token"]> = ["🚗", "🏎️", "🚕", "🛻"];

const BOARD: Square[] = [
  { kind: "go", name: "البداية", salary: 200 }, // 0
  { kind: "property", name: "المطرية", price: 60, rent: 10, color: "أحمر", group: "red" }, // 1
  { kind: "chance", name: "فرصة", deck: "chance" }, // 2
  { kind: "property", name: "شبرا", price: 60, rent: 10, color: "أحمر", group: "red" }, // 3
  { kind: "tax", name: "ضريبة", amount: 50 }, // 4
  { kind: "property", name: "دمنهور", price: 100, rent: 15, color: "أزرق", group: "blue" }, // 5
  { kind: "jail", name: "السجن" }, // 6
  { kind: "property", name: "طنطا", price: 100, rent: 15, color: "أزرق", group: "blue" }, // 7
  { kind: "utility", name: "المياه", price: 150, type: "water" }, // 8
  { kind: "chance", name: "خزنة", deck: "chest" }, // 9
  { kind: "property", name: "المنصورة", price: 120, rent: 20, color: "أصفر", group: "yellow" }, // 10
  { kind: "property", name: "الزقازيق", price: 120, rent: 20, color: "أصفر", group: "yellow" }, // 11
  { kind: "parking", name: "جراج" }, // 12
  { kind: "property", name: "الإسماعيلية", price: 140, rent: 25, color: "أخضر", group: "green" }, // 13
  { kind: "tax", name: "رسوم", amount: 100 }, // 14
  { kind: "property", name: "السويس", price: 140, rent: 25, color: "أخضر", group: "green" }, // 15
  { kind: "property", name: "بورسعيد", price: 160, rent: 30, color: "أخضر", group: "green" }, // 16
  { kind: "chance", name: "فرصة", deck: "chance" }, // 17
  { kind: "gotojail", name: "البوليس" }, // 18
  { kind: "property", name: "الإسكندرية", price: 200, rent: 40, color: "بنفسجي", group: "purple" }, // 19
  { kind: "utility", name: "الكهرباء", price: 150, type: "electric" }, // 20
  { kind: "property", name: "القاهرة", price: 300, rent: 50, color: "بنفسجي", group: "purple" }, // 21
  { kind: "tax", name: "ضريبة", amount: 150 }, // 22
  { kind: "property", name: "أسوان", price: 400, rent: 70, color: "أسود", group: "black" }, // 23
];

const CHANCE_CARDS: BankCard[] = [
  { title: "فرصة", text: "تحرك إلى البداية وخد مرتبك.", effect: { kind: "move", to: 0 } },
  { title: "فرصة", text: "البنك يكافئك. استلم 120$.", effect: { kind: "money", amount: 120 } },
  { title: "فرصة", text: "ادفع مصاريف صيانة. -90$", effect: { kind: "money", amount: -90 } },
  { title: "فرصة", text: "تحرك إلى القاهرة.", effect: { kind: "move", to: 21 } },
  { title: "فرصة", text: "اذهب إلى السجن مباشرة.", effect: { kind: "jail" } },
  { title: "فرصة", text: "تحرك إلى الإسكندرية.", effect: { kind: "move", to: 19 } },
  { title: "فرصة", text: "اربح مسابقة استثمار. +200$", effect: { kind: "money", amount: 200 } },
  { title: "فرصة", text: "ادفع غرامة مرورية. -60$", effect: { kind: "money", amount: -60 } },
  { title: "فرصة", text: "كارت خروج من السجن مجانًا.", effect: { kind: "jail_card" } },
];

const CHEST_CARDS: BankCard[] = [
  { title: "الخزنة", text: "مكسب مفاجئ من البنك. +100$", effect: { kind: "money", amount: 100 } },
  { title: "الخزنة", text: "إصلاحات بيتك. -70$", effect: { kind: "money", amount: -70 } },
  { title: "الخزنة", text: "ارجع إلى البداية.", effect: { kind: "move", to: 0 } },
  { title: "الخزنة", text: "غرامة مرورية. -40$", effect: { kind: "money", amount: -40 } },
  { title: "الخزنة", text: "مكافأة شطارتك. +150$", effect: { kind: "money", amount: 150 } },
  { title: "الخزنة", text: "سحب من التوفير. +80$", effect: { kind: "money", amount: 80 } },
  { title: "الخزنة", text: "تأمين العربية. -50$", effect: { kind: "money", amount: -50 } },
  { title: "الخزنة", text: "اذهب إلى السجن.", effect: { kind: "jail" } },
  { title: "الخزنة", text: "كارت خروج من السجن مجانًا.", effect: { kind: "jail_card" } },
];

const PROPERTY_GROUPS = BOARD.reduce<Record<string, number[]>>((acc, sq, idx) => {
  if (sq.kind !== "property") return acc;
  acc[sq.group] = [...(acc[sq.group] ?? []), idx];
  return acc;
}, {});

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

function pickRandomToken(exclude?: string | null): BankStartPayload["token"] {
  const list = TOKENS.filter((t) => t !== exclude);
  return (list[Math.floor(Math.random() * list.length)] ?? TOKENS[0]) as BankStartPayload["token"];
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

const DiceFace = ({ value, rolling }: { value: number; rolling: boolean }) => {
  const dots = {
    1: [[50, 50]],
    2: [[20, 20], [80, 80]],
    3: [[20, 20], [50, 50], [80, 80]],
    4: [[20, 20], [20, 80], [80, 20], [80, 80]],
    5: [[20, 20], [20, 80], [50, 50], [80, 20], [80, 80]],
    6: [[20, 20], [20, 50], [20, 80], [80, 20], [80, 50], [80, 80]]
  }[value] || [[50, 50]];

  return (
    <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-white to-gray-200 rounded-lg shadow-[inset_0_-2px_4px_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.4)] relative ${rolling ? "animate-spin" : ""}`} style={{ transformStyle: "preserve-3d" }}>
      {dots.map(([x, y], i) => (
        <div key={i} className="absolute w-2 h-2 bg-gradient-to-br from-gray-800 to-black rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" style={{ top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' }} />
      ))}
    </div>
  );
};

export function BankElHazInline({ gameMessage, otherUserId, conversationId, allMessages, participants }: { gameMessage: Message; otherUserId: string; conversationId: string; allMessages: Message[]; participants?: import("@/lib/types").User[] }) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();
  const [isRolling, setIsRolling] = useState(false);
  const [displayDice, setDisplayDice] = useState<[number, number]>([6, 6]);

  const start = useMemo(() => safeJsonParse<BankStartPayload>(gameMessage.content), [gameMessage.content]);
  const gameId = start?.kind === "bank_start" ? start.gameId : null;

  const events = useMemo(() => {
    if (!gameId) return [] as BankPayload[];
    return allMessages
      .filter((m) => m.type === "game")
      .map((m) => safeJsonParse<BankPayload>(m.content))
      .filter((p): p is BankPayload => p !== null && p.gameId === gameId)
      .sort((a, b) => new Date("at" in a ? a.at : a.createdAt).getTime() - new Date("at" in b ? b.at : b.createdAt).getTime());
  }, [allMessages, gameId]);

  const allPlayers = useMemo(() => {
    if (!participants || participants.length === 0) {
      const p1 = start?.createdBy.toLowerCase() || "";
      const p2 = p1 === me ? otherUserId.toLowerCase() : me;
      return [p1, p2];
    }
    const set = new Set<string>();
    set.add(start?.createdBy.toLowerCase() || "");
    participants.forEach(p => set.add(p.username.toLowerCase()));
    set.add(me);
    return Array.from(set).sort().slice(0, 4);
  }, [participants, start?.createdBy, me, otherUserId]);

  const state = useMemo(() => {
    const createdBy = (start?.createdBy ?? me).toLowerCase();
    const tokenBy: Record<string, BankStartPayload["token"]> = { [createdBy]: start?.token ?? "🚗" };

    let joinedCount = 1;
    let currentTurnPlayer = createdBy;
    
    let pos: Record<string, number> = {};
    let cash: Record<string, number> = {};
    let inJail: Record<string, boolean> = {};
    let jailAttempts: Record<string, number> = {};
    let jailCards: Record<string, number> = {};
    let bankrupt: Record<string, boolean> = {};

    for (const p of allPlayers) {
      pos[p] = 0;
      cash[p] = 1500;
      inJail[p] = false;
      jailAttempts[p] = 0;
      jailCards[p] = 0;
      bankrupt[p] = false;
    }

    let owner: Record<number, string> = {};
    let houses: Record<number, number> = {};
    let last: { text: string; by?: string; icon?: string } | null = null;
    let lastCard: { deck: "chance" | "chest"; card: BankCard } | null = null;
    let currentDice: [number, number] = [6, 6];

    const autoSell = (player: string) => {
      while ((cash[player] ?? 0) < 0) {
        const owned = Object.keys(owner).map(Number).filter(k => owner[k] === player);
        if (owned.length === 0) break;
        const sqIdx = owned[0]!;
        const sq = BOARD[sqIdx];
        if (sq && (sq.kind === "property" || sq.kind === "utility")) {
          const sellValue = Math.floor(sq.price / 2) + (houses[sqIdx] ?? 0) * Math.floor(sq.price / 4);
          cash[player] = (cash[player] ?? 0) + sellValue;
          delete owner[sqIdx];
          delete houses[sqIdx];
          last = { by: player, text: `اضطر لبيع ${sq.name} لسداد الديون`, icon: "📉" };
        }
      }
      if ((cash[player] ?? 0) < 0) bankrupt[player] = true;
    };

    const applyPay = (by: string, to: string, amount: number, reason: string) => {
      cash[by] = (cash[by] ?? 0) - amount;
      cash[to] = (cash[to] ?? 0) + amount;
      last = { by, text: `دفع ${amount}$ لـ ${tokenBy[to] ?? "الخصم"} (${reason})`, icon: "💸" };
      autoSell(by);
    };

    const getNextPlayer = (p: string) => {
      let idx = allPlayers.indexOf(p);
      if (idx === -1) idx = 0;
      for (let i = 0; i < allPlayers.length; i++) {
        idx = (idx + 1) % allPlayers.length;
        const nextP = allPlayers[idx];
        if (nextP && !bankrupt[nextP] && tokenBy[nextP]) return nextP;
      }
      return p;
    };

    for (const e of events) {
      if (e.kind === "bank_join") {
        tokenBy[e.by.toLowerCase()] = e.token;
        joinedCount++;
        last = { by: e.by, text: `انضم للعبة بعربية ${e.token}`, icon: "🏁" };
      }

      const activePlayers = allPlayers.filter(p => !bankrupt[p] && tokenBy[p]);
      if (activePlayers.length === 0) continue;
      // ensure currentTurnPlayer is active
      if (bankrupt[currentTurnPlayer] || !tokenBy[currentTurnPlayer]) {
        currentTurnPlayer = getNextPlayer(currentTurnPlayer);
      }
      
      const turn = currentTurnPlayer;

      if (e.kind === "bank_roll") {
        const by = e.by.toLowerCase();
        if (by !== turn) continue;
        currentDice = [e.d1, e.d2];
        const steps = e.d1 + e.d2;
        const isDouble = e.d1 === e.d2;

        if (inJail[by]) {
          if (isDouble) {
            inJail[by] = false;
            jailAttempts[by] = 0;
            last = { by, text: `رمى مزدوج وخرج من السجن!`, icon: "🔓" };
          } else if ((jailAttempts[by] ?? 0) >= 2) {
            cash[by] = (cash[by] ?? 0) - 50;
            inJail[by] = false;
            jailAttempts[by] = 0;
            autoSell(by);
            last = { by, text: `فشل 3 مرات، دفع 50$ وخرج من السجن`, icon: "💰" };
          } else {
            jailAttempts[by] = (jailAttempts[by] ?? 0) + 1;
            last = { by, text: `محاولة ${jailAttempts[by]} من 3 للخروج من السجن`, icon: "⛓️" };
            currentTurnPlayer = getNextPlayer(currentTurnPlayer);
            continue;
          }
        }

        const from = pos[by] ?? 0;
        const next = from + steps;
        const wrapped = next >= BOARD.length;
        pos[by] = mod(next, BOARD.length);

        if (wrapped && !inJail[by]) {
          cash[by] = (cash[by] ?? 0) + 200;
        }

        const sq = BOARD[pos[by]!]!;
        if (!inJail[by] || isDouble) {
          last = { by, text: `وصل إلى ${sq.name}`, icon: "📍" };
        }

        if (sq.kind === "gotojail") {
          pos[by] = 6;
          inJail[by] = true;
          last = { by, text: `البوليس قبض عليه! ذهاب للسجن`, icon: "🚨" };
        } else if (sq.kind === "tax") {
          cash[by] = (cash[by] ?? 0) - sq.amount;
          last = { by, text: `دفع ضريبة ${sq.amount}$`, icon: "🧾" };
          autoSell(by);
        } else if (sq.kind === "chance") {
          const deck = sq.deck === "chance" ? CHANCE_CARDS : CHEST_CARDS;
          const seedIndex = (pos[by] + steps + (cash[by] ?? 0) + from) % deck.length;
          const card = deck[Math.abs(seedIndex)]!;
          lastCard = { deck: sq.deck, card };

          if (card.effect.kind === "money") {
            cash[by] = (cash[by] ?? 0) + card.effect.amount;
            last = {
              by,
              text: `${card.title}: ${card.effect.amount >= 0 ? "+" : ""}${card.effect.amount}$`,
              icon: card.effect.amount >= 0 ? "🎁" : "💸",
            };
            autoSell(by);
          } else if (card.effect.kind === "move") {
            if (card.effect.to < (pos[by] ?? 0)) {
              cash[by] = (cash[by] ?? 0) + 200;
            }
            pos[by] = card.effect.to;
            last = { by, text: `${card.title}: ${card.text}`, icon: "🃏" };
          } else if (card.effect.kind === "jail") {
            pos[by] = 6;
            inJail[by] = true;
            jailAttempts[by] = 0;
            last = { by, text: `${card.title}: اذهب إلى السجن`, icon: "🚨" };
          } else if (card.effect.kind === "jail_card") {
            jailCards[by] = (jailCards[by] ?? 0) + 1;
            last = { by, text: `${card.title}: كسبت كارت خروج من السجن`, icon: "🎫" };
          }
        } else if (sq.kind === "property" || sq.kind === "utility") {
          const o = owner[pos[by]!];
          if (o && o !== by) {
            let rent = sq.kind === "property" ? sq.rent : steps * 5;
            if (sq.kind === "property") {
              const h = houses[pos[by]!] ?? 0;
              const groupSquares = PROPERTY_GROUPS[sq.group] ?? [];
              const fullSet = groupSquares.length > 0 && groupSquares.every((index) => owner[index] === o);
              rent = Math.floor(rent * (1 + h * 1.5));
              if (fullSet && h === 0) {
                rent *= 2;
              }
            }
            applyPay(by, o, rent, "إيجار");
          }
        }

        if (!(isDouble && !inJail[by] && !bankrupt[by])) {
          currentTurnPlayer = getNextPlayer(currentTurnPlayer);
        }
      }

      if (e.kind === "bank_buy") {
        const by = e.by.toLowerCase();
        const sq = BOARD[e.square];
        if (sq && (sq.kind === "property" || sq.kind === "utility") && !owner[e.square] && (pos[by] ?? -1) === e.square && (cash[by] ?? 0) >= sq.price) {
          cash[by] -= sq.price;
          owner[e.square] = by;
          last = { by, text: `اشترى صك ${sq.name}`, icon: "📜" };
        }
      }

      if (e.kind === "bank_upgrade") {
        const by = e.by.toLowerCase();
        const sq = BOARD[e.square];
        if (owner[e.square] === by && sq && sq.kind === "property") {
          const cost = Math.floor(sq.price / 2);
          if ((cash[by] ?? 0) >= cost && (houses[e.square] ?? 0) < 4) {
            cash[by] -= cost;
            houses[e.square] = (houses[e.square] ?? 0) + 1;
            last = { by, text: `بنى ${houses[e.square] === 4 ? "فندق 🏨" : "بيت 🏠"} في ${sq.name}`, icon: "🏗️" };
          }
        }
      }

      if (e.kind === "bank_sell") {
        const by = e.by.toLowerCase();
        const sq = BOARD[e.square];
        if (owner[e.square] === by && sq && (sq.kind === "property" || sq.kind === "utility")) {
          const sellValue = Math.floor(sq.price / 2) + (houses[e.square] ?? 0) * Math.floor(sq.price / 4);
          cash[by] = (cash[by] ?? 0) + sellValue;
          delete owner[e.square];
          delete houses[e.square];
          last = { by, text: `باع ${sq.name} للبنك`, icon: "🏦" };
        }
      }

      if (e.kind === "bank_use_jail_card") {
        const by = e.by.toLowerCase();
        if ((jailCards[by] ?? 0) > 0 && inJail[by]) {
          jailCards[by] -= 1;
          inJail[by] = false;
          jailAttempts[by] = 0;
          last = { by, text: `استخدم كارت خروج من السجن`, icon: "🎫" };
        }
      }
    }

    for (const p of allPlayers) {
      if (!tokenBy[p]) {
        const used = Object.values(tokenBy);
        tokenBy[p] = TOKENS.find(t => !used.includes(t)) || pickRandomToken();
      }
    }

    const activePlayers = allPlayers.filter(p => !bankrupt[p] && tokenBy[p]);
    if (activePlayers.length > 0 && (bankrupt[currentTurnPlayer] || !tokenBy[currentTurnPlayer])) {
      currentTurnPlayer = getNextPlayer(currentTurnPlayer);
    }

    return {
      allPlayers,
      tokens: tokenBy,
      joinedCount,
      turn: currentTurnPlayer,
      pos,
      cash,
      owner,
      houses,
      inJail,
      jailAttempts,
      jailCards,
      bankrupt,
      last,
      lastCard,
      currentDice,
    };
  }, [events, me, allPlayers, start?.createdBy, start?.token]);

  useEffect(() => {
    if (!isRolling) {
      setDisplayDice(state.currentDice);
    }
  }, [state.currentDice, isRolling]);

  if (!start || !gameId) {
    return <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">لعبة بنك الحظ غير صالحة.</div>;
  }

  const myTurn = state.turn === me && !state.bankrupt[me];
  const mePos = state.pos[me] ?? 0;
  const otherPos = state.pos[otherUserId] ?? 0;
  const meCash = state.cash[me] ?? 0;
  const otherCash = state.cash[otherUserId] ?? 0;

  const sq = BOARD[mePos]!;
  const amOwner = state.owner[mePos] === me;
  const canBuy = (sq.kind === "property" || sq.kind === "utility") && !state.owner[mePos] && meCash >= sq.price;
  const canUpgrade = sq.kind === "property" && amOwner && meCash >= Math.floor(sq.price / 2) && (state.houses[mePos] ?? 0) < 4;
  const canSell = amOwner;
  const canUseJailCard = state.inJail[me] && (state.jailCards[me] ?? 0) > 0;

  const fullSetOwned = sq.kind === "property"
    ? (PROPERTY_GROUPS[sq.group] ?? []).every((index) => state.owner[index] === me)
    : false;

  const join = () => sendMessage(conversationId, JSON.stringify({ kind: "bank_join", gameId, by: me, token: TOKENS.find(t => !Object.values(state.tokens).includes(t)) || pickRandomToken(), at: new Date().toISOString() }), "game");
  const buy = () => canBuy && sendMessage(conversationId, JSON.stringify({ kind: "bank_buy", gameId, by: me, square: mePos, at: new Date().toISOString() }), "game");
  const upgrade = () => canUpgrade && sendMessage(conversationId, JSON.stringify({ kind: "bank_upgrade", gameId, by: me, square: mePos, at: new Date().toISOString() }), "game");
  const sell = () => canSell && sendMessage(conversationId, JSON.stringify({ kind: "bank_sell", gameId, by: me, square: mePos, at: new Date().toISOString() }), "game");
  const useJailCard = () => canUseJailCard && sendMessage(conversationId, JSON.stringify({ kind: "bank_use_jail_card", gameId, by: me, at: new Date().toISOString() }), "game");

  const roll = () => {
    if (!myTurn || isRolling) return;
    setIsRolling(true);
    let spins = 0;
    const interval = setInterval(() => {
      setDisplayDice([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
      spins++;
      if (spins > 10) clearInterval(interval);
    }, 50);

    setTimeout(() => {
      clearInterval(interval);
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      sendMessage(conversationId, JSON.stringify({ kind: "bank_roll", gameId, by: me, d1, d2, at: new Date().toISOString() }), "game");
      setIsRolling(false);
    }, 600);
  };

  function getCellPos(index: number) {
    let col = 0, row = 0;
    if (index >= 0 && index <= 6) { col = 6 - index; row = 6; }
    else if (index >= 7 && index <= 11) { col = 0; row = 6 - (index - 6); }
    else if (index >= 12 && index <= 18) { col = index - 12; row = 0; }
    else if (index >= 19 && index <= 23) { col = 6; row = index - 18; }
    return { left: `${(col / 7) * 100}%`, top: `${(row / 7) * 100}%`, width: `${100/7}%`, height: `${100/7}%` };
  }

  function getColorClass(c: string) {
    switch(c) {
      case "أحمر": return "bg-[#ff4d4d]";
      case "أزرق": return "bg-[#3b82f6]";
      case "أصفر": return "bg-[#fbbf24]";
      case "أخضر": return "bg-[#22c55e]";
      case "بنفسجي": return "bg-[#a855f7]";
      case "أسود": return "bg-[#1f2937]";
      default: return "bg-transparent";
    }
  }

  function renderSquare(sq: Square, i: number) {
    const isOwnedByMe = state.owner[i] === me;
    const isOwnedByOther = state.owner[i] === otherUserId;
    const ownerColor = isOwnedByMe ? "border-b-4 border-b-[#0095f6]" : isOwnedByOther ? "border-b-4 border-b-[#ed4956]" : "";

    return (
      <div 
        key={i} 
        className={`absolute bg-[#f9f8f3] border border-[#d4c8b8] shadow-sm flex flex-col items-center justify-between overflow-hidden ${ownerColor}`}
        style={getCellPos(i)}
      >
        {sq.kind === "property" && (
          <div className={`w-full h-[26%] border-b border-[#d4c8b8] shadow-sm ${getColorClass(sq.color)}`} />
        )}
        
        {/* Top Icon for specials */}
        {sq.kind === "chance" && <WalletCards className="w-4 h-4 text-[#eab308] mt-1 drop-shadow-sm" />}
        {sq.kind === "tax" && <Coins className="w-4 h-4 text-[#ef4444] mt-1 drop-shadow-sm" />}
        {sq.kind === "utility" && sq.type === "water" && <Droplets className="w-4 h-4 text-[#3b82f6] mt-1 drop-shadow-sm" />}
        {sq.kind === "utility" && sq.type === "electric" && <Zap className="w-4 h-4 text-[#eab308] mt-1 drop-shadow-sm" />}
        {sq.kind === "utility" && sq.type === "station" && <Train className="w-4 h-4 text-[#6b7280] mt-1 drop-shadow-sm" />}
        {sq.kind === "jail" && <Siren className="w-4 h-4 text-[#ef4444] mt-1 drop-shadow-sm" />}
        {sq.kind === "gotojail" && <Gavel className="w-4 h-4 text-[#ef4444] mt-1 drop-shadow-sm" />}
        {sq.kind === "parking" && <MapPin className="w-4 h-4 text-[#3b82f6] mt-1 drop-shadow-sm" />}
        {sq.kind === "go" && <Landmark className="w-4 h-4 text-[#22c55e] mt-1 drop-shadow-sm" />}

        {/* Houses */}
        {state.houses[i] > 0 && (
          <div className="absolute top-0.5 w-full flex justify-center gap-[1px]">
            {Array.from({ length: state.houses[i] }).map((_, idx) => (
              <span key={idx} className="text-[7px] drop-shadow-md">{idx === 3 ? "🏨" : "🏠"}</span>
            ))}
          </div>
        )}

        <div className={`text-[6px] sm:text-[7px] font-bold text-gray-800 text-center leading-[1.1] w-full px-0.5 line-clamp-2 ${sq.kind !== "property" ? "mt-auto" : ""}`}>
          {sq.name}
        </div>

        {/* Bottom Price */}
        {(sq.kind === "property" || sq.kind === "utility") && (
          <div className="text-[6px] font-bold text-gray-600 w-full text-center pb-[2px]">${sq.price}</div>
        )}
        {(sq.kind === "tax") && (
          <div className="text-[6px] font-bold text-[#ef4444] w-full text-center pb-[2px]">-${sq.amount}</div>
        )}
        {(sq.kind === "go") && (
          <div className="text-[6px] font-bold text-[#22c55e] w-full text-center pb-[2px] mb-1">مرتب $200</div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] overflow-hidden w-full shadow-2xl font-sans">
      <div className="p-2 sm:p-3 aspect-square relative bg-[radial-gradient(circle_at_center,_#354333_0%,_#1a1f1a_100%)]">
        
        {/* Realistic Board Background */}
        <div className="absolute inset-2 sm:inset-3 bg-[linear-gradient(135deg,#dde9db_0%,#cfdcc7_45%,#dce6d6_100%)] rounded-sm shadow-inner ring-1 ring-black/20" dir="ltr">
          {BOARD.map((sq, i) => renderSquare(sq, i))}

          {state.allPlayers.map((p, idx) => {
            const isJoined = Object.keys(state.tokens).includes(p) || p === state.allPlayers[0];
            if (!isJoined && state.joinedCount <= 1) return null;
            // Spread tokens slightly if on same spot
            const pPos = state.pos[p] ?? 0;
            const sameSpotCount = state.allPlayers.filter(op => state.pos[op] === pPos).length;
            let offset = { x: 0, y: 0 };
            if (sameSpotCount > 1) {
              const ring = idx % sameSpotCount;
              offset.x = (ring === 1 || ring === 2 ? 6 : ring === 3 ? -6 : 0);
              offset.y = (ring === 2 || ring === 3 ? 6 : ring === 1 ? -6 : 0);
            }
            return (
              <div 
                key={p}
                className={`absolute z-50 flex items-center justify-center w-[14.28%] h-[14.28%] pointer-events-none transition-all duration-[600ms] ease-out drop-shadow-2xl ${p === me ? "z-[60]" : ""}`}
                style={{ ...getCellPos(pPos), transform: `translate(${offset.x}px, ${offset.y}px)` }}
              >
                <div className={`text-[18px] sm:text-[20px] filter drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] ${p === state.turn ? "animate-pulse scale-110" : ""}`}>
                  {state.tokens[p]}
                </div>
              </div>
            );
          })}

          {/* Center Area (Realistic style) */}
          <div className="absolute top-[14.28%] left-[14.28%] w-[71.42%] h-[71.42%] flex flex-col items-center justify-center p-3 sm:p-4 text-center pointer-events-none" dir="rtl">
            
            {/* Center Logo/Branding */}
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 rotate-[-45deg] select-none pointer-events-none">
              <Building2 className="w-32 h-32 text-green-900" />
              <div className="text-4xl font-black text-green-900 uppercase mt-2">بنك الحظ</div>
            </div>

            <div className="z-10 w-full h-full flex flex-col items-center justify-between pointer-events-auto relative">
              
              <div className="bg-gradient-to-br from-[#00d26a] to-[#00a854] px-4 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-lg border border-white/20 mb-1">
                <h3 className="text-[12px] sm:text-[15px] font-black text-white tracking-widest uppercase drop-shadow-md">بنك الحظ المصرى</h3>
              </div>

              {/* Dice Container */}
              <div className="flex gap-3 my-auto scale-90 sm:scale-100">
                <DiceFace value={displayDice[0]} rolling={isRolling} />
                <DiceFace value={displayDice[1]} rolling={isRolling} />
              </div>

              {/* Event Log Plaque */}
              <div className="w-full bg-white/90 backdrop-blur-sm rounded-lg border border-black/10 shadow-md p-1.5 sm:p-2 min-h-[42px] flex items-center justify-center mt-2 mb-2">
                {state.last ? (
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-gray-800">
                    <span className="text-[14px]">{state.last.icon}</span>
                    <span className="leading-tight">{state.last.text}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-500 font-medium">في انتظار الرمية الأولى...</div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Modern Controls Panel below the board */}
      <div className="bg-[#1a1a1a] p-3 border-t border-white/10" dir="rtl">
        {/* Scoreboard */}
        {state.allPlayers.filter(p => !state.bankrupt[p]).length <= 1 && state.joinedCount > 1 ? (
          <div className="text-[#00d26a] font-black text-center text-[15px] py-2 bg-[#00d26a]/10 rounded-lg animate-pulse border border-[#00d26a]/30">
            🏆 فاز {state.tokens[state.allPlayers.find(p => !state.bankrupt[p])!]}!
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-2 mb-3 pb-1 hide-scrollbar">
            {state.allPlayers.map((p) => {
              if (state.joinedCount <= 1 && p !== state.allPlayers[0] && p !== me) return null;
              const isTurn = state.turn === p;
              const isMe = p === me;
              return (
                <div key={p} className={`flex-1 min-w-[80px] flex flex-col items-center rounded-xl p-1.5 border-2 transition-all ${isTurn ? (isMe ? "border-[#0095f6] bg-[#0095f6]/10 shadow-[0_0_12px_rgba(0,149,246,0.25)] scale-105" : "border-[#ed4956] bg-[#ed4956]/10 shadow-[0_0_12px_rgba(237,73,86,0.25)] scale-105") : "border-white/5 bg-black/40"}`}>
                  <div className="text-[11px] text-[#a8a8a8] font-medium flex items-center gap-1">{isMe ? "أنت" : p} {state.tokens[p]}</div>
                  <div className={`text-[14px] font-black tracking-wide ${state.bankrupt[p] ? "text-red-500 line-through" : "text-[#00d26a]"}`}>
                    ${state.cash[p] ?? 0}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-2">
            <div className="text-[10px] text-[#777] mb-1">صك الملكية الحالي</div>
            <div className="text-[13px] text-white font-bold">
              {sq.kind === "property" || sq.kind === "utility" ? sq.name : "مفيش صك هنا"}
            </div>
            <div className="text-[11px] text-[#a8a8a8] mt-1">
              {sq.kind === "property"
                ? `سعر ${sq.price}$ • إيجار ${sq.rent}$${fullSetOwned ? " • طقم كامل x2" : ""} • بيوت ${state.houses[mePos] ?? 0}`
                : sq.kind === "utility"
                  ? `سعر ${sq.price}$ • مرفق خاص`
                  : sq.kind === "tax"
                    ? `ضريبة ${sq.amount}$`
                    : sq.kind === "chance"
                      ? "اسحب كارت"
                      : sq.kind === "go"
                        ? `مرتب ${sq.salary}$`
                        : sq.name}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-[#f7edd3] to-[#e7d2a7] p-2 text-[#2a210f] shadow-inner">
            <div className="text-[10px] font-bold tracking-wide uppercase opacity-70 mb-1">
              {state.lastCard?.deck === "chance" ? "Chance Card" : state.lastCard?.deck === "chest" ? "Community Chest" : "Card"}
            </div>
            <div className="text-[13px] font-black">{state.lastCard?.card.title ?? "آخر كارت"}</div>
            <div className="text-[11px] mt-1 leading-snug min-h-[34px]">
              {state.lastCard?.card.text ?? "لسه مفيش كارت متسحب."}
            </div>
          </div>
        </div>

        {/* Buttons */}
        {state.allPlayers.filter(p => !state.bankrupt[p]).length > 1 && (
          <div>
            {state.joinedCount < state.allPlayers.length && !Object.keys(state.tokens).includes(me) ? (
              <button onClick={join} className="w-full rounded-xl bg-gradient-to-r from-[#0095f6] to-[#0077c9] py-3 text-[14px] font-black text-white active:scale-[0.98] transition-all shadow-lg hover:shadow-[#0095f6]/40">
                انضم للعبة 🚗
              </button>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-stretch gap-2 w-full h-[42px]">
                  <button
                    onClick={roll}
                    disabled={!myTurn || isRolling}
                    className={`flex-[2] flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-black transition-all overflow-hidden ${myTurn ? "bg-gradient-to-r from-[#00d26a] to-[#00a854] text-white active:scale-[0.98] shadow-lg shadow-[#00d26a]/30 hover:brightness-110" : "bg-white/5 text-[#555] cursor-not-allowed"}`}
                  >
                    🎲 رمي النرد
                  </button>
                  {canBuy && (
                    <button
                      onClick={buy}
                      className="flex-1 rounded-xl text-[13px] font-black transition-all bg-gradient-to-r from-[#0095f6] to-[#0077c9] text-white active:scale-[0.98] shadow-lg shadow-[#0095f6]/30 hover:brightness-110"
                    >
                      🏠 شراء
                    </button>
                  )}
                </div>
                
                {(canUpgrade || canSell) && (
                  <div className="flex items-stretch gap-2 w-full h-[36px]">
                    {canUpgrade && (
                      <button
                        onClick={upgrade}
                        className="flex-1 rounded-lg text-[12px] font-bold transition-all bg-gradient-to-r from-[#eab308] to-[#ca8a04] text-white shadow-md active:scale-[0.98] hover:brightness-110"
                      >
                        🏗️ بناء ({Math.floor(sq.price / 2)}$)
                      </button>
                    )}
                    {canSell && (
                      <button
                        onClick={sell}
                        className="flex-1 rounded-lg text-[12px] font-bold transition-all bg-[#262626] text-[#fafafa] active:scale-[0.98] hover:bg-[#333] border border-white/10"
                      >
                        🏦 بيع
                      </button>
                    )}
                  </div>
                )}

                {state.inJail[me] && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-[11px] text-[#a8a8a8]">
                      محاولات الخروج: {state.jailAttempts[me] ?? 0}/3
                    </div>
                    <button
                      onClick={useJailCard}
                      disabled={!canUseJailCard}
                      className={`rounded-lg text-[12px] font-bold transition-all ${
                        canUseJailCard
                          ? "bg-gradient-to-r from-[#eab308] to-[#ca8a04] text-white shadow-md active:scale-[0.98] hover:brightness-110"
                          : "bg-white/5 text-[#666] cursor-not-allowed border border-white/10"
                      }`}
                    >
                      🎫 خروج ({state.jailCards[me] ?? 0})
                    </button>
                  </div>
                )}

                <div className="mt-2 rounded-xl border border-white/10 bg-black/30 px-2 py-2">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#a8a8a8]">
                    <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" />البيوت عندك</span>
                    <span className="font-bold text-white">
                      {Object.entries(state.owner).filter(([, v]) => v === me).length} أملاك /{" "}
                      {Object.values(state.houses).reduce((a, b) => a + b, 0)} مباني
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
