import { useRoute } from "wouter";
import { Sidebar } from "@/components/chat/Sidebar";
import { MainArea } from "@/components/chat/MainArea";

export default function Inbox() {
  const [matchT, paramsT] = useRoute("/t/:id");
  const [matchId, paramsId] = useRoute("/:id");
  const activeId = matchT ? paramsT.id : matchId ? paramsId.id : null;

  return (
    <div className="flex h-[100dvh] bg-[#050505] text-white overflow-hidden font-sans relative">
      {/* ── Ultra-Fast 90 FPS Ambient Background ── */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 z-0"
        style={{
          background: `
            radial-gradient(circle at 10% 10%, rgba(131, 58, 180, 0.4) 0%, transparent 40%),
            radial-gradient(circle at 90% 90%, rgba(55, 151, 240, 0.4) 0%, transparent 40%),
            radial-gradient(circle at 60% 40%, rgba(255, 8, 68, 0.3) 0%, transparent 30%)
          `
        }}
      />

      <Sidebar activeId={activeId} />
      <MainArea activeId={activeId} />
    </div>
  );
}