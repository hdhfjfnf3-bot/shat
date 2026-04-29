import { useRoute } from "wouter";
import { Sidebar } from "@/components/chat/Sidebar";
import { MainArea } from "@/components/chat/MainArea";

export default function Inbox() {
  const [matchT, paramsT] = useRoute("/t/:id");
  const [matchId, paramsId] = useRoute("/:id");
  const activeId = matchT ? paramsT.id : matchId ? paramsId.id : null;

  return (
    <div className="flex h-[100dvh] bg-[#050505] text-white overflow-hidden font-sans relative">
      {/* ── Ambient Background (Optimized for performance) ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.15] z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#833ab4] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#3797f0] blur-[120px]" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-[#ff0844] blur-[100px]" />
      </div>

      <Sidebar activeId={activeId} />
      <MainArea activeId={activeId} />
    </div>
  );
}