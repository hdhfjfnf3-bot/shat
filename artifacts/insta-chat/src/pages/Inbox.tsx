import { useRoute } from "wouter";
import { Sidebar } from "@/components/chat/Sidebar";
import { MainArea } from "@/components/chat/MainArea";

export default function Inbox() {
  const [match, params] = useRoute("/t/:id");
  const activeId = match ? params.id : null;

  return (
    <div className="flex h-[100dvh] bg-[#000000] text-white overflow-hidden font-sans">
      <Sidebar activeId={activeId} />
      <MainArea activeId={activeId} />
    </div>
  );
}