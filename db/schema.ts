import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
