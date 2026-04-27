-- ═══════════════════════════════════════════════
-- Instagram Chat Clone - Full Database Setup
-- Run this ONCE in Supabase SQL Editor
-- ═══════════════════════════════════════════════

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

-- ── 4. ROW LEVEL SECURITY (disable for now) ────
-- We rely on the service_role key in API routes for writes
-- and the anon key for reads (no sensitive data exposed)

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE reactions DISABLE ROW LEVEL SECURITY;

-- ── Done! ───────────────────────────────────────
SELECT 'Database setup complete! All tables created.' AS status;
