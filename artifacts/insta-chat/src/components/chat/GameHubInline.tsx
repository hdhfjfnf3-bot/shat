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

type QndStartPayload = {
  kind: "qnd_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
  mode: "mix" | "questions" | "dares";
  level: "خفيف" | "تقيل";
  safeMode: boolean;
};

type EmojiPictStartPayload = {
  kind: "emoji_pict_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
};

type FastTapStartPayload = {
  kind: "fasttap_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
};

type WheelStartPayload = {
  kind: "wheel_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
  preset: "ضحك" | "رومانسية" | "ميكس";
};

type WordChainStartPayload = {
  kind: "wordchain_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
  rule: "آخر حرف" | "آخر حرفين";
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
  meta,
  onClick,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-right rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#0b0b0b_0%,#121212_65%,#0b0b0b_100%)] p-3",
        "hover:bg-white/5 active:bg-white/10 transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-black text-white">{title}</div>
          <div className="text-[12px] text-[#a8a8a8] mt-0.5 leading-snug">{subtitle}</div>
        </div>
        {meta ? (
          <div className="shrink-0 text-[11px] text-white/50 border border-white/10 rounded-full px-2 py-0.5">
            {meta}
          </div>
        ) : null}
      </div>
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
          title="🎭 أسئلة وتحديات"
          subtitle="شات ممتع: أسئلة، تحديات، وميكس… بمستويات."
          meta="جديد"
          onClick={() => {
            const start: QndStartPayload = {
              kind: "qnd_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
              mode: "mix",
              level: "خفيف",
              safeMode: true,
            };
            send(start);
          }}
        />

        <HubButton
          title="🧩 احكيها بالإيموجيز"
          subtitle="تلميح بإيموجيز… والتاني يخمّن في رسالة."
          meta="ضحك"
          onClick={() => {
            const start: EmojiPictStartPayload = {
              kind: "emoji_pict_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
            };
            send(start);
          }}
        />

        <HubButton
          title="⚡ النقر السريع"
          subtitle="مين يضغط أكتر؟ تحدي سريع يكسّر الملل."
          meta="سريع"
          onClick={() => {
            const start: FastTapStartPayload = {
              kind: "fasttap_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
            };
            send(start);
          }}
        />

        <HubButton
          title="🎡 عجلة الحظ"
          subtitle="لف… وتطلع مهمة/تحدي يغيّر المود."
          meta="ميكس"
          onClick={() => {
            const start: WheelStartPayload = {
              kind: "wheel_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
              preset: "ميكس",
            };
            send(start);
          }}
        />

        <HubButton
          title="🔗 سلسلة كلمات"
          subtitle="اكتب كلمة تبدأ بآخر حرف من اللي قبلها."
          meta="ذكاء"
          onClick={() => {
            const start: WordChainStartPayload = {
              kind: "wordchain_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
              rule: "آخر حرف",
            };
            send(start);
          }}
        />

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
          meta="طويلة"
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
          meta="سريعة"
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
          meta="سريعة"
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

