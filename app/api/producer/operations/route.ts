import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, incidents, runOfShowItems } from "../../../../db/schema";
import { authorizeProducerRequest } from "../../../producer-auth";

const EVENT_NAME = "Global Innovation Summit 2026";
// The default program makes a fresh event database immediately usable. Once
// seeded, D1 becomes the authoritative source for status and ordering.
const DEFAULT_RUN_OF_SHOW = [
  { scheduledTime: "11:00", title: "Opening film", owner: "Playback", status: "done" },
  { scheduledTime: "11:03", title: "Welcome & context", owner: "Maya Chen", status: "done" },
  { scheduledTime: "11:12", title: "Building trust in an AI-first world", owner: "Elias + Sofia", status: "live" },
  { scheduledTime: "11:32", title: "Audience pulse", owner: "Cris", status: "next" },
  { scheduledTime: "11:35", title: "Transition to Studio One", owner: "All producers", status: "queued" },
];

async function ensureRunOfShow(actorEmail: string) {
  const db = getDb();
  const existing = await db.select().from(runOfShowItems)
    .where(eq(runOfShowItems.eventName, EVENT_NAME)).limit(1);
  // Idempotent initialization avoids duplicate schedules across cold starts.
  if (existing.length) return;
  await db.insert(runOfShowItems).values(DEFAULT_RUN_OF_SHOW.map((item, position) => ({
    eventName: EVENT_NAME,
    position,
    ...item,
    updatedBy: actorEmail,
  })));
}

export async function GET(request: Request) {
  const auth = await authorizeProducerRequest(request);
  if ("error" in auth) return auth.error;
  try {
    await ensureRunOfShow(auth.user.email);
    const db = getDb();
    // These independent reads run concurrently to keep command-center refreshes
    // fast even when the D1 database is in a distant region.
    const [runOfShow, activity, incidentLog] = await Promise.all([
      db.select().from(runOfShowItems)
        .where(eq(runOfShowItems.eventName, EVENT_NAME))
        .orderBy(asc(runOfShowItems.position)),
      db.select().from(auditEvents)
        .where(eq(auditEvents.eventName, EVENT_NAME))
        .orderBy(desc(auditEvents.id)).limit(20),
      db.select().from(incidents)
        .where(eq(incidents.eventName, EVENT_NAME))
        .orderBy(desc(incidents.id)).limit(20),
    ]);
    return Response.json({ runOfShow, activity, incidents: incidentLog }, {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json({ mode: "demo", message: "Persistent operations are unavailable." }, { status: 503 });
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
    return Response.json({ error: "Unsupported operation." }, { status: 400 });
  } catch {
    return Response.json({ error: "The operational record could not be updated." }, { status: 503 });
  }
}
