import { useRoute } from "wouter";
import { Sidebar } from "@/components/chat/Sidebar";
import { MainArea } from "@/components/chat/MainArea";

export default function Inbox() {
  const [matchT, paramsT] = useRoute("/t/:id");
  const [matchId, paramsId] = useRoute("/:id");
  const activeId = matchT ? paramsT.id : matchId ? paramsId.id : null;

  return (
    <div className="flex h-[100dvh] bg-[#050505] text-white overflow-hidden font-sans relative">
      {/* ── Beautiful Ambient Background ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.25] z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#833ab4] blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#3797f0] blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-[#ff0844] blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      {/* ── Cinematic Grain Overlay ── */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      <Sidebar activeId={activeId} />
      <MainArea activeId={activeId} />
    </div>
  );
}