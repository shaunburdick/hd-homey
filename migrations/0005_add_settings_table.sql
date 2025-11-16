-- Migration: Add settings table for application configuration
-- Created: 2025-11-16

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    modified_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Generate and insert initial stream secret
INSERT INTO settings (key, value) VALUES ('stream_secret', lower(hex(randomblob(32))));
