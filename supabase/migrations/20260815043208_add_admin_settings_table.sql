/*
# Admin password gate

## Plain-English summary
Adds a secure server-side password gate for the admin panel. The admin password
hash is stored in a new `admin_settings` table and verified by an edge function
using bcrypt. This prevents anyone from reaching the admin dashboard without
the superuser password, even if they have an admin-role account.

## New tables
- `admin_settings` — single-row table holding the admin password hash.
  - `id` (int, primary key, always 1 — singleton row)
  - `password_hash` (text, not null) — bcrypt hash of the admin password
  - `updated_at` (timestamptz, auto-updated)

## Security
- RLS enabled on `admin_settings`.
- No SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated roles —
  the table is only accessible via the service role key (used by the edge
  function). This ensures the password hash is never exposed to the frontend.
- Default password is "Admin@2318" (bcrypt-hashed), which the superuser should
  change after first login.

## Notes
1. The edge function `admin-verify` reads the hash using the service role key
   and compares it against the submitted password using bcrypt.
2. The frontend never sees the hash — it only receives a boolean success/fail.
3. The singleton row is seeded with id=1 and the default password hash.
*/

CREATE TABLE IF NOT EXISTS admin_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Seed the default password hash for "Admin@2318"
-- bcrypt hash generated with cost factor 10
INSERT INTO admin_settings (id, password_hash)
VALUES (1, '$2a$10$GPjkYsiYI39.biaYxIX1Nuq9b10hJHp0LhpMq2iTsdrUyEY2fdZlm')
ON CONFLICT (id) DO NOTHING;
