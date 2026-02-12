-- 005_add_message_media_support.sql
-- Adds support for WhatsApp media messages (image/document/audio/video/sticker)

BEGIN;

-- Add columns for media metadata
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_id VARCHAR(255);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_mime_type VARCHAR(100);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_sha256 VARCHAR(128);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_filename VARCHAR(255);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_caption TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Ensure message_type supports 'sticker' (works for both varchar+CHECK and enum)
DO $$
DECLARE
  msg_type_udt TEXT;
  is_enum BOOLEAN;
  enum_type_name TEXT;
  c RECORD;
BEGIN
  SELECT c.udt_name
  INTO msg_type_udt
  FROM information_schema.columns c
  WHERE c.table_name = 'messages' AND c.column_name = 'message_type'
  LIMIT 1;

  SELECT EXISTS(
    SELECT 1
    FROM pg_type t
    WHERE t.typname = msg_type_udt
      AND t.typtype = 'e'
  )
  INTO is_enum;

  IF is_enum THEN
    enum_type_name := msg_type_udt;
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', enum_type_name, 'sticker');
  ELSE
    -- Drop existing CHECK constraints that reference message_type, then add a new one.
    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'messages'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%message_type%'
    LOOP
      EXECUTE format('ALTER TABLE messages DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;

    ALTER TABLE messages
      ADD CONSTRAINT messages_message_type_check
      CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'sticker'));
  END IF;
END $$;

COMMIT;
