import { EgressStatus, WebhookReceiver } from "livekit-server-sdk";
import { getDb } from "../../../db";
import { recordingJobs, telemetryEvents } from "../../../db/schema";
import { EVENT_NAME } from "../../venue-config";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return Response.json({ error: "LiveKit webhook verification is not configured." }, { status: 503 });
  }
  const body = await request.text();
  try {
    // Signature verification happens before parsing or persistence. LiveKit may
    // retry delivery, so externalId is unique and duplicate inserts are benign.
    const event = await new WebhookReceiver(apiKey, apiSecret).receive(
      body,
      request.headers.get("authorization") ?? undefined,
    );
    const roomName = event.room?.name ?? event.egressInfo?.roomName ?? "";
    const participantId = event.participant?.identity ?? "";
    const participantName = event.participant?.name ?? "";
    const externalId = event.id || `${event.event}-${event.createdAt}-${roomName}-${participantId}`;
    const db = getDb();
    try {
      await db.insert(telemetryEvents).values({
        externalId,
        eventName: EVENT_NAME,
        roomName,
        eventType: event.event,
        participantId,
        participantName,
        payloadJson: JSON.stringify({
          trackSid: event.track?.sid ?? null,
          egressId: event.egressInfo?.egressId ?? null,
          ingressId: event.ingressInfo?.ingressId ?? null,
        }),
        occurredAt: new Date(Number(event.createdAt) * 1000).toISOString(),
      });
    } catch {
      // Duplicate deliveries are expected and should still return 200.
    }
    if (event.egressInfo?.egressId) {
      await db.update(recordingJobs).set({
        status: EgressStatus[event.egressInfo.status] ?? String(event.egressInfo.status),
        playbackUrl: event.egressInfo.fileResults[0]?.location ?? "",
        updatedAt: new Date().toISOString(),
      }).where(eq(recordingJobs.egressId, event.egressInfo.egressId));
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Invalid LiveKit webhook signature." }, { status: 401 });
  }
}
