import { useEffect, useRef } from "react";
import Lenis from "lenis";

/**
 * useLenis — Attaches a Lenis smooth-scroll instance to a given container ref.
 *
 * Rules:
 *  - DO NOT use on Virtuoso scroll containers (Virtuoso manages its own RAF loop).
 *  - Targets 120 FPS on high-refresh-rate displays automatically via RAF.
 *  - Easing: expo-out curve (feels instant but silky).
 */
export function useLenis(containerRef: React.RefObject<HTMLElement | null>) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const lenis = new Lenis({
      wrapper: el,
      content: el,
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
      infinite: false,
      autoRaf: true,
    });

    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []); // containerRef is a stable ref, no need as dep

  return lenisRef;
}
