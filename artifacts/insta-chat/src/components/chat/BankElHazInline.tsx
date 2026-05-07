import { useMemo, useState, useEffect } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";
import { Coins, Siren, Train, Zap, Droplets, MapPin, Building2, Gavel, Landmark, Home, WalletCards } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type BankStartPayload = { kind: "bank_start"; gameId: string; createdBy: string; createdAt: string; token: "🚗" | "🏎️" | "🚕" | "🛻" };
type BankJoinPayload = { kind: "bank_join"; gameId: string; by: string; token: "🚗" | "🏎️" | "🚕" | "🛻"; at: string };
type BankRollPayload = { kind: "bank_roll"; gameId: string; by: string; d1: number; d2: number; at: string };
type BankBuyPayload = { kind: "bank_buy"; gameId: string; by: string; square: number; at: string };
type BankPayPayload = { kind: "bank_pay"; gameId: string; by: string; to: string; amount: number; reason: string; at: string };
type BankUpgradePayload = { kind: "bank_upgrade"; gameId: string; by: string; square: number; at: string };
type BankSellPayload = { kind: "bank_sell"; gameId: string; by: string; square: number; at: string };
type BankUseJailCardPayload = { kind: "bank_use_jail_card"; gameId: string; by: string; at: string };

type BankPayload =
  | BankStartPayload | BankJoinPayload | BankRollPayload | BankBuyPayload
  | BankPayPayload | BankUpgradePayload | BankSellPayload | BankUseJailCardPayload;

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
  title: string; text: string;
  effect: { kind: "money"; amount: number } | { kind: "move"; to: number } | { kind: "jail" } | { kind: "jail_card" };
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
    <motion.div 
      initial={false}
      animate={{ 
        rotateX: rolling ? [0, 360, 720, 1080] : 0, 
        rotateY: rolling ? [0, 360, 720, 1080] : 0,
        z: rolling ? [0, 100, 0] : 0
      }}
      transition={{ duration: 0.6, type: "spring", stiffness: 100, damping: 10 }}
      className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl shadow-[inset_0_-4px_4px_rgba(0,0,0,0.2),0_10px_20px_rgba(0,0,0,0.5)] relative border border-gray-200"
      style={{ transformStyle: "preserve-3d" }}
    >
      {dots.map(([x, y], i) => (
        <div key={i} className="absolute w-2.5 h-2.5 bg-black rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]" style={{ top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' }} />
      ))}
    </motion.div>
  );
};

