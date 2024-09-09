CREATE TABLE `channels` (
	`id` integer DEFAULT true,
	`fk_tuner` integer NOT NULL,
	`guideNumber` text NOT NULL,
	`guideName` text NOT NULL,
	`videoCodec` text NOT NULL,
	`audioCodec` text NOT NULL,
	`hd` integer NOT NULL,
	`url` text NOT NULL,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP),
	`modified_at` integer DEFAULT (CURRENT_TIMESTAMP),
	`deleted_at` integer,
	FOREIGN KEY (`fk_tuner`) REFERENCES `tuners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tuners` (
	`id` integer DEFAULT true,
	`name` text(255) NOT NULL,
	`path` text NOT NULL,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP),
	`modified_at` integer DEFAULT (CURRENT_TIMESTAMP),
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer DEFAULT true,
	`username` text(255) NOT NULL,
	`name` text(255) NOT NULL,
	`passHash` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP),
	`modified_at` integer DEFAULT (CURRENT_TIMESTAMP),
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `tuner` ON `channels` (`fk_tuner`);