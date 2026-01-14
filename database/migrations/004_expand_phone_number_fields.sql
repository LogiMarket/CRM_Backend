-- Migration 004: Expand VARCHAR fields for Twilio WhatsApp integration
-- Problem: Twilio sends phone numbers in format "whatsapp:+5215548780484"
-- which exceeds the current limit of 20 characters on phone_number field
-- Date: 2026-01-14

BEGIN;

-- Expand phone_number fields in contacts table
ALTER TABLE contacts
  ALTER COLUMN phone_number TYPE VARCHAR(100);

-- Expand contact name to support longer names
ALTER TABLE contacts
  ALTER COLUMN name TYPE VARCHAR(255);

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);

COMMIT;
