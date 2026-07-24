import { and, desc, eq, ne, or } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  attendeeProfiles,
  connectionRequests,
  contentAssets,
  engagementItems,
  engagementVotes,
  sponsorInteractions,
  sponsorBooths,
  transcriptSegments,
} from "../../../db/schema";
import { authenticateRequest } from "../../producer-auth";
import { EVENT_NAME, isVenueRoomName } from "../../venue-config";
import { dispatchIntegration } from "../../integrations";

type ExperienceAction =
  | "save-profile"
  | "ask-question"
  | "vote"
  | "answer-poll"
  | "request-connection"
  | "respond-connection"
  | "schedule-connection"
  | "sponsor-interest"
  | "reaction"
  | "raise-hand";

function safeJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function optionalUser(request: Request) {
  if (!request.headers.get("authorization")?.startsWith("Bearer ")) return null;
  const auth = await authenticateRequest(request);
  return "error" in auth ? null : auth;
}

export async function GET(request: Request) {
  const auth = await optionalUser(request);
  try {
    const db = getDb();
    const [items, votes, replays, transcripts, sponsors] = await Promise.all([
      db.select().from(engagementItems)
        .where(eq(engagementItems.eventName, EVENT_NAME))
        .orderBy(desc(engagementItems.id)).limit(100),
      db.select().from(engagementVotes).orderBy(desc(engagementVotes.id)).limit(1000),
      db.select().from(contentAssets)
        .where(eq(contentAssets.eventName, EVENT_NAME))
        .orderBy(desc(contentAssets.id)).limit(50),
      db.select().from(transcriptSegments)
        .where(eq(transcriptSegments.eventName, EVENT_NAME))
        .orderBy(desc(transcriptSegments.id)).limit(100),
      db.select().from(sponsorBooths)
        .where(and(eq(sponsorBooths.eventName, EVENT_NAME), eq(sponsorBooths.status, "published")))
        .orderBy(desc(sponsorBooths.id)).limit(30),
    ]);

    const voteCounts = new Map<number, Map<string, number>>();
    for (const vote of votes) {
      const options = voteCounts.get(vote.itemId) ?? new Map<string, number>();
      options.set(vote.response, (options.get(vote.response) ?? 0) + 1);
      voteCounts.set(vote.itemId, options);
    }

    let profile = null;
    let matches: Array<{
      userId: string;
      displayName: string;
      company: string;
      jobTitle: string;
      sharedInterests: string[];
    }> = [];
    let connections: typeof connectionRequests.$inferSelect[] = [];
    if (auth) {
      const profiles = await db.select().from(attendeeProfiles)
        .where(eq(attendeeProfiles.userId, auth.authUser.id)).limit(1);
      profile = profiles[0] ? {
        ...profiles[0],
        interests: safeJsonArray(profiles[0].interests),
      } : null;
      const currentInterests = new Set((profile?.interests ?? []).map(String));
      if (profile?.discoverable) {
        const candidates = await db.select().from(attendeeProfiles)
          .where(and(
            eq(attendeeProfiles.discoverable, true),
            ne(attendeeProfiles.userId, auth.authUser.id),
          )).limit(50);
        matches = candidates.map((candidate) => {
          const interests = safeJsonArray(candidate.interests).map(String);
          return {
            userId: candidate.userId,
            displayName: candidate.displayName,
            company: candidate.company,
            jobTitle: candidate.jobTitle,
            sharedInterests: interests.filter((interest) => currentInterests.has(interest)),
          };
        }).sort((a, b) => b.sharedInterests.length - a.sharedInterests.length).slice(0, 8);
      }
      connections = await db.select().from(connectionRequests)
        .where(or(
          eq(connectionRequests.requesterId, auth.authUser.id),
          eq(connectionRequests.recipientId, auth.authUser.id),
        ))
        .orderBy(desc(connectionRequests.id)).limit(50);
    }

    return Response.json({
      items: items.map((item) => ({
        ...item,
        options: safeJsonArray(item.optionsJson),
        results: Object.fromEntries(voteCounts.get(item.id) ?? []),
        userResponse: auth
          ? votes.find((vote) => vote.itemId === item.id && vote.userId === auth.authUser.id)?.response ?? null
          : null,
      })),
      profile,
      matches,
      connections: connections.map((connection) => ({
        ...connection,
        direction: auth && connection.recipientId === auth.authUser.id ? "incoming" : "outgoing",
      })),
      replays: replays.map((asset) => ({
        ...asset,
        chapters: safeJsonArray(asset.chaptersJson),
      })),
      transcripts: transcripts.reverse(),
      sponsors,
    }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "The event experience is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  let body: {
    action?: ExperienceAction;
    room?: string;
    prompt?: string;
    itemId?: number;
    response?: string;
    company?: string;
    jobTitle?: string;
    interests?: string[];
    discoverable?: boolean;
    captionLanguage?: string;
    reducedData?: boolean;
    recipientId?: string;
    recipientName?: string;
    boothName?: string;
    consent?: boolean;
    connectionId?: number;
    status?: string;
    startsAt?: string;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "A valid JSON body is required." }, { status: 400 });
  }

  try {
    const db = getDb();
    if (body.action === "save-profile") {
      const interests = (body.interests ?? [])
        .map((interest) => String(interest).trim())
        .filter(Boolean).slice(0, 12);
      const values = {
        email: auth.user.email,
        displayName: auth.user.displayName,
        company: body.company?.trim().slice(0, 120) ?? "",
        jobTitle: body.jobTitle?.trim().slice(0, 120) ?? "",
        interests: JSON.stringify(interests),
        discoverable: Boolean(body.discoverable),
        captionLanguage: body.captionLanguage?.trim().slice(0, 12) || "en",
        reducedData: Boolean(body.reducedData),
        updatedAt: new Date().toISOString(),
      };
      const existing = await db.select({ userId: attendeeProfiles.userId })
        .from(attendeeProfiles).where(eq(attendeeProfiles.userId, auth.authUser.id)).limit(1);
      if (existing.length) {
        await db.update(attendeeProfiles).set(values)
          .where(eq(attendeeProfiles.userId, auth.authUser.id));
      } else {
        await db.insert(attendeeProfiles).values({ userId: auth.authUser.id, ...values });
      }
      return Response.json({ ok: true });
    }

    if (body.action === "ask-question") {
      const prompt = body.prompt?.trim() ?? "";
      if (!isVenueRoomName(body.room) || prompt.length < 5 || prompt.length > 500) {
        return Response.json({ error: "Choose a room and enter a question between 5 and 500 characters." }, { status: 400 });
      }
      const created = await db.insert(engagementItems).values({
        eventName: EVENT_NAME,
        roomName: body.room,
        kind: "question",
        authorId: auth.authUser.id,
        authorName: auth.user.displayName,
        prompt,
      }).returning();
      return Response.json({ item: created[0] }, { status: 201 });
    }

    if ((body.action === "reaction" || body.action === "raise-hand") && isVenueRoomName(body.room)) {
      const prompt = body.action === "raise-hand" ? "hand-raised" : body.response?.trim() ?? "";
      const allowedReactions = new Set(["applause", "agree", "insightful"]);
      if (body.action === "reaction" && !allowedReactions.has(prompt)) {
        return Response.json({ error: "Invalid reaction." }, { status: 400 });
      }
      await db.insert(engagementItems).values({
        eventName: EVENT_NAME,
        roomName: body.room,
        kind: body.action === "raise-hand" ? "hand" : "reaction",
        authorId: auth.authUser.id,
        authorName: auth.user.displayName,
        prompt,
        status: "closed",
      });
      return Response.json({ ok: true }, { status: 201 });
    }

    if ((body.action === "vote" || body.action === "answer-poll") && Number.isInteger(body.itemId)) {
      const response = body.action === "vote" ? "upvote" : body.response?.trim() ?? "";
      const item = await db.select().from(engagementItems)
        .where(and(eq(engagementItems.id, body.itemId!), eq(engagementItems.eventName, EVENT_NAME)))
        .limit(1);
      if (!item.length || item[0].status !== "open") {
        return Response.json({ error: "This interaction is no longer open." }, { status: 409 });
      }
      const allowed = item[0].kind === "poll"
        ? safeJsonArray(item[0].optionsJson).map(String).includes(response)
        : response === "upvote";
      if (!allowed) return Response.json({ error: "Invalid response." }, { status: 400 });
      const prior = await db.select().from(engagementVotes)
        .where(and(eq(engagementVotes.itemId, item[0].id), eq(engagementVotes.userId, auth.authUser.id)))
        .limit(1);
      if (prior.length) {
        await db.update(engagementVotes).set({ response })
          .where(eq(engagementVotes.id, prior[0].id));
      } else {
        await db.insert(engagementVotes).values({ itemId: item[0].id, userId: auth.authUser.id, response });
      }
      return Response.json({ ok: true });
    }

    if (body.action === "request-connection") {
      if (!body.recipientId?.trim() || !body.recipientName?.trim() || body.recipientId === auth.authUser.id) {
        return Response.json({ error: "Choose a valid attendee." }, { status: 400 });
      }
      const recipient = await db.select().from(attendeeProfiles)
        .where(and(
          eq(attendeeProfiles.userId, body.recipientId.trim()),
          eq(attendeeProfiles.discoverable, true),
        )).limit(1);
      if (!recipient.length) return Response.json({ error: "This attendee is not available for networking." }, { status: 404 });
      const prior = await db.select().from(connectionRequests)
        .where(and(
          eq(connectionRequests.requesterId, auth.authUser.id),
          eq(connectionRequests.recipientId, recipient[0].userId),
        )).limit(1);
      if (!prior.length) {
        await db.insert(connectionRequests).values({
          eventName: EVENT_NAME,
          requesterId: auth.authUser.id,
          requesterName: auth.user.displayName,
          recipientId: recipient[0].userId,
          recipientName: recipient[0].displayName,
        });
      }
      return Response.json({ ok: true }, { status: prior.length ? 200 : 201 });
    }

    if (
      body.action === "respond-connection"
      && Number.isInteger(body.connectionId)
      && (body.status === "accepted" || body.status === "declined")
    ) {
      const connection = await db.select().from(connectionRequests)
        .where(and(
          eq(connectionRequests.id, body.connectionId!),
          eq(connectionRequests.recipientId, auth.authUser.id),
        )).limit(1);
      if (!connection.length) return Response.json({ error: "Connection request not found." }, { status: 404 });
      await db.update(connectionRequests).set({ status: body.status })
        .where(eq(connectionRequests.id, connection[0].id));
      return Response.json({ ok: true });
    }

    if (body.action === "schedule-connection" && Number.isInteger(body.connectionId)) {
      const startsAt = new Date(body.startsAt ?? "");
      if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() < Date.now()) {
        return Response.json({ error: "Choose a future introduction time." }, { status: 400 });
      }
      const connection = await db.select().from(connectionRequests)
        .where(and(
          eq(connectionRequests.id, body.connectionId!),
          eq(connectionRequests.status, "accepted"),
          or(
            eq(connectionRequests.requesterId, auth.authUser.id),
            eq(connectionRequests.recipientId, auth.authUser.id),
          ),
        )).limit(1);
      if (!connection.length) return Response.json({ error: "An accepted connection is required." }, { status: 404 });
      const result = await dispatchIntegration({
        channel: "calendar",
        message: `${connection[0].requesterName} × ${connection[0].recipientName} networking introduction`,
        eventName: EVENT_NAME,
        roomName: "Connection lounge",
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + 20 * 60_000).toISOString(),
      });
      if (!result.configured) return Response.json({ error: "The calendar booking adapter is not configured." }, { status: 503 });
      if (!result.delivered) return Response.json({ error: "The calendar provider rejected the introduction." }, { status: 502 });
      return Response.json({ ok: true });
    }

    if (body.action === "sponsor-interest") {
      if (!body.boothName?.trim() || body.consent !== true) {
        return Response.json({ error: "Explicit consent is required before sharing details with a sponsor." }, { status: 400 });
      }
      const sponsor = await db.select().from(sponsorBooths)
        .where(and(
          eq(sponsorBooths.eventName, EVENT_NAME),
          eq(sponsorBooths.name, body.boothName.trim()),
          eq(sponsorBooths.status, "published"),
        )).limit(1);
      if (!sponsor.length) return Response.json({ error: "This sponsor booth is not available." }, { status: 404 });
      await db.insert(sponsorInteractions).values({
        eventName: EVENT_NAME,
        boothName: body.boothName.trim().slice(0, 120),
        userId: auth.authUser.id,
        userEmail: auth.user.email,
        action: "interest",
        consent: true,
      });
      return Response.json({ ok: true }, { status: 201 });
    }

    return Response.json({ error: "Unsupported experience action." }, { status: 400 });
  } catch {
    return Response.json({ error: "The event interaction could not be saved." }, { status: 503 });
  }
}
