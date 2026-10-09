-- Customer accounts (email + password), sessions and sign-in throttling.
-- Additive only: the database is shared by preview and production.

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Stored trimmed and lower-cased by the app.
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  -- "pbkdf2_sha256$<iterations>$<salt b64>$<hash b64>"
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Only the SHA-256 hash of the session token is stored; the raw token lives in
-- the visitor's HttpOnly cookie.
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_customer_idx ON sessions(customer_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

-- Failed sign-in attempts, used to throttle guessing (per email and per IP).
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS login_attempts_email_idx ON login_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS login_attempts_ip_idx ON login_attempts(ip, created_at);

-- Orders placed while signed in are linked to the customer.
ALTER TABLE orders ADD COLUMN customer_id INTEGER REFERENCES customers(id);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id, created_at);
