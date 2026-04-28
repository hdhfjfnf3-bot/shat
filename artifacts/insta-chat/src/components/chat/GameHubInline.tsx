import { useMemo } from "react";

import { Message, CURRENT_USER } from "@/lib/types";
import { useChatStore } from "@/lib/store";

type HubPayload = {
  kind: "hub";
  hubId: string;
  createdAt: string;
};

type RpsStartPayload = {
  kind: "rps";
  gameId: string;
  createdBy: string;
  createdAt: string;
  bestOf: 3 | 5;
};

type SlStartPayload = {
  kind: "sl_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
};

type XoStartPayload = {
  kind: "xo_start";
  gameId: string;
  createdBy: string;
};

type DbStartPayload = {
  kind: "db_start";
  gameId: string;
  createdBy: string;
  gridSize: number;
};

type C4StartPayload = {
  kind: "c4_start";
  gameId: string;
  createdBy: string;
};

type DominoStartPayload = {
  kind: "domino_start";
  gameId: string;
  createdBy: string;
};

type BankStartPayload = {
  kind: "bank_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
  token: "🚗" | "🏎️" | "🚕" | "🛻";
};

type CardsStartPayload = {
  kind: "cards_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
  mode: "war" | "high_card";
};

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function HubButton({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-right rounded-2xl border border-white/10 bg-[#0f0f0f] p-3",
        "hover:bg-white/5 active:bg-white/10 transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
      ].join(" ")}
    >
      <div className="text-[13px] font-bold text-white">{title}</div>
      <div className="text-[12px] text-[#a8a8a8] mt-0.5">{subtitle}</div>
    </button>
  );
}

export function GameHubInline({
  hubMessage,
  conversationId,
}: {
  hubMessage: Message;
  conversationId: string;
}) {
  const { sendMessage } = useChatStore();
  const payload = useMemo(() => safeJsonParse<HubPayload>(hubMessage.content), [hubMessage.content]);

  const send = (obj: unknown) => {
    sendMessage(conversationId, JSON.stringify(obj), "game");
  };

  if (!payload || payload.kind !== "hub") {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
        رسالة مركز ألعاب غير صالحة.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden">
      <div className="p-3">
        <div className="text-[13px] font-bold text-white">مركز الألعاب</div>
        <div className="text-[12px] text-[#a8a8a8] mt-0.5">
          اختاروا لعبة… كله جوّه الشات من غير ما تروحوا أي حتة.
        </div>
      </div>

      <div className="px-3 pb-3 grid gap-2">
        <HubButton
          title="🎲 حجر / ورقة / مقص"
          subtitle="سريعة وبتولّع الجو في ثواني."
          onClick={() => {
            const start: RpsStartPayload = {
              kind: "rps",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
              bestOf: 3,
            };
            send(start);
          }}
        />

        <HubButton
          title="❌⭕ إكس أو (Tic Tac Toe)"
          subtitle="تحدي الذكاء السريع، العبوا سوا جوه الشات."
          onClick={() => {
            const start: XoStartPayload = {
              kind: "xo_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
            };
            send(start);
          }}
        />

        <HubButton
          title="✍️ نقط ومربعات (Dots & Boxes)"
          subtitle="قفل المربع بخط وخد نقطة والعب تاني، ذكريات المدرسة!"
          onClick={() => {
            const start: DbStartPayload = {
              kind: "db_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              gridSize: 4, // 4x4 boxes = 5x5 dots
            };
            send(start);
          }}
        />

        <HubButton
          title="🔵🔴 أربعة في صف (Connect 4)"
          subtitle="أسقط الأقراص واعمل خط من 4 قبل صاحبك!"
          onClick={() => {
            const start: C4StartPayload = {
              kind: "c4_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
            };
            send(start);
          }}
        />

        <HubButton
          title="🐍🪜 السلم والثعبان"
          subtitle="نرد + حركة + سلالم وثعابين… والسبق لحد 100."
          onClick={() => {
            const start: SlStartPayload = {
              kind: "sl_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
            };
            send(start);
          }}
        />

        <HubButton
          title="🏦🚗 بنك الحظ (فلوس + بنك + أملاك)"
          subtitle="نسخة خفيفة ممتعة: لفّ، اشترى، ادفع إيجار، وابنِ ثروة."
          onClick={() => {
            const tokens: BankStartPayload["token"][] = ["🚗", "🏎️", "🚕", "🛻"];
            const start: BankStartPayload = {
              kind: "bank_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
              token: tokens[Math.floor(Math.random() * tokens.length)]!,
            };
            send(start);
          }}
        />

        <HubButton
          title="🎲 ضومنة (Dominoes)"
          subtitle="سحب وتوصيل أحجار الضومنة، مين يخلص اللي معاه الأول؟"
          onClick={() => {
            const start: DominoStartPayload = {
              kind: "domino_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
            };
            send(start);
          }}
        />

        <HubButton
          title="🃏 كوتشينة: حرب"
          subtitle="كل واحد يسحب ورقة… الأعلى يكسب نقطة."
          onClick={() => {
            const start: CardsStartPayload = {
              kind: "cards_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
              mode: "war",
            };
            send(start);
          }}
        />

        <HubButton
          title="🃏 كوتشينة: أعلى ورقة"
          subtitle="جولة واحدة سريعة: ورقة وخلصنا."
          onClick={() => {
            const start: CardsStartPayload = {
              kind: "cards_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
              mode: "high_card",
            };
            send(start);
          }}
        />
      </div>
    </div>
  );
}

