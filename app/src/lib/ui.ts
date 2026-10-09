// Tiny UI store for global overlays (full-screen menu, sound). Client only.
import { useSyncExternalStore } from "react";

export interface UiState {
  menuOpen: boolean;
  soundOn: boolean;
  /** True once the preloader has finished (story intros wait for it). */
  ready: boolean;
}

const INITIAL: UiState = { menuOpen: false, soundOn: false, ready: false };
let state: UiState = INITIAL;
const listeners = new Set<() => void>();

function set(patch: Partial<UiState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export const ui = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setMenu(open: boolean) {
    set({ menuOpen: open });
  },
  toggleMenu() {
    set({ menuOpen: !state.menuOpen });
  },
  setSound(on: boolean) {
    set({ soundOn: on });
  },
  setReady() {
    if (!state.ready) set({ ready: true });
  },
};

export function useUi(): UiState {
  return useSyncExternalStore(ui.subscribe, ui.get, () => INITIAL);
}