export function BankElHazInline({ gameMessage, otherUserId, conversationId, allMessages, participants }: { gameMessage: Message; otherUserId: string; conversationId: string; allMessages: Message[]; participants?: import("@/lib/types").User[] }) {
  const me = useMe((s) => s.username).toLowerCase();
  const { sendMessage } = useChatStore();
  const [isRolling, setIsRolling] = useState(false);
  const [displayDice, setDisplayDice] = useState<[number, number]>([6, 6]);
  
  const [cheatMode, setCheatMode] = useState(false);
  const [cheatValue, setCheatValue] = useState<number | "">("");

  useEffect(() => {
    const keys = new Set<string>();
    const onDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      if (keys.has("a") && keys.has("s")) setCheatMode(true);
    };
    const onUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);

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

  const sq = BOARD[mePos]!;
  const amOwner = state.owner[mePos] === me;
  const meCash = state.cash[me] ?? 0;
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

    let d1 = Math.floor(Math.random() * 6) + 1;
    let d2 = Math.floor(Math.random() * 6) + 1;

    if (cheatMode && typeof cheatValue === "number" && cheatValue >= 2 && cheatValue <= 12) {
      d1 = Math.min(6, cheatValue - 1);
      d2 = cheatValue - d1;
      if (d1 === 0 || d2 === 0) { d1 = Math.min(6, cheatValue); d2 = Math.max(1, cheatValue - 6); }
      setCheatMode(false);
      setCheatValue("");
    }

    useChatStore.getState().triggerDiceRoll([d1, d2], () => {
      setDisplayDice([d1, d2]);
      sendMessage(conversationId, JSON.stringify({ kind: "bank_roll", gameId, by: me, d1, d2, at: new Date().toISOString() }), "game");
      setIsRolling(false);
    });
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
      case "أحمر": return "bg-[#ff3b30]";
      case "أزرق": return "bg-[#007aff]";
      case "أصفر": return "bg-[#ffcc00]";
      case "أخضر": return "bg-[#34c759]";
      case "بنفسجي": return "bg-[#af52de]";
      case "أسود": return "bg-[#1c1c1e]";
      default: return "bg-transparent";
    }
  }

  function renderSquare(sq: Square, i: number) {
    const isOwnedByMe = state.owner[i] === me;
    const isOwnedByOther = state.owner[i] && state.owner[i] !== me;
    const ownerColor = isOwnedByMe ? "border-b-4 border-b-[#007aff]" : isOwnedByOther ? "border-b-4 border-b-[#ff3b30]" : "";

    return (
      <div 
        key={i} 
        className={cn("absolute bg-[#f9f8f3] border border-[#d4c8b8]/50 shadow-sm flex flex-col items-center justify-between overflow-hidden", ownerColor)}
        style={getCellPos(i)}
      >
        {sq.kind === "property" && (
          <div className={cn("w-full h-[28%] border-b border-[#d4c8b8] shadow-sm", getColorClass(sq.color))} />
        )}
        
        {sq.kind === "chance" && <WalletCards className="w-5 h-5 text-[#ffcc00] mt-1.5 drop-shadow-sm" />}
        {sq.kind === "tax" && <Coins className="w-5 h-5 text-[#ff3b30] mt-1.5 drop-shadow-sm" />}
        {sq.kind === "utility" && sq.type === "water" && <Droplets className="w-5 h-5 text-[#007aff] mt-1.5 drop-shadow-sm" />}
        {sq.kind === "utility" && sq.type === "electric" && <Zap className="w-5 h-5 text-[#ffcc00] mt-1.5 drop-shadow-sm" />}
        {sq.kind === "utility" && sq.type === "station" && <Train className="w-5 h-5 text-[#8e8e93] mt-1.5 drop-shadow-sm" />}
        {sq.kind === "jail" && <Siren className="w-5 h-5 text-[#ff3b30] mt-1.5 drop-shadow-sm" />}
        {sq.kind === "gotojail" && <Gavel className="w-5 h-5 text-[#ff3b30] mt-1.5 drop-shadow-sm" />}
        {sq.kind === "parking" && <MapPin className="w-5 h-5 text-[#007aff] mt-1.5 drop-shadow-sm" />}
        {sq.kind === "go" && <Landmark className="w-5 h-5 text-[#34c759] mt-1.5 drop-shadow-sm" />}

        {state.houses[i] > 0 && (
          <div className="absolute top-0.5 w-full flex justify-center gap-[1px]">
            {Array.from({ length: state.houses[i] }).map((_, idx) => (
              <span key={idx} className="text-[9px] drop-shadow-md">{idx === 3 ? "🏨" : "🏠"}</span>
            ))}
          </div>
        )}

        <div className={cn("text-[7px] sm:text-[9px] font-black text-gray-800 text-center leading-[1.1] w-full px-0.5 line-clamp-2", sq.kind !== "property" && "mt-auto")}>
          {sq.name}
        </div>

        {(sq.kind === "property" || sq.kind === "utility") && <div className="text-[7px] sm:text-[8px] font-bold text-gray-500 w-full text-center pb-[2px]">${sq.price}</div>}
        {(sq.kind === "tax") && <div className="text-[7px] sm:text-[8px] font-bold text-[#ff3b30] w-full text-center pb-[2px]">-${sq.amount}</div>}
        {(sq.kind === "go") && <div className="text-[7px] sm:text-[8px] font-bold text-[#34c759] w-full text-center pb-[2px] mb-1">مرتب $200</div>}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="rounded-[32px] border border-white/[0.1] bg-black/80 backdrop-blur-3xl overflow-hidden w-full shadow-[0_30px_80px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.1)] font-sans flex flex-col"
    >
      {/* The 3D Board Area */}
      <div className="p-4 sm:p-8 aspect-[4/3] sm:aspect-square relative flex items-center justify-center perspective-[1200px] overflow-visible">
        
        {/* Board Surface rotated in 3D */}
        <motion.div 
          className="w-full h-full relative"
          style={{ transformStyle: "preserve-3d" }}
          initial={{ rotateX: 35, rotateZ: -10, y: 20, scale: 0.9 }}
          animate={{ rotateX: 35, rotateZ: -10, y: 20, scale: 0.9 }}
        >
          {/* Wooden/Marble Base underneath the board */}
          <div className="absolute inset-[-10px] bg-gradient-to-br from-[#2a1a08] to-[#120a02] rounded-xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] transform translate-z-[-10px]" />
          
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#e9e3d9_0%,#d5cbb8_100%)] rounded-lg shadow-inner ring-1 ring-black/30 overflow-hidden border-4 border-[#3c2a1e]" dir="ltr">
            {BOARD.map((sq, i) => renderSquare(sq, i))}

            <AnimatePresence>
              {state.allPlayers.map((p, idx) => {
                const isJoined = Object.keys(state.tokens).includes(p) || p === state.allPlayers[0];
                if (!isJoined && state.joinedCount <= 1) return null;
                const pPos = state.pos[p] ?? 0;
                const sameSpotCount = state.allPlayers.filter(op => state.pos[op] === pPos).length;
                let offset = { x: 0, y: 0 };
                if (sameSpotCount > 1) {
                  const ring = idx % sameSpotCount;
                  offset.x = (ring === 1 || ring === 2 ? 10 : ring === 3 ? -10 : 0);
                  offset.y = (ring === 2 || ring === 3 ? 10 : ring === 1 ? -10 : 0);
                }
                return (
                  <motion.div 
                    key={p}
                    layout
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, ...getCellPos(pPos), x: offset.x, y: offset.y }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className={cn("absolute z-50 flex items-center justify-center w-[14.28%] h-[14.28%] pointer-events-none", p === me && "z-[60]")}
                  >
                    <motion.div 
                      animate={p === state.turn ? { y: [-5, 5, -5], scale: 1.2 } : {}}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className="text-[24px] sm:text-[32px] drop-shadow-[0_10px_10px_rgba(0,0,0,0.6)]"
                      style={{ transform: "rotateX(-35deg) rotateZ(10deg)" }} // Counter-rotate the token so it stands up
                    >
                      {state.tokens[p]}
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Center Area */}
            <div className="absolute top-[14.28%] left-[14.28%] w-[71.42%] h-[71.42%] flex flex-col items-center justify-center p-4 sm:p-6 text-center pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0%,transparent_70%)]" dir="rtl">
              
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-15 rotate-[-45deg] select-none pointer-events-none">
                <Building2 className="w-40 h-40 text-black" />
                <div className="text-5xl font-black text-black uppercase mt-2 tracking-widest">بنك الحظ</div>
              </div>

              <div className="z-10 w-full h-full flex flex-col items-center justify-between pointer-events-auto relative">
                <div className="bg-gradient-to-br from-[#00c6ff] to-[#0072ff] px-6 py-2 rounded-full shadow-2xl border border-white/40 mb-2">
                  <h3 className="text-[14px] sm:text-[18px] font-black text-white tracking-widest uppercase drop-shadow-md">بنك الحظ المصرى</h3>
                </div>

                <div className="flex gap-4 sm:gap-6 my-auto" style={{ transform: "rotateX(-35deg) rotateZ(10deg)" }}>
                  <DiceFace value={displayDice[0]} rolling={isRolling} />
                  <DiceFace value={displayDice[1]} rolling={isRolling} />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div 
                    key={state.last?.text || "empty"}
                    initial={{ opacity: 0, y: 10, rotateX: -20 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-[90%] bg-white/95 backdrop-blur-xl rounded-xl border border-black/10 shadow-[0_10px_20px_rgba(0,0,0,0.2)] p-2 sm:p-3 min-h-[50px] flex items-center justify-center mt-2 mb-2"
                  >
                    {state.last ? (
                      <div className="flex items-center gap-2 text-[12px] sm:text-[14px] font-bold text-gray-900">
                        <span className="text-[18px]">{state.last.icon}</span>
                        <span className="leading-tight">{state.last.text}</span>
                      </div>
                    ) : (
                      <div className="text-[12px] text-gray-500 font-medium">في انتظار الرمية الأولى...</div>
                    )}
                  </motion.div>
                </AnimatePresence>

              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modern Premium Controls Panel */}
      <div className="bg-black/40 backdrop-blur-3xl p-4 sm:p-6 border-t border-white/10 z-10" dir="rtl">
        {state.allPlayers.filter(p => !state.bankrupt[p]).length <= 1 && state.joinedCount > 1 ? (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-[#34c759] font-black text-center text-[18px] py-4 bg-[#34c759]/10 rounded-2xl border border-[#34c759]/30 shadow-[0_0_30px_rgba(52,199,89,0.2)]">
            🏆 فاز {state.tokens[state.allPlayers.find(p => !state.bankrupt[p])!]}!
          </motion.div>
        ) : (
          <div className="flex overflow-x-auto gap-3 mb-4 pb-2 hide-scrollbar snap-x">
            {state.allPlayers.map((p) => {
              if (state.joinedCount <= 1 && p !== state.allPlayers[0] && p !== me) return null;
              const isTurn = state.turn === p;
              const isMe = p === me;
              return (
                <motion.div 
                  key={p} 
                  layout
                  className={cn(
                    "flex-1 min-w-[100px] flex flex-col items-center rounded-[20px] p-3 border border-white/10 transition-all snap-center",
                    isTurn ? (isMe ? "bg-[#007aff]/20 border-[#007aff]/50 shadow-[0_0_20px_rgba(0,122,255,0.3)]" : "bg-[#ff3b30]/20 border-[#ff3b30]/50 shadow-[0_0_20px_rgba(255,59,48,0.3)]") : "bg-white/5"
                  )}
                >
                  <div className="text-[12px] text-white/60 font-medium flex items-center gap-1.5 mb-1">{isMe ? "أنت" : p} <span className="text-[16px] drop-shadow-md">{state.tokens[p]}</span></div>
                  <div className={cn("text-[18px] font-black tracking-wide", state.bankrupt[p] ? "text-red-500 line-through" : "text-white")}>
                    ${state.cash[p] ?? 0}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 backdrop-blur-md">
            <div className="text-[11px] text-white/50 mb-1 font-semibold uppercase tracking-wider">الخانة الحالية</div>
            <div className="text-[16px] text-white font-black drop-shadow-md">
              {sq.kind === "property" || sq.kind === "utility" ? sq.name : "مفيش صك هنا"}
            </div>
            <div className="text-[13px] text-white/70 mt-1 font-medium">
              {sq.kind === "property"
                ? `سعر ${sq.price}$ • إيجار ${sq.rent}$${fullSetOwned ? " • طقم x2" : ""} • بيوت ${state.houses[mePos] ?? 0}`
                : sq.kind === "utility" ? `سعر ${sq.price}$ • مرفق خاص`
                : sq.kind === "tax" ? `ضريبة ${sq.amount}$`
                : sq.kind === "chance" ? "اسحب كارت"
                : sq.kind === "go" ? `مرتب ${sq.salary}$`
                : sq.name}
            </div>
          </div>

          <div className="rounded-[20px] border border-white/20 bg-gradient-to-br from-[#f7edd3] to-[#d5cbb8] p-4 text-[#1a1208] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="text-[11px] font-black tracking-widest uppercase opacity-60 mb-1">
              {state.lastCard?.deck === "chance" ? "Chance Card" : state.lastCard?.deck === "chest" ? "Community Chest" : "Card"}
            </div>
            <div className="text-[16px] font-black">{state.lastCard?.card.title ?? "آخر كارت"}</div>
            <div className="text-[13px] mt-1 leading-snug font-bold opacity-80 min-h-[40px]">
              {state.lastCard?.card.text ?? "لسه مفيش كارت متسحب."}
            </div>
          </div>
        </div>

        {state.allPlayers.filter(p => !state.bankrupt[p]).length > 1 && (
          <div className="relative">
            {cheatMode && (
              <input 
                type="number" min={2} max={12} value={cheatValue} 
                onChange={(e) => setCheatValue(parseInt(e.target.value) || "")}
                className="w-12 h-8 bg-black/80 text-white text-center rounded absolute -top-10 left-2 z-50 text-[14px] outline-none ring-1 ring-white/30"
                placeholder="2-12"
              />
            )}
            {state.joinedCount < state.allPlayers.length && !Object.keys(state.tokens).includes(me) ? (
              <motion.button whileTap={{ scale: 0.95 }} onClick={join} className="w-full rounded-[20px] bg-[#007aff] py-4 text-[16px] font-black text-white shadow-[0_8px_20px_rgba(0,122,255,0.4)] border border-white/20">
                انضم للعبة 🚗
              </motion.button>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-stretch gap-3 w-full h-[54px]">
                  <motion.button
                    whileTap={myTurn && !isRolling ? { scale: 0.95 } : {}}
                    onClick={roll}
                    disabled={!myTurn || isRolling}
                    className={cn(
                      "flex-[2] flex items-center justify-center gap-2 rounded-[20px] text-[16px] font-black transition-all border",
                      myTurn 
                        ? "bg-[#34c759] text-white border-white/20 shadow-[0_8px_20px_rgba(52,199,89,0.4)]" 
                        : "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
                    )}
                  >
                    <span className="text-[20px]">🎲</span> رمي النرد
                  </motion.button>
                  {canBuy && (
                    <motion.button whileTap={{ scale: 0.95 }} onClick={buy} className="flex-1 rounded-[20px] text-[15px] font-black transition-all bg-[#007aff] text-white border border-white/20 shadow-[0_8px_20px_rgba(0,122,255,0.4)]">
                      🏠 شراء
                    </motion.button>
                  )}
                </div>
                
                {(canUpgrade || canSell) && (
                  <div className="flex items-stretch gap-3 w-full h-[46px]">
                    {canUpgrade && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={upgrade} className="flex-1 rounded-[16px] text-[14px] font-bold bg-[#ffcc00] text-black shadow-[0_4px_15px_rgba(255,204,0,0.3)]">
                        🏗️ بناء ({Math.floor(sq.price / 2)}$)
                      </motion.button>
                    )}
                    {canSell && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={sell} className="flex-1 rounded-[16px] text-[14px] font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20">
                        🏦 بيع
                      </motion.button>
                    )}
                  </div>
                )}

                {state.inJail[me] && (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div className="rounded-[16px] border border-white/10 bg-white/5 px-3 py-2.5 text-[13px] text-white/60 font-semibold flex items-center justify-center">
                      محاولات: {state.jailAttempts[me] ?? 0}/3
                    </div>
                    <motion.button whileTap={canUseJailCard ? { scale: 0.95 } : {}} onClick={useJailCard} disabled={!canUseJailCard} className={cn("rounded-[16px] text-[13px] font-bold transition-all border", canUseJailCard ? "bg-[#ffcc00] text-black shadow-lg border-white/20" : "bg-white/5 text-white/30 border-white/5 cursor-not-allowed")}>
                      🎫 كارت خروج ({state.jailCards[me] ?? 0})
                    </motion.button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
