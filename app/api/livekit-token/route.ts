import { AccessToken } from "livekit-server-sdk";
import { isVenueRoomName } from "../../venue-config";

/**
 * Issues least-scope LiveKit grants to attendee browsers.
 *
 * LiveKit API credentials never cross this boundary. The browser receives only
 * a short-lived JWT for one allowlisted event room.
 */
export async function POST(request: Request) {
  let body: { displayName?: string; identity?: string; room?: string };
  try {
    body = (await request.json()) as { identity?: string; room?: string };
  } catch {
    return Response.json({ error: "A valid JSON body is required." }, { status: 400 });
  }
  const displayName = body.displayName?.trim() || body.identity?.trim();
  const { room } = body;
  if (!displayName || !room?.trim()) {
    return Response.json({ error: "displayName and room are required" }, { status: 400 });
  }
  if (displayName.length > 64 || !isVenueRoomName(room.trim())) {
    // Room allowlisting prevents a caller from using this public endpoint to
    // mint tokens for unrelated rooms in the same LiveKit project.
    return Response.json({ error: "Invalid identity or room." }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !serverUrl) {
    return Response.json({ mode: "demo", message: "LiveKit credentials are not configured." }, { status: 503 });
  }

  // A server-generated identity prevents two attendees with the same display
  // name from disconnecting each other. The human-readable name stays stable.
  const identity = `${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "guest"}-${crypto.randomUUID()}`;
  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: displayName,
    ttl: "1h",
  });
  // Attendees need publish and subscribe for two-way conference participation.
  // Administrative capabilities are intentionally omitted.
  token.addGrant({ roomJoin: true, room: room.trim(), canPublish: true, canSubscribe: true });
  return Response.json(
    { token: await token.toJwt(), serverUrl },
    { headers: { "cache-control": "no-store" } },
  );
}
