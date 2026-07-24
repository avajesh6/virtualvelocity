CREATE TABLE `support_tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`requester_id` text NOT NULL,
	`requester_name` text NOT NULL,
	`requester_email` text NOT NULL,
	`room_name` text NOT NULL,
	`issue` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`assigned_to` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
