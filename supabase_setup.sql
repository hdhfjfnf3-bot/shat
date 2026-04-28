-- ═══════════════════════════════════════════════
-- Instagram Chat Clone - Full Database Setup
-- Run this ONCE in Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- ── 0. EXTENSIONS ───────────────────────────────
-- pgcrypto: needed for password hashing (bcrypt via crypt/gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. TABLES ──────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  username    VARCHAR(50) PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  key         VARCHAR(150) PRIMARY KEY,
  user_a      VARCHAR(50) NOT NULL REFERENCES users(username),
  user_b      VARCHAR(50) NOT NULL REFERENCES users(username),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id              VARCHAR(50) PRIMARY KEY,
  room_key        VARCHAR(150) NOT NULL REFERENCES rooms(key) ON DELETE CASCADE,
  sender_username VARCHAR(50) NOT NULL REFERENCES users(username),
  type            VARCHAR(20) NOT NULL DEFAULT 'text',
  content         TEXT NOT NULL DEFAULT '',
  reply_to_id     VARCHAR(50),
  voice_meta      JSONB,
  is_unsent       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS reactions (
  id          SERIAL PRIMARY KEY,
  message_id  VARCHAR(50) NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     VARCHAR(50) NOT NULL REFERENCES users(username),
  emoji       VARCHAR(20) NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(message_id, user_id)
);

-- ── 2. INDEXES (for performance) ───────────────

CREATE INDEX IF NOT EXISTS idx_rooms_user_a ON rooms(user_a);
CREATE INDEX IF NOT EXISTS idx_rooms_user_b ON rooms(user_b);
CREATE INDEX IF NOT EXISTS idx_messages_room_key ON messages(room_key);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON reactions(message_id);

-- ── 3. ENABLE REALTIME ─────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
  END IF;
END $$;

-- ── 4. ROW LEVEL SECURITY / POLICIES ────────────
-- This app currently writes to Supabase directly from the client for
-- chat rooms/messages/reactions, and uses custom auth instead of Supabase Auth.
-- Because of that, production must either disable RLS for these tables OR
-- provide permissive policies. We do both here defensively so existing
-- projects that have RLS enabled stop failing with 42501 errors.

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public rooms read" ON rooms;
DROP POLICY IF EXISTS "public rooms insert" ON rooms;
DROP POLICY IF EXISTS "public rooms update" ON rooms;
DROP POLICY IF EXISTS "public rooms delete" ON rooms;

DROP POLICY IF EXISTS "public messages read" ON messages;
DROP POLICY IF EXISTS "public messages insert" ON messages;
DROP POLICY IF EXISTS "public messages update" ON messages;
DROP POLICY IF EXISTS "public messages delete" ON messages;

DROP POLICY IF EXISTS "public reactions read" ON reactions;
DROP POLICY IF EXISTS "public reactions insert" ON reactions;
DROP POLICY IF EXISTS "public reactions update" ON reactions;
DROP POLICY IF EXISTS "public reactions delete" ON reactions;

CREATE POLICY "public rooms read"
ON rooms FOR SELECT
USING (true);

CREATE POLICY "public rooms insert"
ON rooms FOR INSERT
WITH CHECK (true);

CREATE POLICY "public rooms update"
ON rooms FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "public rooms delete"
ON rooms FOR DELETE
USING (true);

CREATE POLICY "public messages read"
ON messages FOR SELECT
USING (true);

CREATE POLICY "public messages insert"
ON messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "public messages update"
ON messages FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "public messages delete"
ON messages FOR DELETE
USING (true);

CREATE POLICY "public reactions read"
ON reactions FOR SELECT
USING (true);

CREATE POLICY "public reactions insert"
ON reactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "public reactions update"
ON reactions FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "public reactions delete"
ON reactions FOR DELETE
USING (true);

-- ── 5. AUTH RPC FUNCTIONS ───────────────────────
-- All run as SECURITY DEFINER so the anon key can call them safely.
-- The actual password_hash never leaves the DB.

-- 5a. register_user(p_username, p_password)
--     Returns: { "username": "..." }  on success
--              { "error": "..." }     on failure
CREATE OR REPLACE FUNCTION register_user(p_username TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized TEXT;
  v_hash       TEXT;
BEGIN
  v_normalized := lower(trim(regexp_replace(p_username, '^@', '')));

  IF length(v_normalized) < 2 THEN
    RETURN jsonb_build_object('error', 'اسم المستخدم قصير جداً.');
  END IF;

  IF v_normalized !~ '^[a-z0-9._]+$' THEN
    RETURN jsonb_build_object('error', 'اسم المستخدم يجب أن يحتوي على حروف إنجليزية وأرقام فقط.');
  END IF;

  IF length(p_password) < 6 THEN
    RETURN jsonb_build_object('error', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE username = v_normalized) THEN
    RETURN jsonb_build_object('error', 'اسم المستخدم مستخدم بالفعل.');
  END IF;

  -- bcrypt hash with cost factor 10
  v_hash := crypt(p_password, gen_salt('bf', 10));

  INSERT INTO users (username, password_hash)
  VALUES (v_normalized, v_hash);

  RETURN jsonb_build_object('username', v_normalized);
END;
$$;

-- 5b. login_user(p_username, p_password)
--     Returns: { "username": "..." }  on success
--              { "error": "..." }     on failure
CREATE OR REPLACE FUNCTION login_user(p_username TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized TEXT;
  v_hash       TEXT;
BEGIN
  v_normalized := lower(trim(regexp_replace(p_username, '^@', '')));

  SELECT password_hash INTO v_hash
  FROM users
  WHERE username = v_normalized;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'اسم المستخدم أو كلمة المرور غير صحيحة.');
  END IF;

  IF v_hash = crypt(p_password, v_hash) THEN
    RETURN jsonb_build_object('username', v_normalized);
  ELSE
    RETURN jsonb_build_object('error', 'اسم المستخدم أو كلمة المرور غير صحيحة.');
  END IF;
END;
$$;

-- 5c. check_user_exists(p_username)
--     Returns: { "exists": true/false, "username": "..." | null }
CREATE OR REPLACE FUNCTION check_user_exists(p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized TEXT;
  v_exists     BOOLEAN;
BEGIN
  v_normalized := lower(trim(regexp_replace(p_username, '^@', '')));
  SELECT EXISTS(SELECT 1 FROM users WHERE username = v_normalized) INTO v_exists;
  RETURN jsonb_build_object(
    'exists',   v_exists,
    'username', CASE WHEN v_exists THEN v_normalized ELSE NULL END
  );
END;
$$;

-- ── Done! ───────────────────────────────────────
SELECT 'Database setup complete! All tables and RPC functions created.' AS status;
