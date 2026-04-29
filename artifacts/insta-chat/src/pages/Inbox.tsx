import { useRoute } from "wouter";
import { Sidebar } from "@/components/chat/Sidebar";
import { MainArea } from "@/components/chat/MainArea";

export default function Inbox() {
  const [matchT, paramsT] = useRoute("/t/:id");
  const [matchId, paramsId] = useRoute("/:id");
  const activeId = matchT ? paramsT.id : matchId ? paramsId.id : null;

  return (
    <div className="fixed inset-0 flex text-white overflow-hidden font-sans bg-[#0e1117]">
      {/* ── Soft ambient gradient (zero GPU cost) ── */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30 z-0"
        style={{
          background: `
            radial-gradient(ellipse at 0% 0%, rgba(79, 124, 247, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, rgba(155, 106, 240, 0.18) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 0%, rgba(55, 175, 200, 0.08) 0%, transparent 40%)
          `
        }}
      />

      <Sidebar activeId={activeId} />
      <MainArea activeId={activeId} />
    </div>
  );
}