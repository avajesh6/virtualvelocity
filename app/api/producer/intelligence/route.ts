import { and, desc, eq } from "drizzle-orm";
import {
  EgressClient,
  EgressStatus,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
  StreamOutput,
  StreamProtocol,
} from "livekit-server-sdk";
import { getDb } from "../../../../db";
import {
  auditEvents,
  contentAssets,
  engagementItems,
  engagementVotes,
  recordingJobs,
  sponsorInteractions,
  sponsorBooths,
  telemetryEvents,
  transcriptSegments,
} from "../../../../db/schema";
import { authorizeProducerRequest } from "../../../producer-auth";
import { EVENT_NAME, isVenueRoomName } from "../../../venue-config";

function egressClient() {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return null;
  return new EgressClient(url.replace(/^wss:/, "https:").replace(/^ws:/, "http:"), apiKey, apiSecret);
}

function egressStatusName(status: EgressStatus) {
  return EgressStatus[status] ?? String(status);
}

function recordingOutput(roomName: string) {
  const accessKey = process.env.RECORDING_S3_ACCESS_KEY;
  const secret = process.env.RECORDING_S3_SECRET;
  const bucket = process.env.RECORDING_S3_BUCKET;
  const endpoint = process.env.RECORDING_S3_ENDPOINT;
  if (!accessKey || !secret || !bucket) return null;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: `${EVENT_NAME.toLowerCase().replace(/\s+/g, "-")}/${roomName}/${timestamp}.mp4`,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey,
        secret,
        bucket,
        endpoint: endpoint ?? "",
        region: process.env.RECORDING_S3_REGION ?? "auto",
        forcePathStyle: process.env.RECORDING_S3_FORCE_PATH_STYLE === "true",
      }),
    },
  });
}

