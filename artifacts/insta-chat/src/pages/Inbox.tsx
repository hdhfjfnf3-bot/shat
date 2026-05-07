import { useRoute } from "wouter";
import { Sidebar } from "@/components/chat/Sidebar";
import { MainArea } from "@/components/chat/MainArea";

export default function Inbox() {
  const [matchT, paramsT] = useRoute("/t/:id");
  const [matchId, paramsId] = useRoute("/:id");
  const activeId = matchT ? paramsT.id : matchId ? paramsId.id : null;

  return (
    <div className="fixed inset-0 flex text-white overflow-hidden font-sans bg-transparent">
      <div className="space-stars" />
      {/* Reduced background complexity for stable 120fps */}

      <Sidebar activeId={activeId} />
      <MainArea activeId={activeId} />
    </div>
  );
}