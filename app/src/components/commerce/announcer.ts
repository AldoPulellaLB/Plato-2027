// A tiny polite live region store: commerce actions announce what happened
// ("House Blend 250g added to your bag"). The CartDrawer renders the region.
import { useSyncExternalStore } from "react";

let message = "";
let seq = 0;
const listeners = new Set<() => void>();

export function announce(text: string) {
  // Alternate a trailing space so repeating the same text still changes the
  // region's content and is announced again.
  seq += 1;
  message = seq % 2 ? text : `${text} `;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAnnouncement() {
  return useSyncExternalStore(
    subscribe,
    () => message,
    () => "",
  );
}
