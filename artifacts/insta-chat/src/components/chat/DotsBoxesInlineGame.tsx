import { useMemo, useEffect } from "react";
import { Message } from "@/lib/types";
import { useMe } from "@/lib/me";
import { useChatStore } from "@/lib/store";

type DbStartPayload = { kind: "db_start"; gameId: string; createdBy: string; gridSize: number };
type DbMovePayload = { kind: "db_move"; gameId: string; by: string; lineId: string; isBoxCompleted: boolean };
type DbSkipPayload = { kind: "db_skip"; gameId: string; by: string };
type Payload = DbStartPayload | DbMovePayload | DbSkipPayload;

export function DotsBoxesInlineGame({
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

  const start = useMemo(() => {
    try { return JSON.parse(gameMessage.content) as DbStartPayload; }
    catch { return null; }
  }, [gameMessage.content]);

  const gameId = start?.gameId;
  const gridSize = start?.gridSize ?? 4; // 4 means 4x4 boxes (5x5 dots)

  const events = useMemo(() => {
    if (!gameId) return [];
    const out: Payload[] = [];
    for (const m of allMessages) {
      if (m.type !== "game") continue;
      try {
        const p = JSON.parse(m.content) as Payload;
        if (p.gameId === gameId) out.push(p);
      } catch {}
    }
    return out;
  }, [allMessages, gameId]);

  const state = useMemo(() => {
    if (!start) return null;
    const p1 = start.createdBy.toLowerCase();
    const p2 = p1 === me ? otherUserId.toLowerCase() : me;
    
    const lines = new Set<string>();
    const boxes = new Map<string, string>(); // boxId -> owner
    let turn = p1;
    let p1Score = 0;
    let p2Score = 0;

    for (const ev of events) {
      if (ev.kind === "db_skip" && ev.by === turn) {
        turn = turn === p1 ? p2 : p1;
        continue;
      }
      if (ev.kind === "db_move" && ev.by === turn) {
        if (!lines.has(ev.lineId)) {
          lines.add(ev.lineId);
          
          // Check if any box was completed by this move.
          // In a real authoritative backend, we'd calculate this. 
          // Here, we trust the client's payload 'isBoxCompleted' to keep replay simple, 
          // but let's calculate it deterministically to be safe!
          
          const parts = ev.lineId.split("-");
          const type = parts[0]; // "h" or "v"
          const r = parseInt(parts[1]!);
          const c = parseInt(parts[2]!);
          
          let completedAny = false;

          const checkAndClaimBox = (br: number, bc: number) => {
            if (br < 0 || br >= gridSize || bc < 0 || bc >= gridSize) return;
            const boxId = `${br}-${bc}`;
            if (boxes.has(boxId)) return;
            
            // A box (br, bc) needs:
            // top: h-br-bc
            // bottom: h-(br+1)-bc
            // left: v-br-bc
            // right: v-br-(bc+1)
            const top = `h-${br}-${bc}`;
            const bot = `h-${br+1}-${bc}`;
            const left = `v-${br}-${bc}`;
            const right = `v-${br}-${bc+1}`;
            
            if (lines.has(top) && lines.has(bot) && lines.has(left) && lines.has(right)) {
              boxes.set(boxId, turn);
              if (turn === p1) p1Score++; else p2Score++;
              completedAny = true;
            }
          };

          if (type === "h") {
            checkAndClaimBox(r - 1, c); // Box above
            checkAndClaimBox(r, c);     // Box below
          } else {
            checkAndClaimBox(r, c - 1); // Box left
            checkAndClaimBox(r, c);     // Box right
          }

          if (!completedAny) {
            turn = turn === p1 ? p2 : p1;
          }
        }
      }
    }

    const totalBoxes = gridSize * gridSize;
    const isDone = (p1Score + p2Score) === totalBoxes;
    let winner: string | null = null;
    if (isDone) {
      if (p1Score > p2Score) winner = p1;
      else if (p2Score > p1Score) winner = p2;
      else winner = "draw";
    }

    return { lines, boxes, turn, p1Score, p2Score, winner, isDone, p1, p2 };
  }, [events, otherUserId, start, gridSize]);

  if (!start || !state) return <div className="text-white">لعبة نقط غير صالحة</div>;

  const myTurn = state.turn === me;
  const isDone = state.isDone;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cheat code: pressing 'P' or 'p' skips your turn and gives it to the opponent
      if ((e.key === "p" || e.key === "P") && myTurn && !isDone) {
        const payload: DbSkipPayload = { kind: "db_skip", gameId: start.gameId, by: me };
        sendMessage(conversationId, JSON.stringify(payload), "game");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [myTurn, isDone, start.gameId, me, conversationId, sendMessage]);

  const handleLineClick = (type: "h" | "v", r: number, c: number) => {
    if (!myTurn || isDone) return;
    const lineId = `${type}-${r}-${c}`;
    if (state.lines.has(lineId)) return;

    // We don't strictly need to pass isBoxCompleted as the replay calculates it, but keeping it for structure
    const payload: DbMovePayload = { kind: "db_move", gameId: start.gameId, by: me, lineId, isBoxCompleted: false };
    sendMessage(conversationId, JSON.stringify(payload), "game");
  };

  const getLineClass = (type: "h" | "v", r: number, c: number) => {
    const lineId = `${type}-${r}-${c}`;
    const taken = state.lines.has(lineId);
    
    if (type === "h") {
      return `absolute h-2 sm:h-3 cursor-pointer group flex items-center justify-center -translate-y-1/2 z-10 transition-colors ${
        taken ? "bg-white z-20 shadow-[0_0_8px_rgba(255,255,255,0.8)]" : myTurn && !isDone ? "bg-transparent hover:bg-white/30" : "bg-transparent"
      }`;
    } else {
      return `absolute w-2 sm:w-3 cursor-pointer group flex items-center justify-center -translate-x-1/2 z-10 transition-colors ${
        taken ? "bg-white z-20 shadow-[0_0_8px_rgba(255,255,255,0.8)]" : myTurn && !isDone ? "bg-transparent hover:bg-white/30" : "bg-transparent"
      }`;
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f172a] overflow-hidden w-full shadow-xl">
      <div className="bg-[#1e293b] px-3 py-2 flex justify-between items-center border-b border-white/10">
        <div className="font-bold text-white text-[13px]">✍️ نقط ومربعات</div>
        <div className="text-[11px] text-[#ddd]">
          {isDone ? (state.winner === me ? "أنت فزت! 🎉" : state.winner === state.p2 ? "الخصم فاز 😢" : "تعادل!") : (myTurn ? "دورك تقفل مربع" : "دور الخصم")}
        </div>
      </div>

      <div className="p-4 flex flex-col items-center">
        {/* Score Board */}
        <div className="flex w-full justify-between gap-3 text-[11px] mb-6">
          <div className={`flex-1 rounded-lg border ${state.p1 === me ? "border-[#0ea5e9] bg-[#0ea5e9]/20" : "border-[#ec4899] bg-[#ec4899]/20"} p-2 flex flex-col items-center shadow-inner`}>
            <div className="text-white/70 mb-1">{state.p1 === me ? "أنت" : "الطرف التاني"}</div>
            <div className="text-2xl font-black text-white leading-none">{state.p1Score}</div>
          </div>
          <div className={`flex-1 rounded-lg border ${state.p2 === me ? "border-[#0ea5e9] bg-[#0ea5e9]/20" : "border-[#ec4899] bg-[#ec4899]/20"} p-2 flex flex-col items-center shadow-inner`}>
            <div className="text-white/70 mb-1">{state.p2 === me ? "أنت" : "الطرف التاني"}</div>
            <div className="text-2xl font-black text-white leading-none">{state.p2Score}</div>
          </div>
        </div>

        {/* Board */}
        <div className="relative" style={{ width: `${gridSize * 40}px`, height: `${gridSize * 40}px` }}>
          {/* Boxes */}
          {Array.from({ length: gridSize }).map((_, r) =>
            Array.from({ length: gridSize }).map((_, c) => {
              const boxId = `${r}-${c}`;
              const owner = state.boxes.get(boxId);
              const isP1 = owner === state.p1;
              const isP2 = owner === state.p2;
              
              return (
                <div
                  key={`box-${boxId}`}
                  className={`absolute transition-all duration-300 animate-in zoom-in ${
                    isP1 ? "bg-[#0ea5e9]/40" : isP2 ? "bg-[#ec4899]/40" : "bg-transparent"
                  }`}
                  style={{ top: `${r * 40}px`, left: `${c * 40}px`, width: "40px", height: "40px" }}
                >
                  {owner && (
                    <div className="w-full h-full flex items-center justify-center opacity-30 text-white font-bold">
                      {isP1 ? "1" : "2"}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Horizontal Lines */}
          {Array.from({ length: gridSize + 1 }).map((_, r) =>
            Array.from({ length: gridSize }).map((_, c) => (
              <div
                key={`h-${r}-${c}`}
                className={getLineClass("h", r, c)}
                style={{ top: `${r * 40}px`, left: `${c * 40}px`, width: "40px" }}
                onClick={() => handleLineClick("h", r, c)}
              />
            ))
          )}

          {/* Vertical Lines */}
          {Array.from({ length: gridSize }).map((_, r) =>
            Array.from({ length: gridSize + 1 }).map((_, c) => (
              <div
                key={`v-${r}-${c}`}
                className={getLineClass("v", r, c)}
                style={{ top: `${r * 40}px`, left: `${c * 40}px`, height: "40px" }}
                onClick={() => handleLineClick("v", r, c)}
              />
            ))
          )}

          {/* Dots */}
          {Array.from({ length: gridSize + 1 }).map((_, r) =>
            Array.from({ length: gridSize + 1 }).map((_, c) => (
              <div
                key={`d-${r}-${c}`}
                className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#cbd5e1] rounded-full -translate-x-1/2 -translate-y-1/2 z-30 shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                style={{ top: `${r * 40}px`, left: `${c * 40}px` }}
              />
            ))
          )}
        </div>
        
        <div className="mt-6 text-[10px] text-white/40 text-center">
          العب خط.. وإذا قفلت مربع هتكسب نقطة وتلعب مرة كمان!
        </div>
      </div>
    </div>
  );
}
