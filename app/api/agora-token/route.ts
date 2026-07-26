import { RtcTokenBuilder, RtcRole } from "agora-access-token";

export async function POST(request: Request) {
  try {
    const { channelName, uid } = (await request.json()) as {
      channelName?: string;
      uid?: number | string;
    };

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    // Gracefully handle unconfigured credentials for live demo readiness
    if (!appId || !appCertificate) {
      return Response.json(
        {
          mode: "demo",
          message: "Agora credentials not configured on server. Operating in simulated demo mode.",
          token: "demo-agora-token-simulated",
          appId: "demo-agora-app-id",
          channelName: channelName || "velocity-venue-stage",
          uid: uid || 0,
        },
        { status: 200 }
      );
    }

    const channel = channelName || "velocity-venue-stage";
    const numericUid = typeof uid === "number" ? uid : 0;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600 * 4; // 4 hours
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

    return Response.json({
      mode: "live",
      token,
      appId,
      channelName: channel,
      uid: numericUid,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate Agora token." },
      { status: 500 }
    );
  }
}
