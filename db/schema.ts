import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
