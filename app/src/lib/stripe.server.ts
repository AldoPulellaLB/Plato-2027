// Server-only Stripe helpers: secrets, REST calls, webhook signature check, order recording.

export interface StripeSession {
  id: string;
  payment_status: string;
  status?: string | null;
  amount_total: number | null;
  currency: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
}

export type StripeSecretName = "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET" | "STRIPE_SHIPPING_RATE_ID";

/**
 * A Stripe setting for this request. Platform secrets arrive as Worker bindings,
 * so the binding is read first; process.env is the fallback (nodejs_compat in
 * the Worker, and local `vite dev`, which runs in Node without
 * `cloudflare:workers`). Call it inside the request, never at module top level.
 */
export async function secret(name: StripeSecretName): Promise<string | undefined> {
  try {
    const { bindings } = await import("./bindings.server");
    const value = (bindings() as unknown as Record<string, string | undefined>)[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  } catch {
    // Not in the Worker runtime: fall through to process.env.
  }
  const fromProcess = typeof process === "undefined" ? undefined : process.env?.[name];
  return fromProcess?.trim() || undefined;
}

export async function stripeConfigured() {
  return Boolean(await secret("STRIPE_SECRET_KEY"));
}

export async function stripeRequest<T>(path: string, body?: URLSearchParams): Promise<T | null> {
  const key = await secret("STRIPE_SECRET_KEY");
  if (!key) return null;
  try {
    const response = await fetch(`https://api.stripe.com${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body,
    });
    if (!response.ok) {
      console.error("Stripe request failed", path, response.status, await response.text());
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Stripe request error", path, error);
    return null;
  }
}

export function fetchStripeSession(id: string) {
  return stripeRequest<StripeSession>(`/v1/checkout/sessions/${encodeURIComponent(id)}`);
}

/** Stripe caps each metadata value at 500 characters. */
const METADATA_VALUE_MAX = 500;

/**
 * The compact cart ("variantId:qty,...") as metadata values that each stay
 * under Stripe's 500-character limit, split on entry boundaries: `cart`, then
 * `cart_1`, `cart_2`... The first key keeps its legacy name, so every session
 * this shop creates carries `metadata.cart`.
 */
export function cartToMetadata(entries: string[]): Record<string, string> {
  const chunks: string[] = [];
  let current = "";
  for (const entry of entries) {
    const next = current ? `${current},${entry}` : entry;
    if (next.length > METADATA_VALUE_MAX && current) {
      chunks.push(current);
      current = entry;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return Object.fromEntries(chunks.map((chunk, i) => [i === 0 ? "cart" : `cart_${i}`, chunk]));
}

/** The whole compact cart from a session's metadata (joins `cart`, `cart_1`, ... in order), or null when absent. */
export function cartFromMetadata(metadata: Record<string, string> | null | undefined): string | null {
  if (!metadata?.cart) return null;
  const parts = [metadata.cart];
  for (let i = 1; metadata[`cart_${i}`]; i += 1) parts.push(metadata[`cart_${i}`]);
  return parts.join(",");
}

/** The customer id we stored on the session when it was created (signed-in checkout). */
export function sessionCustomerId(session: StripeSession): number | null {
  const raw = session.metadata?.customer_id ?? session.client_reference_id ?? null;
  if (!raw || !/^\d{1,12}$/.test(raw)) return null;
  return Number(raw);
}

/** The D1 binding, or null (lazy and guarded: `cloudflare:workers` only exists in the Worker runtime). */
async function orderDb() {
  try {
    const { bindings } = await import("./bindings.server");
    return bindings().DB ?? null;
  } catch {
    return null;
  }
}

export interface RecordedOrder {
  name: string | null;
  email: string | null;
  total: number;
  customerId: number | null;
}

/** A paid order already recorded for this session (one D1 query), or null. */
export async function findPaidOrder(sessionId: string): Promise<RecordedOrder | null> {
  const db = await orderDb();
  if (!db) return null;
  try {
    const row = await db
      .prepare(`SELECT name, email, amount_total, customer_id FROM orders WHERE stripe_session_id = ?1 AND status = 'paid'`)
      .bind(sessionId)
      .first<{ name: string | null; email: string | null; amount_total: number; customer_id: number | null }>();
    return row ? { name: row.name, email: row.email, total: row.amount_total, customerId: row.customer_id } : null;
  } catch (error) {
    // Older schema (before 0003) or a transient D1 error: the caller asks Stripe instead.
    console.error("Order lookup failed", error);
    return null;
  }
}

/**
 * Idempotent: the success page and the webhook may both record the same session.
 * Only sessions created by this shop's checkout (they carry `metadata.cart`) are
 * recorded; returns false for anything else on the Stripe account.
 */
export async function recordPaidSession(session: StripeSession): Promise<boolean> {
  const items = cartFromMetadata(session.metadata);
  if (!items) return false;
  const db = await orderDb();
  if (!db) return false;
  const values = [
    session.id,
    session.customer_details?.email ?? null,
    session.customer_details?.name ?? null,
    session.amount_total ?? 0,
    session.currency ?? "zar",
    items,
  ] as const;
  const customerId = sessionCustomerId(session);
  try {
    await db
      .prepare(
        `INSERT INTO orders (stripe_session_id, email, name, amount_total, currency, items, status, customer_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'paid', ?7)
         ON CONFLICT(stripe_session_id) DO UPDATE SET customer_id = COALESCE(orders.customer_id, excluded.customer_id)`,
      )
      .bind(...values, customerId)
      .run();
  } catch (error) {
    // Older schema (before 0003): record the order without the customer link.
    console.error("Order insert with customer failed, retrying without", error);
    await db
      .prepare(
        `INSERT INTO orders (stripe_session_id, email, name, amount_total, currency, items, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'paid')
         ON CONFLICT(stripe_session_id) DO NOTHING`,
      )
      .bind(...values)
      .run();
  }
  return true;
}

const encoder = new TextEncoder();

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k, v.join("=")];
    }),
  );
  const timestamp = parts.t;
  const signatures = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signatures.some((s) => timingSafeEqual(s, expected));
}
