// Server-only Stripe helpers: REST calls, webhook signature check, order recording.

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

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function stripeRequest<T>(path: string, body?: URLSearchParams): Promise<T | null> {
  const key = process.env.STRIPE_SECRET_KEY;
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

/** The customer id we stored on the session when it was created (signed-in checkout). */
function sessionCustomerId(session: StripeSession): number | null {
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

// Idempotent: the success page and the webhook may both record the same session.
export async function recordPaidSession(session: StripeSession) {
  const db = await orderDb();
  if (!db) return;
  const values = [
    session.id,
    session.customer_details?.email ?? null,
    session.customer_details?.name ?? null,
    session.amount_total ?? 0,
    session.currency ?? "zar",
    session.metadata?.cart ?? "",
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
