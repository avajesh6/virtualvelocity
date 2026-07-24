import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Attendee intent captured at expo booths. Keep provider-specific CRM fields
// out of the core schema so the same record can feed multiple adapters.
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull().default(""),
  eventName: text("event_name").notNull(),
  boothName: text("booth_name").notNull(),
  interest: text("interest").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Incidents describe service-impacting events and their recovery outcome.
export const incidents = sqliteTable("incidents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  roomName: text("room_name").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("open"),
  attendeesAffected: integer("attendees_affected").notNull().default(0),
  recoverySeconds: integer("recovery_seconds"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Append-only operational history. Mutable state belongs in its domain table;
// this record answers who performed an action, what changed, and when.
export const auditEvents = sqliteTable("audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  target: text("target").notNull().default(""),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Producer-controlled timeline. Position is event-relative and status is one of
// done/live/next/queued as enforced by the operations route.
export const runOfShowItems = sqliteTable("run_of_show_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  position: integer("position").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  title: text("title").notNull(),
  owner: text("owner").notNull(),
  status: text("status").notNull().default("queued"),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Attendees create support requests from the live venue. Producers update the
// lifecycle in the command center; no fabricated tickets are used in Live mode.
export const supportTickets = sqliteTable("support_tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  requesterId: text("requester_id").notNull(),
  requesterName: text("requester_name").notNull(),
  requesterEmail: text("requester_email").notNull(),
  roomName: text("room_name").notNull(),
  issue: text("issue").notNull(),
  status: text("status").notNull().default("open"),
  assignedTo: text("assigned_to").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// A signed-in attendee controls whether their profile can appear in networking
// suggestions. Interests are JSON so the matching algorithm can evolve without
// leaking provider-specific profile fields into the core event model.
export const attendeeProfiles = sqliteTable("attendee_profiles", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  company: text("company").notNull().default(""),
  jobTitle: text("job_title").notNull().default(""),
  interests: text("interests").notNull().default("[]"),
  discoverable: integer("discoverable", { mode: "boolean" }).notNull().default(false),
  captionLanguage: text("caption_language").notNull().default("en"),
  reducedData: integer("reduced_data", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Polls and questions share a lifecycle and room scope. Poll choices are stored
// as JSON; questions leave optionsJson empty and use engagementVotes for rank.
export const engagementItems = sqliteTable("engagement_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  roomName: text("room_name").notNull(),
  kind: text("kind").notNull(),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  prompt: text("prompt").notNull(),
  optionsJson: text("options_json").notNull().default("[]"),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("engagement_event_room_idx").on(table.eventName, table.roomName, table.status),
]);

// One row per attendee and poll/question keeps voting idempotent. Reactions use
// a synthetic item id of zero and store the reaction name as the response.
export const engagementVotes = sqliteTable("engagement_votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull(),
  userId: text("user_id").notNull(),
  response: text("response").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("engagement_vote_attendee_unique").on(table.itemId, table.userId),
]);

export const connectionRequests = sqliteTable("connection_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  requesterId: text("requester_id").notNull(),
  requesterName: text("requester_name").notNull(),
  recipientId: text("recipient_id").notNull(),
  recipientName: text("recipient_name").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("connection_request_pair_unique").on(table.requesterId, table.recipientId),
]);

// Consent is recorded with every sponsor interaction so downstream CRM exports
// can exclude attendees who did not explicitly opt in.
export const sponsorInteractions = sqliteTable("sponsor_interactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  boothName: text("booth_name").notNull(),
  userId: text("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  action: text("action").notNull(),
  consent: integer("consent", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sponsorBooths = sqliteTable("sponsor_booths", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  resourceUrl: text("resource_url").notNull().default(""),
  status: text("status").notNull().default("published"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("sponsor_event_name_unique").on(table.eventName, table.name),
]);

// LiveKit webhooks are the durable source for historical room traffic. The
// external event id makes retries safe; payloadJson retains forward-compatible
// details while the commonly queried dimensions remain first-class columns.
export const telemetryEvents = sqliteTable("telemetry_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalId: text("external_id").notNull().unique(),
  eventName: text("event_name").notNull(),
  roomName: text("room_name").notNull().default(""),
  eventType: text("event_type").notNull(),
  participantId: text("participant_id").notNull().default(""),
  participantName: text("participant_name").notNull().default(""),
  payloadJson: text("payload_json").notNull().default("{}"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("telemetry_event_time_idx").on(table.eventName, table.occurredAt),
]);

export const recordingJobs = sqliteTable("recording_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  egressId: text("egress_id").notNull().unique(),
  eventName: text("event_name").notNull(),
  roomName: text("room_name").notNull(),
  status: text("status").notNull(),
  playbackUrl: text("playback_url").notNull().default(""),
  startedBy: text("started_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Transcript segments may arrive from a LiveKit transcription agent or an
// approved producer import. Only finalized segments are persisted.
export const transcriptSegments = sqliteTable("transcript_segments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  roomName: text("room_name").notNull(),
  speakerName: text("speaker_name").notNull().default(""),
  language: text("language").notNull().default("en"),
  text: text("text").notNull(),
  startMs: integer("start_ms").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("transcript_event_room_time_idx").on(table.eventName, table.roomName, table.startMs),
]);

// Replay assets can point to LiveKit/S3/R2/CDN URLs. The application stores
// searchable metadata and never proxies large media through D1.
export const contentAssets = sqliteTable("content_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  roomName: text("room_name").notNull(),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("replay"),
  url: text("url").notNull().default(""),
  summary: text("summary").notNull().default(""),
  chaptersJson: text("chapters_json").notNull().default("[]"),
  status: text("status").notNull().default("processing"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
