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

/** Throttling: failed attempts allowed per window before sign-in is refused. */
export const THROTTLE_WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_EMAIL = 10;
const MAX_FAILURES_PER_IP = 40;

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

/** True when this email or IP has failed too often within the window. */
export async function isThrottled(db: D1Database, email: string, ip: string | null) {
  const span = `-${THROTTLE_WINDOW_MINUTES} minutes`;
  const byEmail = await db
    .prepare(`SELECT COUNT(*) AS n FROM login_attempts WHERE email = ?1 AND created_at > datetime('now', ?2)`)
    .bind(email, span)
    .first<{ n: number }>();
  if ((byEmail?.n ?? 0) >= MAX_FAILURES_PER_EMAIL) return true;
  if (!ip) return false;
  const byIp = await db
    .prepare(`SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ?1 AND created_at > datetime('now', ?2)`)
    .bind(ip, span)
    .first<{ n: number }>();
  return (byIp?.n ?? 0) >= MAX_FAILURES_PER_IP;
}

export async function recordFailure(db: D1Database, email: string, ip: string | null) {
  await db.prepare(`INSERT INTO login_attempts (email, ip) VALUES (?1, ?2)`).bind(email, ip).run();
  // Keep the table small: anything older than a day no longer matters.
  await db.prepare(`DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 day')`).run();
}

export async function clearFailures(db: D1Database, email: string) {
  await db.prepare(`DELETE FROM login_attempts WHERE email = ?1`).bind(email).run();
}

export function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}
