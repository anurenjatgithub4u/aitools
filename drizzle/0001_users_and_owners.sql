CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`name` text,
	`photo` text,
	`plan` text DEFAULT 'free' NOT NULL,
	`projects_created` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `owner_id` text DEFAULT 'local' NOT NULL;--> statement-breakpoint
CREATE INDEX `apps_owner` ON `apps` (`owner_id`);