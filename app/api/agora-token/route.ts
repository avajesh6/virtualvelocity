import { RtcTokenBuilder, RtcRole } from "agora-access-token";
import { isVenueRoomName } from "../../venue-config";

export async function POST(request: Request) {
  let body: { channelName?: string };
  try {
    body = (await request.json()) as { channelName?: string };
  } catch {
    return Response.json({ error: "A valid JSON body is required." }, { status: 400 });
  }

  const channel = body.channelName?.trim();
  if (!channel || !isVenueRoomName(channel)) {
    return Response.json({ error: "A configured venue channel is required." }, { status: 400 });
  }

  try {
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      return Response.json(
        { error: "Agora is not configured for this deployment." },
        { status: 503 },
      );
    }

    // Agora numeric UIDs are unsigned 32-bit integers. Generate the identity on
    // the server so callers cannot deliberately collide with another attendee.
    const numericUid = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channel,
      numericUid,
      role,
      privilegeExpiredTs
    );

    return Response.json(
      { token, appId, channelName: channel, uid: numericUid },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate Agora token." },
      { status: 500 }
    );
  }
}
