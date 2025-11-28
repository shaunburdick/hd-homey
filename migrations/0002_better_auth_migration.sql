-- Migration: Better-Auth Schema (Clean Slate)
-- This migration drops the old 'users' table and creates Better-Auth tables
-- BREAKING CHANGE: All existing users will be deleted

-- Drop old users table
DROP TABLE IF EXISTS users;

-- Create Better-Auth user table
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`image` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`deletedAt` integer
);

-- Create unique index on email
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);

-- Create Better-Auth account table
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Create Better-Auth verification table
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);

-- NO session table - using JWT/Stateless sessions
