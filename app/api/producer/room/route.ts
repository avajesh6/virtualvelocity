import { RoomServiceClient, TrackType } from "livekit-server-sdk";
import { getChatGPTUser } from "../../../chatgpt-auth";

const SOURCE_ROOMS = new Set([
  "global-innovation-stage",
  "global-innovation-studio",
  "global-innovation-lounge",
]);

async function authorizeProducer() {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: "Producer sign-in is required." }, { status: 401 }) };

  const allowlist = (process.env.PRODUCER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.includes(user.email.toLowerCase())) {
    return { error: Response.json({ error: "This account is not an authorized producer." }, { status: 403 }) };
  }
  return { user };
}

function getRoomClient() {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return null;
  return new RoomServiceClient(url.replace(/^wss:/, "https:").replace(/^ws:/, "http:"), apiKey, apiSecret);
}

function validRoom(room: unknown): room is string {
  return typeof room === "string" && SOURCE_ROOMS.has(room);
}

export async function GET(request: Request) {
  const auth = await authorizeProducer();
  if (auth.error) return auth.error;

  const room = new URL(request.url).searchParams.get("room");
  if (!validRoom(room)) return Response.json({ error: "Invalid room." }, { status: 400 });

  const client = getRoomClient();
  if (!client) return Response.json({ mode: "demo", message: "LiveKit credentials are not configured." }, { status: 503 });

  try {
    const participants = await client.listParticipants(room);
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
  } catch {
    return Response.json({ error: "The LiveKit room could not be read." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeProducer();
  if (auth.error) return auth.error;

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
      const backupRoom = `${body.room}-backup`;
      await client.createRoom({ name: backupRoom, emptyTimeout: 15 * 60 });
      const participants = await client.listParticipants(body.room);
      const results = await Promise.allSettled(
        participants.map((participant) => client.moveParticipant(body.room!, participant.identity, backupRoom)),
      );
      const moved = results.filter((result) => result.status === "fulfilled").length;
      return Response.json({ ok: true, moved, destination: backupRoom });
    }

    if (!body.identity?.trim()) return Response.json({ error: "Participant identity is required." }, { status: 400 });
    if (body.action === "remove") {
      await client.removeParticipant(body.room, body.identity.trim());
      return Response.json({ ok: true });
    }
    if (body.action === "mute" && body.trackSid?.trim()) {
      await client.mutePublishedTrack(body.room, body.identity.trim(), body.trackSid.trim(), true);
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unsupported producer action." }, { status: 400 });
  } catch {
    return Response.json({ error: "The LiveKit producer action failed." }, { status: 502 });
  }
}
