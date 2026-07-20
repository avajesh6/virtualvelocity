import { getDb } from "../../../db";
import { leads } from "../../../db/schema";

type LeadPayload = {
  name?: string;
  email?: string;
  company?: string;
  event?: string;
  booth?: string;
  interest?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as LeadPayload;
  const required = [payload.name, payload.email, payload.event, payload.booth];
  if (required.some((value) => !value?.trim())) {
    return Response.json({ error: "name, email, event and booth are required" }, { status: 400 });
  }

  let persisted = false;
  try {
    const db = getDb();
    await db.insert(leads).values({
      name: payload.name!.trim(),
      email: payload.email!.trim(),
      company: payload.company?.trim() ?? "",
      eventName: payload.event!.trim(),
      boothName: payload.booth!.trim(),
      interest: payload.interest?.trim() ?? "",
    });
    persisted = true;
  } catch {
    // Local preview remains usable before a D1 migration is applied.
  }

  const webhookUrl = process.env.CRM_WEBHOOK_URL;
  let routed = false;
  if (webhookUrl) {
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "velocity-venue", ...payload, capturedAt: new Date().toISOString() }),
    });
    routed = webhookResponse.ok;
  }

  return Response.json({ ok: true, mode: webhookUrl ? "connected" : "demo", persisted, routed }, { status: 201 });
}
