CREATE TABLE `user_channel_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`channel_id` integer NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`is_hidden` integer DEFAULT false NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade,
	CHECK (NOT (`is_favorite` = 1 AND `is_hidden` = 1))
);
--> statement-breakpoint
CREATE INDEX `idx_user_channel_prefs_user` ON `user_channel_preferences` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_channel_prefs_user_channel` ON `user_channel_preferences` (`user_id`,`channel_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_channel_preferences_user_id_channel_id_unique` ON `user_channel_preferences` (`user_id`,`channel_id`);