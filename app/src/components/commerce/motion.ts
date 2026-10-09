// Small client-motion helpers shared by the store (SSR safe).
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const noopSubscribe = () => () => {};

function subscribeReduced(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}

/** Live prefers-reduced-motion (false during SSR). */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * False on the server and while hydrating (so SSR output stays stable), true
 * on every client render after that, including client-side mounts.
 */
export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * True for a component's first render when it is being hydrated from SSR
 * markup, false when it mounts on the client (e.g. after navigation).
 */
export function useFromServer() {
  const hydrating = useSyncExternalStore(
    noopSubscribe,
    () => false,
    () => true,
  );
  const [fromServer] = useState(hydrating);
  return fromServer;
}

/**
 * Scroll reveal without a flash: armed in a layout effect (before paint) for
 * client mounts; when hydrating, anything already on screen is left as the
 * server painted it (CSS intro keyframes handle those). Sets
 * data-reveal="idle" then "play", plus --reveal-delay.
 */
export function useRevealOnce<T extends HTMLElement>(delay = 0) {
  const ref = useRef<T>(null);
  const fromServer = useFromServer();

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    if (rect.bottom < 0) return;
    if (fromServer && rect.top < window.innerHeight) return;
    el.dataset.reveal = "idle";
    el.style.setProperty("--reveal-delay", `${delay}ms`);
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        raf = requestAnimationFrame(() => {
          raf = requestAnimationFrame(() => {
            el.dataset.reveal = "play";
          });
        });
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      if (el.dataset.reveal === "idle") delete el.dataset.reveal;
    };
  }, []);

  return { ref, fromServer };
}
