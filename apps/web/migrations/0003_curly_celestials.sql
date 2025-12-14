CREATE TABLE `device_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text(6) NOT NULL,
	`device_name` text(100) NOT NULL,
	`device_type` text(20) NOT NULL,
	`status` text(20) DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`expires_at` integer NOT NULL,
	`authorized_at` integer,
	`authorized_by` text,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`authorized_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `device_codes_code_unique` ON `device_codes` (`code`);--> statement-breakpoint
CREATE INDEX `idx_device_codes_code` ON `device_codes` (`code`);--> statement-breakpoint
CREATE INDEX `idx_device_codes_status` ON `device_codes` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_device_codes_authorized_by` ON `device_codes` (`authorized_by`);