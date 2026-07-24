CREATE UNIQUE INDEX `connection_request_pair_unique` ON `connection_requests` (`requester_id`,`recipient_id`);--> statement-breakpoint
CREATE INDEX `engagement_event_room_idx` ON `engagement_items` (`event_name`,`room_name`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `engagement_vote_attendee_unique` ON `engagement_votes` (`item_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sponsor_event_name_unique` ON `sponsor_booths` (`event_name`,`name`);--> statement-breakpoint
CREATE INDEX `telemetry_event_time_idx` ON `telemetry_events` (`event_name`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `transcript_event_room_time_idx` ON `transcript_segments` (`event_name`,`room_name`,`start_ms`);