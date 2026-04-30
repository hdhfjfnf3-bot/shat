import { useMemo } from "react";

import { Message, CURRENT_USER } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import { Gamepad2 } from "lucide-react";

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

type WyrStartPayload = {
  kind: "wyr_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
};

type NhiStartPayload = {
  kind: "nhi_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
};

type ScrambleStartPayload = {
  kind: "scramble_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
};

type LoveCalcStartPayload = {
  kind: "lovecalc_start";
  gameId: string;
  createdBy: string;
  createdAt: string;
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

function GameCard({
  icon,
  title,
  isNew,
  isTrend,
  onClick,
}: {
  icon: string;
  title: string;
  isNew?: boolean;
  isTrend?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center justify-center aspect-square rounded-[20px] bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.97] border border-white/[0.05] hover:border-white/[0.15] transition-all overflow-hidden group shadow-sm"
    >
      <div className="text-[32px] mb-2 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 drop-shadow-lg">
        {icon}
      </div>
      <span className="text-[11px] font-bold text-[#e0e0e0] leading-tight text-center px-2 w-full">
        {title}
      </span>
      {isNew && (
        <div className="absolute top-2 left-2 bg-gradient-to-tr from-[#ff0844] to-[#ffb199] text-white text-[9px] font-bold px-1.5 py-[1px] rounded-full shadow-lg">
          جديد
        </div>
      )}
      {isTrend && !isNew && (
        <div className="absolute top-2 left-2 bg-gradient-to-tr from-[#f093fb] to-[#f5576c] text-white text-[9px] font-bold px-1.5 py-[1px] rounded-full shadow-lg">
          تريند
        </div>
      )}
    </button>
  );
}

export function GameHubInline({
  hubMessage,
  conversationId,
  isGroup,
  participants = [],
}: {
  hubMessage: Message;
  conversationId: string;
  isGroup?: boolean;
  participants?: import("@/lib/types").User[];
}) {
  const { sendMessage } = useChatStore();
  const payload = useMemo(() => safeJsonParse<HubPayload>(hubMessage.content), [hubMessage.content]);

  const send = (obj: unknown) => {
    sendMessage(conversationId, JSON.stringify(obj), "game");
  };

  if (!payload || payload.kind !== "hub") {
    return (
      <div className="rounded-[24px] border border-white/10 bg-[#141414] p-3 text-[13px] text-[#a8a8a8]">
        رسالة صالة ألعاب غير صالحة.
      </div>
    );
  }

  return (
    <div className="w-[300px] sm:w-[320px] rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,#15151e_0%,#0a0a0f_100%)] shadow-2xl overflow-hidden p-4">
      {/* Premium Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#a78bfa]/20 to-[#4f46e5]/20 flex items-center justify-center border border-[#a78bfa]/30 shadow-[0_0_15px_rgba(167,139,250,0.15)]">
          <Gamepad2 className="w-5 h-5 text-[#a78bfa]" />
        </div>
        <div>
          <div className="text-[15px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-wide">
            صالة الألعاب
          </div>
          <div className="text-[11px] font-medium text-[#8e8e93] mt-[1px]">
            اختاروا لعبة والعبوا جوه الشات!
          </div>
        </div>
      </div>

      {/* Compact Grid */}
      <div className="grid grid-cols-3 gap-2">
        <GameCard
          icon="🎭"
          title="تحديات"
          isNew
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

        <GameCard
          icon="⚖️"
          title="لو خيروك"
          isNew
          onClick={() => {
            const start: WyrStartPayload = {
              kind: "wyr_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
            };
            send(start);
          }}
        />

        <GameCard
          icon="🚫"
          title="عمرك عملت"
          isTrend
          onClick={() => {
            const start: NhiStartPayload = {
              kind: "nhi_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
            };
            send(start);
          }}
        />

        <GameCard
          icon="💖"
          title="مقياس الحب"
          isTrend
          onClick={() => {
            const start: LoveCalcStartPayload = {
              kind: "lovecalc_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
            };
            send(start);
          }}
        />

        <GameCard
          icon="🧩"
          title="إيموجيز"
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

        <GameCard
          icon="⚡"
          title="النقر السريع"
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

        <GameCard
          icon="🎡"
          title="عجلة الحظ"
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

        <GameCard
          icon="🔠"
          title="فك الشفرة"
          onClick={() => {
            const start: ScrambleStartPayload = {
              kind: "scramble_start",
              gameId: newId(),
              createdBy: CURRENT_USER.username,
              createdAt: new Date().toISOString(),
            };
            send(start);
          }}
        />

        <GameCard
          icon="🔗"
          title="كلمات"
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

        {!isGroup && (
          <GameCard
            icon="🎲"
            title="مقص"
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
        )}

        {!isGroup && (
          <GameCard
            icon="❌"
            title="إكس أو"
            onClick={() => {
              const start: XoStartPayload = {
                kind: "xo_start",
                gameId: newId(),
                createdBy: CURRENT_USER.username,
              };
              send(start);
            }}
          />
        )}

        {!isGroup && (
          <GameCard
            icon="🔴"
            title="4 في صف"
            onClick={() => {
              const start: C4StartPayload = {
                kind: "c4_start",
                gameId: newId(),
                createdBy: CURRENT_USER.username,
              };
              send(start);
            }}
          />
        )}

        {!isGroup && (
          <GameCard
            icon="✍️"
            title="مربعات"
            onClick={() => {
              const start: DbStartPayload = {
                kind: "db_start",
                gameId: newId(),
                createdBy: CURRENT_USER.username,
                gridSize: 4,
              };
              send(start);
            }}
          />
        )}

        {(!isGroup || participants.length <= 5) && (
          <GameCard
            icon="🐍"
            title="ثعبان"
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
        )}

        {(!isGroup || participants.length <= 3) && (
          <GameCard
            icon="🏦"
            title="بنك الحظ"
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
        )}

        {!isGroup && (
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
        )}

        {!isGroup && (
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
        )}

        {!isGroup && (
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
        )}
      </div>
    </div>
  );
}

