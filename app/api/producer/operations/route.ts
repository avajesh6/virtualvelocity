import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, incidents, runOfShowItems, supportTickets } from "../../../../db/schema";
import { authorizeProducerRequest } from "../../../producer-auth";
import { EVENT_NAME } from "../../../venue-config";

export async function GET(request: Request) {
  const auth = await authorizeProducerRequest(request);
  if ("error" in auth) return auth.error;
  try {
    const db = getDb();
    // These independent reads run concurrently to keep command-center refreshes
    // fast even when the D1 database is in a distant region.
    const [runOfShow, activity, incidentLog, tickets] = await Promise.all([
      db.select().from(runOfShowItems)
        .where(eq(runOfShowItems.eventName, EVENT_NAME))
        .orderBy(asc(runOfShowItems.position)),
      db.select().from(auditEvents)
        .where(eq(auditEvents.eventName, EVENT_NAME))
        .orderBy(desc(auditEvents.id)).limit(20),
      db.select().from(incidents)
        .where(eq(incidents.eventName, EVENT_NAME))
        .orderBy(desc(incidents.id)).limit(20),
      db.select().from(supportTickets)
        .where(eq(supportTickets.eventName, EVENT_NAME))
        .orderBy(desc(supportTickets.id)).limit(50),
    ]);
    return Response.json({ runOfShow, activity, incidents: incidentLog, supportTickets: tickets }, {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Persistent operations are unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeProducerRequest(request);
  if ("error" in auth) return auth.error;
  const body = await request.json() as {
    action?: string;
    itemId?: number;
    status?: string;
    message?: string;
    target?: string;
    scheduledTime?: string;
    title?: string;
    owner?: string;
    room?: string;
    ticketId?: number;
  };
  try {
    const db = getDb();
    if (body.action === "set-run-status" && Number.isInteger(body.itemId) && body.status) {
      const allowed = new Set(["done", "live", "next", "queued"]);
      if (!allowed.has(body.status)) return Response.json({ error: "Invalid status." }, { status: 400 });
      const selected = await db.select().from(runOfShowItems).where(and(
        eq(runOfShowItems.id, body.itemId!),
        eq(runOfShowItems.eventName, EVENT_NAME),
      )).limit(1);
      if (!selected.length) return Response.json({ error: "Run-of-show item not found." }, { status: 404 });
      const items = await db.select().from(runOfShowItems)
        .where(eq(runOfShowItems.eventName, EVENT_NAME));
      const updatedAt = new Date().toISOString();
      // Advancing one item recalculates the surrounding timeline so there is a
      // single live item and, at most, one next item after every update.
      await Promise.all(items.map((item) => db.update(runOfShowItems).set({
        status: item.position < selected[0].position
          ? "done"
          : item.position === selected[0].position
            ? body.status!
            : item.position === selected[0].position + 1
              ? "next"
              : "queued",
        updatedBy: auth.user.email,
        updatedAt,
      }).where(eq(runOfShowItems.id, item.id))));
      await db.insert(auditEvents).values({
        // The audit event records intent separately from mutable schedule rows.
        eventName: EVENT_NAME,
        actorEmail: auth.user.email,
        action: "run-of-show.updated",
        target: String(body.itemId),
        detail: body.status,
      });
      return Response.json({ ok: true });
    }
    if (body.action === "record-event" && body.message?.trim()) {
      await db.insert(auditEvents).values({
        eventName: EVENT_NAME,
        actorEmail: auth.user.email,
        action: "producer.note",
        target: body.target?.trim() || "",
        detail: body.message.trim(),
      });
      return Response.json({ ok: true }, { status: 201 });
    }
    if (body.action === "add-run-item") {
      const scheduledTime = body.scheduledTime?.trim() ?? "";
      const title = body.title?.trim() ?? "";
      const owner = body.owner?.trim() ?? "";
      if (!/^\d{2}:\d{2}$/.test(scheduledTime) || !title || !owner) {
        return Response.json({ error: "Time, title, and owner are required." }, { status: 400 });
      }
      const existing = await db.select().from(runOfShowItems)
        .where(eq(runOfShowItems.eventName, EVENT_NAME));
      const created = await db.insert(runOfShowItems).values({
        eventName: EVENT_NAME,
        position: existing.length,
        scheduledTime,
        title,
        owner,
        status: existing.length === 0 ? "next" : "queued",
        updatedBy: auth.user.email,
      }).returning();
      await db.insert(auditEvents).values({
        eventName: EVENT_NAME,
        actorEmail: auth.user.email,
        action: "run-of-show.created",
        target: String(created[0].id),
        detail: title,
      });
      return Response.json({ item: created[0] }, { status: 201 });
    }
    if (body.action === "announce" && body.message?.trim()) {
      const message = body.message.trim();
      if (message.length > 500) return Response.json({ error: "Announcement is too long." }, { status: 400 });
      await db.insert(auditEvents).values({
        eventName: EVENT_NAME,
        actorEmail: auth.user.email,
        action: "producer.announcement",
        target: "all-attendees",
        detail: message,
      });
      return Response.json({ ok: true }, { status: 201 });
    }
    if (
      body.action === "update-support"
      && Number.isInteger(body.ticketId)
      && (body.status === "open" || body.status === "in_progress" || body.status === "resolved")
    ) {
      const ticket = await db.select().from(supportTickets)
        .where(and(eq(supportTickets.id, body.ticketId!), eq(supportTickets.eventName, EVENT_NAME)))
        .limit(1);
      if (!ticket.length) return Response.json({ error: "Support ticket not found." }, { status: 404 });
      await db.update(supportTickets).set({
        status: body.status,
        assignedTo: body.status === "open" ? "" : auth.user.email,
        updatedAt: new Date().toISOString(),
      }).where(eq(supportTickets.id, body.ticketId!));
      await db.insert(auditEvents).values({
        eventName: EVENT_NAME,
        actorEmail: auth.user.email,
        action: `support.${body.status}`,
        target: String(body.ticketId),
        detail: ticket[0].issue,
      });
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unsupported operation." }, { status: 400 });
  } catch {
    return Response.json({ error: "The operational record could not be updated." }, { status: 503 });
  }
}
