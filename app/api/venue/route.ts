import { and, asc, desc, eq } from "drizzle-orm";
import { RoomServiceClient } from "livekit-server-sdk";
import { getDb } from "../../../db";
import { auditEvents, runOfShowItems } from "../../../db/schema";
import { EVENT_NAME, VENUE_ROOMS } from "../../venue-config";

function getRoomClient() {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return null;
  return new RoomServiceClient(
    url.replace(/^wss:/, "https:").replace(/^ws:/, "http:"),
    apiKey,
    apiSecret,
  );
}

export async function GET() {
  const client = getRoomClient();
  let mediaAvailable = Boolean(client);
  let mediaError: string | null = null;
  const counts = new Map<string, number>();

  if (client) {
    try {
      const liveRooms = await client.listRooms(VENUE_ROOMS.map((room) => room.roomName));
      for (const room of liveRooms) {
        counts.set(room.name, Number(room.numParticipants));
      }
    } catch {
      mediaAvailable = false;
      mediaError = "Live room status is temporarily unavailable.";
    }
  } else {
    mediaError = "LiveKit is not configured.";
  }

  let scheduleAvailable = true;
  let runOfShow: Array<{
    id: number;
    scheduledTime: string;
    title: string;
    owner: string;
    status: string;
  }> = [];
  let announcements: Array<{ id: number; detail: string; createdAt: string }> = [];
  try {
    const db = getDb();
    [runOfShow, announcements] = await Promise.all([
      db.select({
        id: runOfShowItems.id,
        scheduledTime: runOfShowItems.scheduledTime,
        title: runOfShowItems.title,
        owner: runOfShowItems.owner,
        status: runOfShowItems.status,
      })
        .from(runOfShowItems)
        .where(eq(runOfShowItems.eventName, EVENT_NAME))
        .orderBy(asc(runOfShowItems.position)),
      db.select({
        id: auditEvents.id,
        detail: auditEvents.detail,
        createdAt: auditEvents.createdAt,
      })
        .from(auditEvents)
        .where(and(
          eq(auditEvents.eventName, EVENT_NAME),
          eq(auditEvents.action, "producer.announcement"),
        ))
        .orderBy(desc(auditEvents.id))
        .limit(10),
    ]);
  } catch {
    scheduleAvailable = false;
  }

  const rooms = VENUE_ROOMS.map((room) => ({
    ...room,
    participantCount: counts.get(room.roomName) ?? 0,
  }));

  return Response.json({
    eventName: EVENT_NAME,
    serverTime: new Date().toISOString(),
    mediaAvailable,
    mediaError,
    scheduleAvailable,
    rooms,
    totalParticipants: rooms.reduce((total, room) => total + room.participantCount, 0),
    activeRooms: rooms.filter((room) => room.participantCount > 0).length,
    runOfShow,
    announcements,
  }, { headers: { "cache-control": "no-store" } });
}
