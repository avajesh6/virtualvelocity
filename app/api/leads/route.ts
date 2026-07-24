import { getDb } from "../../../db";
import { leads } from "../../../db/schema";
import { dispatchCrmLead } from "../../integrations";

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

  const crm = await dispatchCrmLead({
    source: "velocity-venue",
    ...payload,
    capturedAt: new Date().toISOString(),
  });

  return Response.json({
    ok: true,
    mode: crm.configured ? "connected" : "demo",
    persisted,
    routed: crm.delivered,
    provider: crm.provider,
  }, { status: 201 });
}
