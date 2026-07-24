CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`target` text DEFAULT '' NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `run_of_show_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`position` integer NOT NULL,
	`scheduled_time` text NOT NULL,
	`title` text NOT NULL,
	`owner` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
