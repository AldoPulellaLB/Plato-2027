// Server-only customer accounts: password hashing (PBKDF2-SHA256 via WebCrypto),
// opaque session tokens (only their SHA-256 hash is stored), the session cookie,
// and sign-in throttling. Every helper degrades to "no database" instead of
// throwing when the D1 binding is absent (local `vite dev` runs in Node, where
// `cloudflare:workers` does not exist).
import type { D1Database } from "@cloudflare/workers-types";
import { deleteCookie, getCookie, getRequestHeader, setCookie } from "@tanstack/react-start/server";

export const SESSION_COOKIE = "plato_session";
const SESSION_DAYS = 30;
const SESSION_MAX_AGE = 60 * 60 * 24 * SESSION_DAYS;

// Cloudflare Workers cap PBKDF2 at 100,000 iterations; this is that ceiling.
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

/** Throttling: sign-in attempts allowed per window before sign-in is refused. */
export const THROTTLE_WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_EMAIL = 10;
const MAX_FAILURES_PER_IP = 40;
/** Account creation: attempts allowed per IP per hour. */
const CREATION_WINDOW_MINUTES = 60;
const MAX_CREATIONS_PER_IP = 10;

const encoder = new TextEncoder();

/* ------------------------------------------------------------------ */
/* Database                                                            */
/* ------------------------------------------------------------------ */

