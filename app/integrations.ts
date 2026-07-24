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
  // Slack incoming webhooks use `text`; Teams accepts a message envelope; the
  // calendar adapter keeps a neutral event shape for Zapier/Make/internal APIs.
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
  // "Not configured" is distinct from provider failure and is surfaced to the
  // producer so demo mode never masquerades as a successful delivery.
  if (!endpoint) return { configured: false, delivered: false };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody(payload)),
  });
  return { configured: true, delivered: response.ok };
}

export async function dispatchCrmLead(payload: Record<string, unknown>) {
  const endpoint = process.env.CRM_WEBHOOK_URL;
  const provider = (process.env.CRM_PROVIDER || "generic").toLowerCase();
  if (!endpoint) return { configured: false, delivered: false, provider };

  // These are intentionally lightweight adapters. Installations that require
  // complex field IDs can place a normalization webhook behind the same URL.
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
      // Some incoming webhooks authenticate in the URL; API-style providers can
      // opt into a bearer token without changing the lead route.
      ...(process.env.CRM_AUTH_TOKEN
        ? { authorization: `Bearer ${process.env.CRM_AUTH_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(body),
  });
  return { configured: true, delivered: response.ok, provider };
}
