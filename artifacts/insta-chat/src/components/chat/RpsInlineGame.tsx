import { useMemo } from "react";

import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";

type RpsMove = "rock" | "paper" | "scissors";
type RpsGamePayload = {
  kind: "rps";
  gameId: string;
  createdBy: string;
  createdAt: string;
  bestOf: 3 | 5;
};

type RpsMovePayload = {
  kind: "rps_move";
  gameId: string;
  move: RpsMove;
};

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function moveEmoji(m: RpsMove): string {
  if (m === "rock") return "🪨";
  if (m === "paper") return "📄";
  return "✂️";
}

function moveLabel(m: RpsMove): string {
  if (m === "rock") return "حجر";
  if (m === "paper") return "ورقة";
  return "مقص";
}

function roundWinner(a: RpsMove, b: RpsMove): 0 | 1 | 2 {
  if (a === b) return 0;
  if (a === "rock" && b === "scissors") return 1;
  if (a === "paper" && b === "rock") return 1;
  if (a === "scissors" && b === "paper") return 1;
  return 2;
}

function pickLastMove(messages: Message[], gameId: string, senderId: string): RpsMove | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.type !== "game") continue;
    if (m.senderId !== senderId) continue;
    const p = safeJsonParse<RpsMovePayload>(m.content);
    if (!p || p.kind !== "rps_move" || p.gameId !== gameId) continue;
    return p.move;
  }
  return null;
}

export function RpsInlineGame({
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
  const me = useMe((s) => s.username);
  const { sendMessage } = useChatStore();

  const payload = useMemo(() => safeJsonParse<RpsGamePayload>(gameMessage.content), [gameMessage.content]);
  const gameId = payload?.kind === "rps" ? payload.gameId : null;

  const myMove = useMemo(() => (gameId ? pickLastMove(allMessages, gameId, me) : null), [allMessages, gameId, me]);
  const theirMove = useMemo(
    () => (gameId ? pickLastMove(allMessages, gameId, otherUserId) : null),
    [allMessages, gameId, otherUserId],
  );

  const status = useMemo(() => {
    if (!payload || !gameId) return { title: "لعبة", sub: "فيه مشكلة في بيانات اللعبة." };
    if (!myMove && !theirMove) return { title: "حجر ورقة مقص", sub: "كل واحد يختار حركة." };
    if (myMove && !theirMove) return { title: "حجر ورقة مقص", sub: "تمام… مستني الطرف التاني يختار." };
    if (!myMove && theirMove) return { title: "حجر ورقة مقص", sub: "الطرف التاني اختار… دورك بقى." };
    const w = roundWinner(myMove!, theirMove!);
    if (w === 0) return { title: "تعادل", sub: `${moveEmoji(myMove!)} = ${moveEmoji(theirMove!)}` };
    if (w === 1) return { title: "أنت كسبت الراوند", sub: `${moveEmoji(myMove!)} beats ${moveEmoji(theirMove!)}` };
    return { title: "هو/هي كسب الراوند", sub: `${moveEmoji(theirMove!)} beats ${moveEmoji(myMove!)}` };
  }, [payload, gameId, myMove, theirMove]);

  if (!payload || !gameId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
        رسالة لعبة غير صالحة.
      </div>
    );
  }

  const sendMove = (move: RpsMove) => {
    const msg: RpsMovePayload = { kind: "rps_move", gameId, move };
    sendMessage(conversationId, JSON.stringify(msg), "game");
  };

  const chosen = myMove ? `${moveEmoji(myMove)} ${moveLabel(myMove)}` : "لسه";
  const otherChosen = theirMove ? `${moveEmoji(theirMove)} ${moveLabel(theirMove)}` : "لسه";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-white">{status.title}</div>
            <div className="text-[12px] text-[#a8a8a8] mt-0.5">{status.sub}</div>
          </div>
          <div className="text-[11px] text-[#666] shrink-0">Best of {payload.bestOf}</div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-xl border border-white/10 bg-black/30 p-2">
            <div className="text-[#666] mb-1">إنت</div>
            <div className="text-white">{chosen}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-2">
            <div className="text-[#666] mb-1">الطرف التاني</div>
            <div className="text-white">{otherChosen}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {([
            { move: "rock" as const, label: "حجر", emoji: "🪨" },
            { move: "paper" as const, label: "ورقة", emoji: "📄" },
            { move: "scissors" as const, label: "مقص", emoji: "✂️" },
          ] as const).map((b) => (
            <button
              key={b.move}
              type="button"
              onClick={() => sendMove(b.move)}
              className={[
                "flex-1 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors",
                "border-white/10 bg-[#0f0f0f] text-white hover:bg-white/5 active:bg-white/10",
              ].join(" ")}
              title={b.label}
            >
              <span className="mr-1">{b.emoji}</span>
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

