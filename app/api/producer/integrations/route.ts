import { getDb } from "../../../../db";
import { auditEvents } from "../../../../db/schema";
import { dispatchIntegration, type IntegrationChannel } from "../../../integrations";
import { authorizeProducerRequest } from "../../../producer-auth";

const CHANNELS = new Set<IntegrationChannel>(["calendar", "slack", "teams"]);

export async function POST(request: Request) {
  const auth = await authorizeProducerRequest(request);
  if ("error" in auth) return auth.error;
  const body = await request.json() as {
    channel?: IntegrationChannel;
    message?: string;
    roomName?: string;
    startsAt?: string;
    endsAt?: string;
  };
  if (!body.channel || !CHANNELS.has(body.channel) || !body.message?.trim()) {
    return Response.json({ error: "A valid channel and message are required." }, { status: 400 });
  }
  try {
    const result = await dispatchIntegration({
      channel: body.channel,
      message: body.message.trim(),
      eventName: "Global Innovation Summit 2026",
      roomName: body.roomName,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
    });
    try {
      await getDb().insert(auditEvents).values({
        eventName: "Global Innovation Summit 2026",
        actorEmail: auth.user.email,
        action: `integration.${body.channel}`,
        target: body.roomName || "",
        detail: result.delivered ? "delivered" : result.configured ? "failed" : "not-configured",
      });
    } catch {
      // Delivery remains available if the operational database is temporarily unavailable.
    }
    return Response.json({ ok: result.delivered, ...result }, {
      status: result.delivered ? 200 : result.configured ? 502 : 503,
    });
  } catch {
    return Response.json({ error: "The integration could not be reached." }, { status: 502 });
  }
}
