-- Migration: Add settings table for application configuration
CREATE TABLE `settings` (
	`key` text(255) PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`modified_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
-- Generate and insert initial stream secret
INSERT INTO `settings` (`key`, `value`) VALUES ('stream_secret', lower(hex(randomblob(32))));
