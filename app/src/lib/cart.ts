// Client cart store. Persisted on the device (localStorage), read through
// useSyncExternalStore so SSR renders an empty, stable cart. Prices are never
// trusted from here: checkout re-prices every line on the server.
import { useSyncExternalStore } from "react";

import { findVariant } from "./catalog";

export interface CartLine {
  variantId: string;
  quantity: number;
}

export interface CartState {
  lines: CartLine[];
  /** Drawer visibility. */
  open: boolean;
  /** Increments on every add, so triggers can play a "bump" animation. */
  bump: number;
  /** The last line that was added (for the drawer's "just added" highlight). */
  lastAdded: string | null;
}

const KEY = "plato.cart.v2";
const EMPTY: CartState = { lines: [], open: false, bump: 0, lastAdded: null };

let state: CartState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { lines?: CartLine[] };
    const lines = (parsed.lines ?? []).filter(
      (l) => typeof l.variantId === "string" && Number.isInteger(l.quantity) && l.quantity > 0 && findVariant(l.variantId),
    );
    state = { ...state, lines };
  } catch {
    // Ignore unreadable storage; the cart simply starts empty.
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ lines: state.lines }));
  } catch {
    // Storage may be full or blocked; the in-memory cart still works.
  }
}

function set(next: CartState) {
  state = next;
  persist();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  // Notify once after hydration so subscribers pick up the stored cart.
  queueMicrotask(listener);
  return () => listeners.delete(listener);
}

export const cart = {
  get: () => state,
  subscribe,
  add(variantId: string, quantity = 1, options: { open?: boolean } = {}) {
    hydrate();
    if (!findVariant(variantId)) return;
    const existing = state.lines.find((l) => l.variantId === variantId);
    const lines = existing
      ? state.lines.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l))
      : [...state.lines, { variantId, quantity: Math.min(99, quantity) }];
    set({ ...state, lines, bump: state.bump + 1, lastAdded: variantId, open: options.open ?? state.open });
  },
  setQuantity(variantId: string, quantity: number) {
    const lines =
      quantity <= 0
        ? state.lines.filter((l) => l.variantId !== variantId)
        : state.lines.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(99, quantity) } : l));
    set({ ...state, lines });
  },
  remove(variantId: string) {
    set({ ...state, lines: state.lines.filter((l) => l.variantId !== variantId) });
  },
  clear() {
    set({ ...state, lines: [], lastAdded: null });
  },
  open() {
    set({ ...state, open: true });
  },
  close() {
    set({ ...state, open: false });
  },
  toggle() {
    set({ ...state, open: !state.open });
  },
};

export function useCart(): CartState {
  return useSyncExternalStore(subscribe, cart.get, () => EMPTY);
}

export function cartCount(s: CartState) {
  return s.lines.reduce((n, l) => n + l.quantity, 0);
}

/** Resolved lines with product + variant + line total (cents). Unknown variants are dropped. */
export function cartDetails(s: CartState) {
  const items = s.lines.flatMap((line) => {
    const found = findVariant(line.variantId);
    if (!found) return [];
    return [{ ...line, product: found.product, variant: found.variant, total: found.variant.price * line.quantity }];
  });
  const subtotal = items.reduce((n, i) => n + i.total, 0);
  return { items, subtotal };
}
