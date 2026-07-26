/**
 * Provider adapters translate the venue's stable internal event shape into the
 * minimal payload expected by each external webhook.
 *
 * Keeping translation here prevents UI and route handlers from accumulating
 * provider-specific branching.
 */
export type IntegrationChannel = "calendar" | "slack" | "teams";

type IntegrationPayload = {
  channel: IntegrationChannel;
  message: string;
  eventName: string;
  roomName?: string;
  startsAt?: string;
  endsAt?: string;
};

function endpointFor(channel: IntegrationChannel) {
  // Endpoints are server-only deployment values. Never return them to clients.
  if (channel === "calendar") return process.env.CALENDAR_WEBHOOK_URL;
  if (channel === "slack") return process.env.SLACK_WEBHOOK_URL;
  return process.env.TEAMS_WEBHOOK_URL;
}

function requestBody(payload: IntegrationPayload) {
  if (payload.channel === "slack") {
    return { text: payload.message };
  }
  if (payload.channel === "teams") {
    return { type: "message", text: payload.message };
  }
  return {
    summary: payload.message,
    event: payload.eventName,
    room: payload.roomName,
    startsAt: payload.startsAt,
    endsAt: payload.endsAt,
  };
}

export async function dispatchIntegration(payload: IntegrationPayload) {
  const endpoint = endpointFor(payload.channel);
  if (!endpoint) return { configured: false, delivered: false };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody(payload)),
  });
  return { configured: true, delivered: response.ok };
}

/**
 * Lead capture webhook dispatcher with CRM support.
 */
export async function dispatchCrmLead(payload: Record<string, unknown>) {
  const endpoint = process.env.CRM_WEBHOOK_URL;
  const provider = (process.env.CRM_PROVIDER || "generic").toLowerCase();
  
  if (process.env.SLACK_WEBHOOK_URL) {
    void dispatchIntegration({
      channel: "slack",
      message: `🎯 Lead Captured: ${payload.name || "Attendee"} (${payload.email || "No email"}) requested info for booth "${payload.booth || "General"}"!`,
      eventName: String(payload.event || "Velocity Venue"),
    });
  }

  if (!endpoint) return { configured: false, delivered: false, provider };

  const body =
    provider === "hubspot"
      ? { fields: Object.entries(payload).map(([name, value]) => ({ name, value })) }
      : provider === "salesforce"
        ? { attributes: { type: "Lead" }, ...payload }
        : payload;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.CRM_AUTH_TOKEN
        ? { authorization: `Bearer ${process.env.CRM_AUTH_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(body),
  });
  return { configured: true, delivered: response.ok, provider };
}

/**
 * ==============================================================================
 * TODO / FUTURE INTEGRATIONS PLACEHOLDERS & ARCHITECTURE DOCUMENTATION
 * ==============================================================================
 * 
 * 1. HUBSPOT & SALESFORCE ADVANCED SYNC (TODO - Phase 2):
 *    - Automatically sync attendee engagement scores (poll votes, session watch time).
 *    - Trigger automated post-event email nurturing sequences in HubSpot Workflow.
 * 
 * 2. MARKETO & ZAPIER NATIVE ACTION WEBHOOKS (TODO - Phase 2):
 *    - Real-time event check-in webhooks for instant badge scanning and virtual attendance tracking.
 * 
 * 3. SPATIAL / PROXIMITY NETWORKING ENGINE (TODO - Phase 3):
 *    - Integrate Supabase Realtime / Liveblocks multi-user canvas coordinate synchronization
 *    - Dynamically calculate 2D Euclidean distance between avatar positions (x, y) to adjust LiveKit / Agora volume.
 */
export const CRM_INTEGRATIONS_ROADMAP = [
  { provider: "HubSpot", status: "TODO / Architecture Defined", capabilities: ["Contact Sync", "Timeline Events", "Deal Creation"] },
  { provider: "Salesforce CRM", status: "TODO / Architecture Defined", capabilities: ["Lead Scoring", "Campaign Member Status", "Task Allocation"] },
  { provider: "Marketo Engage", status: "TODO / Architecture Defined", capabilities: ["Program Member Update", "Custom Activity Stream"] },
  { provider: "Zapier & Make.com", status: "Active (Generic Webhooks)", capabilities: ["Any 6000+ app connection via Webhooks"] },
];

/**
 * Generate iCalendar (.ics) content for networking 1-on-1 meetings
 */
export function generateIcsContent({
  title,
  description,
  startsAt,
  durationMinutes = 20,
}: {
  title: string;
  description: string;
  startsAt: string;
  durationMinutes?: number;
}): string {
  const startDate = new Date(startsAt);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  
  const formatDate = (date: Date) =>
    date.toISOString().replace(/-|:|\.\d+/g, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Velocity Venue//Networking Calendar 1.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:velocity-${Date.now()}@virtualvelocity.com`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
