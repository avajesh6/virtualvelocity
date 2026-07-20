import { AccessToken } from "livekit-server-sdk";

export async function POST(request: Request) {
  const { identity, room } = (await request.json()) as { identity?: string; room?: string };
  if (!identity?.trim() || !room?.trim()) {
    return Response.json({ error: "identity and room are required" }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !serverUrl) {
    return Response.json({ mode: "demo", message: "LiveKit credentials are not configured." }, { status: 503 });
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: identity.trim(),
    name: identity.trim(),
    ttl: "1h",
  });
  token.addGrant({ roomJoin: true, room: room.trim(), canPublish: true, canSubscribe: true });
  return Response.json({ token: await token.toJwt(), serverUrl });
}