export async function GET(request: Request) {
  const auth = await authorizeProducerRequest(request);
  if ("error" in auth) return auth.error;
  try {
    const db = getDb();
    const [telemetry, items, votes, recordings, transcripts, assets, sponsorEvents] = await Promise.all([
      db.select().from(telemetryEvents).where(eq(telemetryEvents.eventName, EVENT_NAME))
        .orderBy(desc(telemetryEvents.id)).limit(500),
      db.select().from(engagementItems).where(eq(engagementItems.eventName, EVENT_NAME))
        .orderBy(desc(engagementItems.id)).limit(100),
      db.select().from(engagementVotes).orderBy(desc(engagementVotes.id)).limit(1000),
      db.select().from(recordingJobs).where(eq(recordingJobs.eventName, EVENT_NAME))
        .orderBy(desc(recordingJobs.id)).limit(30),
      db.select().from(transcriptSegments).where(eq(transcriptSegments.eventName, EVENT_NAME))
        .orderBy(desc(transcriptSegments.id)).limit(250),
      db.select().from(contentAssets).where(eq(contentAssets.eventName, EVENT_NAME))
        .orderBy(desc(contentAssets.id)).limit(30),
      db.select().from(sponsorInteractions).where(eq(sponsorInteractions.eventName, EVENT_NAME))
        .orderBy(desc(sponsorInteractions.id)).limit(500),
    ]);
    const joins = telemetry.filter((item) => item.eventType === "participant_joined").length;
    const leaves = telemetry.filter((item) => item.eventType === "participant_left").length;
    const activeRecording = recordings.find((item) => ["EGRESS_STARTING", "EGRESS_ACTIVE", "starting", "active"].includes(item.status));
    const recommendations = [
      joins > 0 && leaves / joins > 0.35 ? "Participant departures are elevated. Review recent room and connection events." : null,
      items.filter((item) => item.kind === "question" && item.status === "open").length > 5
        ? "The Q&A queue is growing. Assign a moderator or bring a top question to stage."
        : null,
      !activeRecording && telemetry.some((item) => item.eventType === "room_started")
        ? "A room is active without a recorded egress job. Start recording if attendee consent has been confirmed."
        : null,
    ].filter(Boolean);
    return Response.json({
      metrics: {
        joins,
        leaves,
        engagementResponses: votes.length,
        openQuestions: items.filter((item) => item.kind === "question" && item.status === "open").length,
        sponsorOptIns: sponsorEvents.filter((item) => item.consent).length,
        transcriptSegments: transcripts.length,
      },
      telemetry,
      items: items.map((item) => ({
        ...item,
        responseCount: votes.filter((vote) => vote.itemId === item.id).length,
      })),
      recordings,
      assets,
      transcriptPreview: transcripts.reverse(),
      recommendations,
      recordingConfigured: Boolean(recordingOutput("configuration-check")),
      streamingConfigured: Boolean(process.env.LIVEKIT_RTMP_URLS),
    }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Event intelligence is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeProducerRequest(request);
  if ("error" in auth) return auth.error;
  let body: {
    action?: string;
    room?: string;
    prompt?: string;
    options?: string[];
    itemId?: number;
    egressId?: string;
    title?: string;
    url?: string;
    summary?: string;
    transcript?: Array<{ speakerName?: string; language?: string; text?: string; startMs?: number }>;
    name?: string;
    description?: string;
    resourceUrl?: string;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "A valid JSON body is required." }, { status: 400 });
  }
  try {
    const db = getDb();
    if (body.action === "create-poll") {
      const prompt = body.prompt?.trim() ?? "";
      const options = (body.options ?? []).map((option) => option.trim()).filter(Boolean).slice(0, 6);
      if (!isVenueRoomName(body.room) || prompt.length < 5 || options.length < 2) {
        return Response.json({ error: "A room, question, and at least two choices are required." }, { status: 400 });
      }
      const created = await db.insert(engagementItems).values({
        eventName: EVENT_NAME,
        roomName: body.room,
        kind: "poll",
        authorId: auth.authUser.id,
        authorName: auth.user.displayName,
        prompt: prompt.slice(0, 500),
        optionsJson: JSON.stringify(options),
      }).returning();
      return Response.json({ item: created[0] }, { status: 201 });
    }
    if (body.action === "close-item" && Number.isInteger(body.itemId)) {
      await db.update(engagementItems).set({ status: "closed" })
        .where(and(eq(engagementItems.id, body.itemId!), eq(engagementItems.eventName, EVENT_NAME)));
      return Response.json({ ok: true });
    }
    if (body.action === "start-recording" && isVenueRoomName(body.room)) {
      const client = egressClient();
      if (!client) return Response.json({ error: "LiveKit server credentials are not configured." }, { status: 503 });
      const file = recordingOutput(body.room);
      const urls = (process.env.LIVEKIT_RTMP_URLS ?? "").split(",").map((url) => url.trim()).filter(Boolean);
      if (!file && !urls.length) {
        return Response.json({ error: "Configure an S3-compatible recording destination or RTMP output before recording." }, { status: 503 });
      }
      const output = {
        ...(file ? { file } : {}),
        ...(urls.length ? { stream: new StreamOutput({ protocol: StreamProtocol.RTMP, urls }) } : {}),
      };
      const egress = await client.startRoomCompositeEgress(body.room, output, { layout: "grid" });
      await db.insert(recordingJobs).values({
        egressId: egress.egressId,
        eventName: EVENT_NAME,
        roomName: body.room,
        status: egressStatusName(egress.status),
        startedBy: auth.user.email,
      });
      await db.insert(auditEvents).values({
        eventName: EVENT_NAME,
        actorEmail: auth.user.email,
        action: "recording.started",
        target: body.room,
        detail: egress.egressId,
      });
      return Response.json({ egressId: egress.egressId }, { status: 201 });
    }
    if (body.action === "stop-recording" && body.egressId?.trim()) {
      const client = egressClient();
      if (!client) return Response.json({ error: "LiveKit server credentials are not configured." }, { status: 503 });
      const egress = await client.stopEgress(body.egressId.trim());
      await db.update(recordingJobs).set({
        status: egressStatusName(egress.status),
        playbackUrl: egress.fileResults[0]?.location ?? "",
        updatedAt: new Date().toISOString(),
      }).where(eq(recordingJobs.egressId, body.egressId.trim()));
      return Response.json({ ok: true });
    }
    if (body.action === "publish-replay") {
      const title = body.title?.trim() ?? "";
      const url = body.url?.trim() ?? "";
      if (!isVenueRoomName(body.room) || !title || !/^https:\/\//.test(url)) {
        return Response.json({ error: "A room, title, and secure replay URL are required." }, { status: 400 });
      }
      const asset = await db.insert(contentAssets).values({
        eventName: EVENT_NAME,
        roomName: body.room,
        title: title.slice(0, 160),
        url,
        summary: body.summary?.trim().slice(0, 2000) ?? "",
        status: "published",
      }).returning();
      return Response.json({ asset: asset[0] }, { status: 201 });
    }
    if (body.action === "import-transcript" && isVenueRoomName(body.room)) {
      const segments = (body.transcript ?? []).filter((segment) => segment.text?.trim()).slice(0, 500);
      if (!segments.length) return Response.json({ error: "At least one transcript segment is required." }, { status: 400 });
      await db.insert(transcriptSegments).values(segments.map((segment) => ({
        eventName: EVENT_NAME,
        roomName: body.room!,
        speakerName: segment.speakerName?.trim().slice(0, 120) ?? "",
        language: segment.language?.trim().slice(0, 12) ?? "en",
        text: segment.text!.trim().slice(0, 2000),
        startMs: Math.max(0, Number(segment.startMs) || 0),
      })));
      return Response.json({ imported: segments.length }, { status: 201 });
    }
    if (body.action === "generate-memory" && isVenueRoomName(body.room)) {
      const segments = await db.select().from(transcriptSegments)
        .where(and(
          eq(transcriptSegments.eventName, EVENT_NAME),
          eq(transcriptSegments.roomName, body.room),
        )).orderBy(transcriptSegments.startMs).limit(1000);
      if (!segments.length) return Response.json({ error: "Import or stream finalized transcript segments first." }, { status: 409 });
      const transcript = segments.map((segment) => `${segment.speakerName}: ${segment.text}`).join("\n");
      let summary = "";
      let chapters: Array<{ startMs: number; title: string }> = [];
      const generationUrl = process.env.MEMORY_GENERATION_WEBHOOK_URL;
      if (generationUrl) {
        const response = await fetch(generationUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(process.env.MEMORY_GENERATION_WEBHOOK_TOKEN
              ? { authorization: `Bearer ${process.env.MEMORY_GENERATION_WEBHOOK_TOKEN}` }
              : {}),
          },
          body: JSON.stringify({ eventName: EVENT_NAME, roomName: body.room, transcript }),
        });
        if (!response.ok) throw new Error("The configured memory-generation service rejected the transcript.");
        const generated = await response.json() as { summary?: string; chapters?: Array<{ startMs: number; title: string }> };
        summary = generated.summary?.trim().slice(0, 4000) ?? "";
        chapters = (generated.chapters ?? []).slice(0, 30);
      }
      if (!summary) {
        // A deterministic fallback keeps conference memory functional without
        // sending transcript content to an unconfigured third-party model.
        summary = segments.slice(0, 8).map((segment) => segment.text.trim()).filter(Boolean).join(" ").slice(0, 4000);
        chapters = segments.filter((_, index) => index % 20 === 0).slice(0, 20)
          .map((segment) => ({ startMs: segment.startMs, title: segment.text.split(/[.!?]/)[0].slice(0, 90) }));
      }
      const asset = await db.insert(contentAssets).values({
        eventName: EVENT_NAME,
        roomName: body.room,
        title: body.title?.trim().slice(0, 160) || "Session conference memory",
        kind: "memory",
        summary,
        chaptersJson: JSON.stringify(chapters),
        status: "published",
      }).returning();
      return Response.json({ asset: asset[0] }, { status: 201 });
    }
    if (body.action === "publish-sponsor") {
      const name = body.name?.trim() ?? "";
      const resourceUrl = body.resourceUrl?.trim() ?? "";
      if (!name || (resourceUrl && !/^https:\/\//.test(resourceUrl))) {
        return Response.json({ error: "A sponsor name and optional secure resource URL are required." }, { status: 400 });
      }
      const booth = await db.insert(sponsorBooths).values({
        eventName: EVENT_NAME,
        name: name.slice(0, 120),
        description: body.description?.trim().slice(0, 500) ?? "",
        resourceUrl,
      }).returning();
      return Response.json({ booth: booth[0] }, { status: 201 });
    }
    return Response.json({ error: "Unsupported intelligence action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The producer operation failed.";
    return Response.json({ error: message.slice(0, 300) }, { status: 502 });
  }
}