/** The D1 binding, or null when it is not available (local dev, or not provisioned). */
export async function getDb(): Promise<D1Database | null> {
  try {
    const { bindings } = await import("./bindings.server");
    return bindings().DB ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Encoding helpers                                                    */
/* ------------------------------------------------------------------ */

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function toBase64Url(bytes: Uint8Array) {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* ------------------------------------------------------------------ */
/* Passwords                                                           */
/* ------------------------------------------------------------------ */

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password.normalize("NFKC")), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterationsRaw, saltB64, hashB64] = stored.split("$");
  const iterations = Number(iterationsRaw);
  if (scheme !== "pbkdf2_sha256" || !Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) {
    return false;
  }
  try {
    const expected = fromBase64(hashB64);
    const actual = await derive(password, fromBase64(saltB64), iterations);
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}

// A real hash of a random secret, so unknown emails cost the same time as known ones.
let decoyHash: Promise<string> | null = null;
export function burnPasswordCheck(password: string) {
  decoyHash ??= hashPassword(toBase64Url(crypto.getRandomValues(new Uint8Array(24))));
  return decoyHash.then((h) => verifyPassword(password, h)).then(() => false);
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

async function sha256Hex(value: string) {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export interface CustomerRow {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

/** Creates a session row and sets the HttpOnly cookie. Returns nothing sensitive. */
export async function startSession(db: D1Database, customerId: number) {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(token);
  await db
    .prepare(
      `INSERT INTO sessions (token_hash, customer_id, expires_at)
       VALUES (?1, ?2, datetime('now', '+${SESSION_DAYS} days'))`,
    )
    .bind(tokenHash, customerId)
    .run();
  // Housekeeping: drop this customer's expired sessions.
  await db
    .prepare(`DELETE FROM sessions WHERE customer_id = ?1 AND expires_at <= datetime('now')`)
    .bind(customerId)
    .run();
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

function readSessionToken() {
  const token = getCookie(SESSION_COOKIE);
  if (!token || token.length < 20 || token.length > 120 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  return token;
}

/** The signed-in customer for this request, or null. */
export async function currentCustomer(db: D1Database): Promise<CustomerRow | null> {
  const token = readSessionToken();
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare(
      `SELECT c.id, c.email, c.name, c.created_at
         FROM sessions s JOIN customers c ON c.id = s.customer_id
        WHERE s.token_hash = ?1 AND s.expires_at > datetime('now')`,
    )
    .bind(tokenHash)
    .first<CustomerRow>();
  return row ?? null;
}

/** Same as currentCustomer, but never throws (missing tables, missing binding). */
export async function currentCustomerSafe(): Promise<CustomerRow | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    return await currentCustomer(db);
  } catch (error) {
    console.error("Session lookup failed", error);
    return null;
  }
}

export async function endSession(db: D1Database | null) {
  const token = readSessionToken();
  if (token && db) {
    try {
      await db.prepare(`DELETE FROM sessions WHERE token_hash = ?1`).bind(await sha256Hex(token)).run();
    } catch (error) {
      console.error("Session delete failed", error);
    }
  }
  deleteCookie(SESSION_COOKIE, { path: "/", secure: true, httpOnly: true, sameSite: "lax" });
}

/* ------------------------------------------------------------------ */
/* Throttling                                                          */
/* ------------------------------------------------------------------ */

export function requestIp() {
  const raw = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0];
  return raw ? raw.trim().slice(0, 64) : null;
}

/*
 * Every sign-in and account creation inserts its row in login_attempts BEFORE
 * any password work, then counts the rows up to and including its own (by id).
 * Parallel requests therefore cannot all read a count under the limit: the
 * eleventh row for an email is the eleventh, whatever the timing. A successful
 * sign-in deletes the email's rows; failures simply leave theirs in place.
 */

/** Inserts this attempt and returns its row id. */
export async function recordAttempt(db: D1Database, email: string, ip: string | null): Promise<number> {
  const row = await db
    .prepare(`INSERT INTO login_attempts (email, ip) VALUES (?1, ?2) RETURNING id`)
    .bind(email, ip)
    .first<{ id: number }>();
  if (!row) throw new Error("Attempt was not recorded");
  return row.id;
}

/**
 * True when this sign-in attempt (already recorded) must be refused.
 * The per-IP cap is the main brake. The per-email cap only applies once this
 * IP has itself tried that email before in the window, so a stranger hammering
 * someone's email cannot lock the real customer out from their own network.
 */
export async function signInThrottled(db: D1Database, email: string, ip: string | null, attemptId: number) {
  const counts = await db
    .prepare(
      `SELECT COALESCE(SUM(email = ?1), 0) AS by_email,
              COALESCE(SUM(ip = ?2), 0) AS by_ip,
              COALESCE(SUM(email = ?1 AND ip = ?2 AND id < ?3), 0) AS pair_before
         FROM login_attempts
        WHERE id <= ?3 AND created_at > datetime('now', ?4) AND (email = ?1 OR ip = ?2)`,
    )
    .bind(email, ip, attemptId, `-${THROTTLE_WINDOW_MINUTES} minutes`)
    .first<{ by_email: number; by_ip: number; pair_before: number }>();
  if (!counts) return false;
  if (ip !== null && counts.by_ip > MAX_FAILURES_PER_IP) return true;
  // Without an IP there is no pair to check: the email cap always applies.
  const emailCapApplies = ip === null || counts.pair_before > 0;
  return emailCapApplies && counts.by_email > MAX_FAILURES_PER_EMAIL;
}

/**
 * True when this account creation (already recorded) must be refused: more than
 * MAX_CREATIONS_PER_IP attempts from this IP within the hour. The table has no
 * action column, so every attempt row from the IP counts (sign-in failures too).
 */
export async function creationThrottled(db: D1Database, ip: string | null, attemptId: number) {
  if (ip === null) return false;
  const counts = await db
    .prepare(`SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ?1 AND id <= ?2 AND created_at > datetime('now', ?3)`)
    .bind(ip, attemptId, `-${CREATION_WINDOW_MINUTES} minutes`)
    .first<{ n: number }>();
  return (counts?.n ?? 0) > MAX_CREATIONS_PER_IP;
}

export type SignInOutcome = { ok: true; id: number; name: string } | { ok: false; reason: "throttled" | "credentials" };

/**
 * The password check behind sign-in (everything but the session cookie):
 * record the attempt, apply the throttle, verify, then tidy the attempt rows.
 */
export async function checkSignIn(db: D1Database, email: string, password: string, ip: string | null): Promise<SignInOutcome> {
  const attemptId = await recordAttempt(db, email, ip);
  if (await signInThrottled(db, email, ip, attemptId)) return { ok: false, reason: "throttled" };
  const row = await db
    .prepare(`SELECT id, name, password_hash FROM customers WHERE email = ?1`)
    .bind(email)
    .first<{ id: number; name: string; password_hash: string }>();
  const valid = row ? await verifyPassword(password, row.password_hash) : await burnPasswordCheck(password);
  if (!row || !valid) {
    // The attempt row stays as the failure record.
    await pruneAttempts(db);
    return { ok: false, reason: "credentials" };
  }
  await clearFailures(db, email, attemptId);
  return { ok: true, id: row.id, name: row.name };
}

/** Housekeeping: anything older than a day no longer matters. */
export async function pruneAttempts(db: D1Database) {
  await db.prepare(`DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 day')`).run();
}

/** After a successful sign-in: drops this attempt and the email's earlier failures. */
export async function clearFailures(db: D1Database, email: string, attemptId: number) {
  await db.prepare(`DELETE FROM login_attempts WHERE id = ?2 OR email = ?1`).bind(email, attemptId).run();
}

export function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}
