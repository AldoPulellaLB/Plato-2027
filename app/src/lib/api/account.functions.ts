// Customer accounts: create, sign in, sign out, and the signed-in account view.
// Errors are deliberately generic (no hint whether an email is registered).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { findVariant } from "../catalog";
import { createAccountSchema as createSchema, signInSchema } from "./account.rules";
import type { AuthField } from "./account.rules";
import {
  THROTTLE_WINDOW_MINUTES,
  burnPasswordCheck,
  clearFailures,
  currentCustomer,
  endSession,
  getDb,
  hashPassword,
  isThrottled,
  normaliseEmail,
  recordFailure,
  requestIp,
  startSession,
  verifyPassword,
} from "../auth.server";

// Transport-level shape only; the shared rules (account.rules.ts) produce field messages.
const looseSignIn = z.object({ email: z.string().max(400), password: z.string().max(1024) });
const looseCreate = z.object({ name: z.string().max(400), email: z.string().max(400), password: z.string().max(1024) });

export type AuthResult =
  | { ok: true; name: string }
  | {
      ok: false;
      code: "invalid" | "credentials" | "throttled" | "exists" | "unavailable" | "error";
      message: string;
      fields?: Partial<Record<AuthField, string>>;
    };

const UNAVAILABLE: AuthResult = {
  ok: false,
  code: "unavailable",
  message: "Accounts aren't switched on yet. You can still shop and check out as a guest.",
};
const SERVER_ERROR: AuthResult = {
  ok: false,
  code: "error",
  message: "Something went wrong on our side. Please try again in a moment.",
};

function fieldErrors(error: z.ZodError): Partial<Record<AuthField, string>> {
  const out: Partial<Record<AuthField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if ((key === "name" || key === "email" || key === "password") && !out[key]) out[key] = issue.message;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Sign in                                                             */
/* ------------------------------------------------------------------ */

export const signIn = createServerFn({ method: "POST" })
  .validator(looseSignIn)
  .handler(async ({ data }): Promise<AuthResult> => {
    const parsed = signInSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, code: "invalid", message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
    }
    const db = await getDb();
    if (!db) return UNAVAILABLE;

    const email = normaliseEmail(parsed.data.email);
    const ip = requestIp();
    try {
      if (await isThrottled(db, email, ip)) {
        return {
          ok: false,
          code: "throttled",
          message: `Too many attempts. For your security, please wait ${THROTTLE_WINDOW_MINUTES} minutes before trying again.`,
        };
      }
      const row = await db
        .prepare(`SELECT id, name, password_hash FROM customers WHERE email = ?1`)
        .bind(email)
        .first<{ id: number; name: string; password_hash: string }>();
      const valid = row ? await verifyPassword(parsed.data.password, row.password_hash) : await burnPasswordCheck(parsed.data.password);
      if (!row || !valid) {
        await recordFailure(db, email, ip);
        return { ok: false, code: "credentials", message: "That email and password don't match. Please try again." };
      }
      await clearFailures(db, email);
      await startSession(db, row.id);
      return { ok: true, name: row.name };
    } catch (error) {
      console.error("Sign in failed", error);
      return SERVER_ERROR;
    }
  });

/* ------------------------------------------------------------------ */
/* Create account                                                      */
/* ------------------------------------------------------------------ */

export const createAccount = createServerFn({ method: "POST" })
  .validator(looseCreate)
  .handler(async ({ data }): Promise<AuthResult> => {
    const parsed = createSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, code: "invalid", message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
    }
    const db = await getDb();
    if (!db) return UNAVAILABLE;

    const email = normaliseEmail(parsed.data.email);
    const name = parsed.data.name.replace(/\s+/g, " ").trim();
    const ip = requestIp();
    try {
      // Account creation shares the sign-in throttle so it cannot be used to probe emails quickly.
      if (await isThrottled(db, email, ip)) {
        return {
          ok: false,
          code: "throttled",
          message: `Too many attempts. For your security, please wait ${THROTTLE_WINDOW_MINUTES} minutes before trying again.`,
        };
      }
      const passwordHash = await hashPassword(parsed.data.password);
      const inserted = await db
        .prepare(
          `INSERT INTO customers (email, name, password_hash) VALUES (?1, ?2, ?3)
           ON CONFLICT(email) DO NOTHING
           RETURNING id`,
        )
        .bind(email, name, passwordHash)
        .first<{ id: number }>();
      if (!inserted) {
        await recordFailure(db, email, ip);
        return {
          ok: false,
          code: "exists",
          message: "We couldn't create an account with those details. If you already have one, sign in instead.",
        };
      }
      await startSession(db, inserted.id);
      return { ok: true, name };
    } catch (error) {
      console.error("Create account failed", error);
      return SERVER_ERROR;
    }
  });

/* ------------------------------------------------------------------ */
/* Sign out                                                            */
/* ------------------------------------------------------------------ */

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const db = await getDb();
  await endSession(db);
  return { ok: true as const };
});

/* ------------------------------------------------------------------ */
/* Account view                                                        */
/* ------------------------------------------------------------------ */

export interface OrderLine {
  quantity: number;
  title: string;
  variant: string | null;
  handle: string | null;
  image: string | null;
}

export interface OrderSummary {
  id: number;
  createdAt: string;
  total: number;
  currency: string;
  status: string;
  lines: OrderLine[];
}

export type AccountData =
  | { status: "unavailable" }
  | { status: "signed-out" }
  | {
      status: "signed-in";
      customer: { name: string; email: string; since: string };
      orders: OrderSummary[];
    };

function parseItems(compact: string): OrderLine[] {
  return compact
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [variantId, qtyRaw] = entry.split(":");
      const quantity = Math.max(1, Number.parseInt(qtyRaw ?? "1", 10) || 1);
      const found = findVariant(variantId);
      if (!found) return { quantity, title: "An item no longer in the shop", variant: null, handle: null, image: null };
      return {
        quantity,
        title: found.product.title,
        variant: found.variant.title === "Default Title" ? null : found.variant.title,
        handle: found.product.handle,
        image: found.product.images[0] ?? null,
      };
    });
}

export const getAccount = createServerFn({ method: "GET" }).handler(async (): Promise<AccountData> => {
  const db = await getDb();
  if (!db) return { status: "unavailable" };
  try {
    const customer = await currentCustomer(db);
    if (!customer) return { status: "signed-out" };
    const { results } = await db
      .prepare(
        `SELECT id, created_at, amount_total, currency, status, items
           FROM orders WHERE customer_id = ?1
          ORDER BY created_at DESC, id DESC LIMIT 50`,
      )
      .bind(customer.id)
      .all<{ id: number; created_at: string; amount_total: number; currency: string; status: string; items: string }>();
    return {
      status: "signed-in",
      customer: { name: customer.name, email: customer.email, since: customer.created_at },
      orders: (results ?? []).map((o) => ({
        id: o.id,
        createdAt: o.created_at,
        total: o.amount_total,
        currency: o.currency,
        status: o.status,
        lines: parseItems(o.items ?? ""),
      })),
    };
  } catch (error) {
    // Tables missing (migrations not applied yet) or a transient D1 error.
    console.error("Account lookup failed", error);
    return { status: "unavailable" };
  }
});

/** Lightweight "who is signed in" for the header profile button. */
export const getSessionSummary = createServerFn({ method: "GET" }).handler(async () => {
  const db = await getDb();
  if (!db) return { signedIn: false as const };
  try {
    const customer = await currentCustomer(db);
    return customer ? { signedIn: true as const, firstName: customer.name.split(" ")[0] } : { signedIn: false as const };
  } catch {
    return { signedIn: false as const };
  }
});
