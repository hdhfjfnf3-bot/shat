import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Inbox from "./pages/Inbox";
import { useMe } from "@/lib/me";
import { SetupScreen } from "@/components/SetupScreen";
import { useRealtime } from "@/lib/realtime";

const queryClient = new QueryClient();

function AppShell() {
  useRealtime();
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={Inbox} />
        <Route path="/t/:id" component={Inbox} />
        <Route path="/:id" component={Inbox} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  const username = useMe((s) => s.username);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {username ? <AppShell /> : <SetupScreen />}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
