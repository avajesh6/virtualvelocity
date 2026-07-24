import { getDb } from "../../../db";
import { transcriptSegments } from "../../../db/schema";
import { EVENT_NAME, isVenueRoomName } from "../../venue-config";

export async function POST(request: Request) {
  const configuredToken = process.env.TRANSCRIPT_INGEST_TOKEN;
  const suppliedToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configuredToken) {
    return Response.json({ error: "Transcript ingestion is not configured." }, { status: 503 });
  }
  if (!suppliedToken || suppliedToken !== configuredToken) {
    return Response.json({ error: "Invalid transcript ingestion credential." }, { status: 401 });
  }
  let body: {
    room?: string;
    segments?: Array<{
      speakerName?: string;
      language?: string;
      text?: string;
      startMs?: number;
      final?: boolean;
    }>;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "A valid JSON body is required." }, { status: 400 });
  }
  if (!isVenueRoomName(body.room)) return Response.json({ error: "Invalid room." }, { status: 400 });
  // Partial hypotheses change rapidly and are not useful conference memory.
  // The transcription agent should send only finalized segments.
  const segments = (body.segments ?? [])
    .filter((segment) => segment.final !== false && segment.text?.trim())
    .slice(0, 500);
  if (!segments.length) return Response.json({ error: "No finalized transcript segments were supplied." }, { status: 400 });
  try {
    await getDb().insert(transcriptSegments).values(segments.map((segment) => ({
      eventName: EVENT_NAME,
      roomName: body.room!,
      speakerName: segment.speakerName?.trim().slice(0, 120) ?? "",
      language: segment.language?.trim().slice(0, 12) ?? "en",
      text: segment.text!.trim().slice(0, 2000),
      startMs: Math.max(0, Number(segment.startMs) || 0),
    })));
    return Response.json({ ingested: segments.length }, { status: 201 });
  } catch {
    return Response.json({ error: "Transcript segments could not be persisted." }, { status: 503 });
  }
}
