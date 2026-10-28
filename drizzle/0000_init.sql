CREATE TABLE `apps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`niche` text,
	`audience` text,
	`itunes_id` integer,
	`icon` text,
	`countries` text DEFAULT (json_array('US')) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `competitors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer NOT NULL,
	`itunes_id` integer NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `competitors_app_id_itunes_id_unique` ON `competitors` (`app_id`,`itunes_id`);--> statement-breakpoint
CREATE TABLE `itunes_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `keywords` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer NOT NULL,
	`term` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `keywords_app_id_term_unique` ON `keywords` (`app_id`,`term`);--> statement-breakpoint
CREATE TABLE `localized_keywords` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keyword_id` integer NOT NULL,
	`country` text NOT NULL,
	`phrase` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`keyword_id`) REFERENCES `keywords`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `localized_keywords_keyword_id_country_unique` ON `localized_keywords` (`keyword_id`,`country`);--> statement-breakpoint
CREATE TABLE `rank_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keyword_id` integer NOT NULL,
	`country` text NOT NULL,
	`term` text NOT NULL,
	`checked_at` integer NOT NULL,
	`result_ids` text NOT NULL,
	`top` text NOT NULL,
	FOREIGN KEY (`keyword_id`) REFERENCES `keywords`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rank_checks_kw_country_time` ON `rank_checks` (`keyword_id`,`country`,`checked_at`);