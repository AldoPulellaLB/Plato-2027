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
let syncing = false;
const listeners = new Set<() => void>();

function readStoredLines(): CartLine[] | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { lines?: CartLine[] };
    return (parsed.lines ?? []).filter(
      (l) => typeof l.variantId === "string" && Number.isInteger(l.quantity) && l.quantity > 0 && findVariant(l.variantId),
    );
  } catch {
    // Unreadable or blocked storage: keep whatever is in memory.
    return null;
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const lines = readStoredLines();
  if (lines) state = { ...state, lines };
}

/** Another tab changed the bag: adopt its lines (never write them back). */
function onStorage(e: StorageEvent) {
  if (e.key !== null && e.key !== KEY) return;
  const lines = readStoredLines();
  if (!lines) return;
  state = { ...state, lines };
  for (const listener of listeners) listener();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ lines: state.lines }));
  } catch {
    // Storage may be full or blocked; the in-memory cart still works.
  }
}

/** Only line changes are persisted, so opening or closing the drawer in one
 *  tab can never overwrite the bag another tab just changed. */
function set(next: CartState) {
  const linesChanged = next.lines !== state.lines;
  state = next;
  if (linesChanged) persist();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  hydrate();
  if (!syncing && typeof window !== "undefined") {
    syncing = true;
    window.addEventListener("storage", onStorage);
  }
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
    hydrate();
    const lines =
      quantity <= 0
        ? state.lines.filter((l) => l.variantId !== variantId)
        : state.lines.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(99, quantity) } : l));
    set({ ...state, lines });
  },
  remove(variantId: string) {
    hydrate();
    set({ ...state, lines: state.lines.filter((l) => l.variantId !== variantId) });
  },
  clear() {
    hydrate();
    set({ ...state, lines: [], lastAdded: null });
  },
  open() {
    hydrate();
    set({ ...state, open: true });
  },
  close() {
    hydrate();
    if (!state.open) return;
    set({ ...state, open: false });
  },
  toggle() {
    hydrate();
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
