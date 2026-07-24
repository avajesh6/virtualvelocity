CREATE TABLE `attendee_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`interests` text DEFAULT '[]' NOT NULL,
	`discoverable` integer DEFAULT false NOT NULL,
	`caption_language` text DEFAULT 'en' NOT NULL,
	`reduced_data` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connection_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`requester_id` text NOT NULL,
	`requester_name` text NOT NULL,
	`recipient_id` text NOT NULL,
	`recipient_name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`room_name` text NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'replay' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`chapters_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `engagement_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`room_name` text NOT NULL,
	`kind` text NOT NULL,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`prompt` text NOT NULL,
	`options_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `engagement_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`response` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recording_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`egress_id` text NOT NULL,
	`event_name` text NOT NULL,
	`room_name` text NOT NULL,
	`status` text NOT NULL,
	`playback_url` text DEFAULT '' NOT NULL,
	`started_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recording_jobs_egress_id_unique` ON `recording_jobs` (`egress_id`);--> statement-breakpoint
CREATE TABLE `sponsor_booths` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`resource_url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sponsor_interactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`booth_name` text NOT NULL,
	`user_id` text NOT NULL,
	`user_email` text NOT NULL,
	`action` text NOT NULL,
	`consent` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `telemetry_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text NOT NULL,
	`event_name` text NOT NULL,
	`room_name` text DEFAULT '' NOT NULL,
	`event_type` text NOT NULL,
	`participant_id` text DEFAULT '' NOT NULL,
	`participant_name` text DEFAULT '' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telemetry_events_external_id_unique` ON `telemetry_events` (`external_id`);--> statement-breakpoint
CREATE TABLE `transcript_segments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`room_name` text NOT NULL,
	`speaker_name` text DEFAULT '' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`text` text NOT NULL,
	`start_ms` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
