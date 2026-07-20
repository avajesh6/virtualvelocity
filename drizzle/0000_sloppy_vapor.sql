CREATE TABLE `incidents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`room_name` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`attendees_affected` integer DEFAULT 0 NOT NULL,
	`recovery_seconds` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`event_name` text NOT NULL,
	`booth_name` text NOT NULL,
	`interest` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
