import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Inbox from "./pages/Inbox";
import { useMe } from "@/lib/me";
import { AuthScreen } from "@/components/AuthScreen";
import { useRealtime } from "@/lib/realtime";
import { sounds } from "@/lib/sounds";
import { checkUserExists } from "@/lib/auth";
import { InstallPWA } from "@/components/InstallPWA";
import { MotionConfig } from "framer-motion";
import { Global3DExperience } from "@/components/chat/Global3DExperience";
import { ThreeBackground } from "@/components/chat/ThreeBackground";
import { ThreeDDiceOverlay } from "@/components/chat/ThreeDDiceOverlay";

const queryClient = new QueryClient();

// Unlock AudioContext on first user gesture anywhere in the app
function useAudioUnlock() {
  useEffect(() => {
    const unlock = () => {
      sounds.unlock();
      // Also ask for notification permission on first gesture
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);
}

function AppShell() {
  useRealtime();
  useAudioUnlock();
  return (
    /* MotionConfig: GPU-only transitions (transform+opacity) at device refresh rate.
       Framer Motion automatically targets 120fps on ProMotion/high-refresh displays. */
    <MotionConfig
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 28,
        mass: 0.7,
      }}
      reducedMotion="user"
    >
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <ThreeBackground />
        <ThreeDDiceOverlay />
        <Switch>
          <Route path="/" component={Inbox} />
          <Route path="/t/:id" component={Inbox} />
          <Route path="/:id" component={Inbox} />
          <Route component={NotFound} />
        </Switch>
      </WouterRouter>
    </MotionConfig>
  );
}

function App() {
  const username = useMe((s) => s.username);
  const token = useMe((s) => s.token);
  const clearAuth = useMe((s) => s.clearAuth);

  // Validate session on load
  useEffect(() => {
    if (username) {
      checkUserExists(username).then((res) => {
        if (!res.exists) {
          console.error("Account missing from DB. Logging out.");
          clearAuth();
          window.location.href = "/";
        }
      }).catch(console.error);
    }
  }, [username, clearAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {username && token ? <AppShell /> : <AuthScreen />}
        <Toaster />
        <InstallPWA />
        <Global3DExperience />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
