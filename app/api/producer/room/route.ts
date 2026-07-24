import { RoomServiceClient, TrackType } from "livekit-server-sdk";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, incidents } from "../../../../db/schema";
import { authorizeProducerRequest } from "../../../producer-auth";
import { EVENT_NAME, isVenueRoomName } from "../../../venue-config";

function getRoomClient() {
  // LiveKit's server SDK uses HTTP(S), while attendee clients use the websocket
  // URL. Convert only the scheme and preserve the configured host.
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return null;
  return new RoomServiceClient(url.replace(/^wss:/, "https:").replace(/^ws:/, "http:"), apiKey, apiSecret);
}

function validRoom(room: unknown): room is string {
  // Producer administration is restricted to rooms owned by this event.
  return isVenueRoomName(room);
}

export async function GET(request: Request) {
  const auth = await authorizeProducerRequest(request);
  if ("error" in auth) return auth.error;

  const room = new URL(request.url).searchParams.get("room");
  if (!validRoom(room)) return Response.json({ error: "Invalid room." }, { status: 400 });

  const client = getRoomClient();
  if (!client) return Response.json({ mode: "demo", message: "LiveKit credentials are not configured." }, { status: 503 });

  try {
    const participants = await client.listParticipants(room);
    // Return only fields required by producer controls. This keeps LiveKit's
    // evolving participant model out of the browser-facing API contract.
    return Response.json({
      participants: participants.map((participant) => {
        const audioTrack = participant.tracks.find((track) => track.type === TrackType.AUDIO);
        return {
          identity: participant.identity,
          name: participant.name || participant.identity,
          audioTrackSid: audioTrack?.sid ?? null,
          audioMuted: audioTrack?.muted ?? false,
        };
      }),
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    // LiveKit returns 404 until the first participant creates the room. That is
    // a healthy empty-room state, not an operational outage.
    const liveKitError = error as { code?: string; status?: number; message?: string };
    if (
      liveKitError.status === 404
      || liveKitError.code === "not_found"
      || liveKitError.message?.includes("requested room does not exist")
    ) {
      return Response.json({ participants: [] }, { headers: { "cache-control": "no-store" } });
    }
    return Response.json({ error: "The LiveKit room could not be read." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeProducerRequest(request);
  if ("error" in auth) return auth.error;

  let body: { action?: string; room?: string; identity?: string; trackSid?: string | null };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "A valid JSON body is required." }, { status: 400 });
  }
  if (!validRoom(body.room)) return Response.json({ error: "Invalid room." }, { status: 400 });

  const client = getRoomClient();
  if (!client) return Response.json({ mode: "demo", message: "LiveKit credentials are not configured." }, { status: 503 });

  try {
    if (body.action === "rescue") {
      let incidentId: number | undefined;
      try {
        // Open the incident before touching LiveKit so the operational timeline
        // includes recovery attempts, not only successful outcomes.
        const created = await getDb().insert(incidents).values({
          eventName: EVENT_NAME,
          roomName: body.room,
          kind: "room-recovery",
          status: "active",
        }).returning({ id: incidents.id });
        incidentId = created[0]?.id;
      } catch {
        // Live recovery must remain available if incident persistence is unavailable.
      }
      const startedAt = Date.now();
      const backupRoom = `${body.room}-backup`;
      await client.createRoom({ name: backupRoom, emptyTimeout: 15 * 60 });
      const participants = await client.listParticipants(body.room);
      const results = await Promise.allSettled(
        // One participant failure must not cancel movement for everyone else.
        participants.map((participant) => client.moveParticipant(body.room!, participant.identity, backupRoom)),
      );
      const moved = results.filter((result) => result.status === "fulfilled").length;
      try {
        const db = getDb();
        if (incidentId) {
          await db.update(incidents).set({
            status: "resolved",
            attendeesAffected: participants.length,
            recoverySeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
          }).where(eq(incidents.id, incidentId));
        }
        await db.insert(auditEvents).values({
          // Detail is JSON because the action has a small structured result; the
          // stable action/target columns remain easy to filter in D1.
          eventName: EVENT_NAME,
          actorEmail: auth.user.email,
          action: "room.rescue",
          target: body.room,
          detail: JSON.stringify({ moved, destination: backupRoom }),
        });
      } catch {
        // The completed LiveKit action is authoritative even if audit storage is unavailable.
      }
      return Response.json({ ok: true, moved, destination: backupRoom });
    }

    if (!body.identity?.trim()) return Response.json({ error: "Participant identity is required." }, { status: 400 });
    if (body.action === "remove") {
      await client.removeParticipant(body.room, body.identity.trim());
      try {
        await getDb().insert(auditEvents).values({
          eventName: EVENT_NAME,
          actorEmail: auth.user.email,
          action: "participant.removed",
          target: body.identity.trim(),
          detail: body.room,
        });
      } catch {}
      return Response.json({ ok: true });
    }
    if (body.action === "mute" && body.trackSid?.trim()) {
      await client.mutePublishedTrack(body.room, body.identity.trim(), body.trackSid.trim(), true);
      try {
        await getDb().insert(auditEvents).values({
          eventName: EVENT_NAME,
          actorEmail: auth.user.email,
          action: "participant.muted",
          target: body.identity.trim(),
          detail: body.room,
        });
      } catch {}
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unsupported producer action." }, { status: 400 });
  } catch {
    return Response.json({ error: "The LiveKit producer action failed." }, { status: 502 });
  }
}
