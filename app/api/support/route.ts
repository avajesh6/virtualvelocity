import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, supportTickets } from "../../../db/schema";
import { authenticateRequest } from "../../producer-auth";
import { EVENT_NAME, isVenueRoomName } from "../../venue-config";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  try {
    const tickets = await getDb()
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.requesterId, auth.authUser.id))
      .orderBy(desc(supportTickets.id));
    return Response.json({ tickets }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Support requests are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;

  let body: { issue?: string; room?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "A valid JSON body is required." }, { status: 400 });
  }
  const issue = body.issue?.trim() ?? "";
  if (issue.length < 5 || issue.length > 500 || !isVenueRoomName(body.room)) {
    return Response.json({ error: "Choose a room and describe the issue in 5–500 characters." }, { status: 400 });
  }

  try {
    const db = getDb();
    const created = await db.insert(supportTickets).values({
      eventName: EVENT_NAME,
      requesterId: auth.authUser.id,
      requesterName: auth.user.displayName,
      requesterEmail: auth.user.email,
      roomName: body.room,
      issue,
    }).returning();
    await db.insert(auditEvents).values({
      eventName: EVENT_NAME,
      actorEmail: auth.user.email,
      action: "support.created",
      target: String(created[0].id),
      detail: issue,
    });
    return Response.json({ ticket: created[0] }, { status: 201 });
  } catch {
    return Response.json({ error: "The support request could not be created." }, { status: 503 });
  }
}
