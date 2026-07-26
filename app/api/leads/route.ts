import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { leads } from "../../../db/schema";
import { dispatchCrmLead } from "../../integrations";
import { authenticateRequest } from "../../producer-auth";
import { EVENT_NAME } from "../../venue-config";

type LeadPayload = {
  name?: string;
  email?: string;
  company?: string;
  event?: string;
  booth?: string;
  interest?: string;
};

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  let payload: LeadPayload;
  try {
    payload = await request.json() as LeadPayload;
  } catch {
    return Response.json({ error: "A valid JSON body is required." }, { status: 400 });
  }
  if (!payload.booth?.trim()) {
    return Response.json({ error: "A booth is required." }, { status: 400 });
  }

  let persisted = false;
  try {
    // D1 is the durable lead source. Local previews without a binding remain
    // demonstrable, but the response explicitly reports persisted: false.
    const db = getDb();
    const recent = await db.select({ createdAt: leads.createdAt }).from(leads).where(and(
      eq(leads.email, auth.user.email),
      eq(leads.boothName, payload.booth.trim()),
    )).orderBy(desc(leads.id)).limit(1);
    if (recent[0]) {
      const rawCreatedAt = recent[0].createdAt;
      const normalizedCreatedAt = rawCreatedAt.includes("T")
        ? rawCreatedAt
        : `${rawCreatedAt.replace(" ", "T")}Z`;
      const createdAt = new Date(normalizedCreatedAt).getTime();
      if (Number.isFinite(createdAt) && Date.now() - createdAt < 30_000) {
        return Response.json({ error: "Please wait before submitting this interest again." }, { status: 429 });
      }
    }
    await db.insert(leads).values({
      name: auth.user.displayName,
      email: auth.user.email,
      company: payload.company?.trim() ?? "",
      eventName: EVENT_NAME,
      boothName: payload.booth!.trim(),
      interest: payload.interest?.trim() ?? "",
    });
    persisted = true;
  } catch {
    // CRM delivery may still succeed when D1 is temporarily unavailable.
  }

  let crm: Awaited<ReturnType<typeof dispatchCrmLead>>;
  try {
    crm = await dispatchCrmLead({
      // CRM delivery is independent of D1 persistence so a temporary failure in
      // either destination does not discard the other successful write.
      source: "velocity-venue",
      ...payload,
      name: auth.user.displayName,
      email: auth.user.email,
      event: EVENT_NAME,
      capturedAt: new Date().toISOString(),
    });
  } catch {
    crm = { configured: true, delivered: false, provider: process.env.CRM_PROVIDER || "generic", slackDelivered: false };
  }

  return Response.json({
    ok: persisted || crm.delivered,
    persisted,
    routed: crm.delivered,
    provider: crm.provider,
    slackDelivered: crm.slackDelivered,
  }, { status: persisted || crm.delivered ? 201 : 503 });
}
