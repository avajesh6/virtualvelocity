import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the two-sided Velocity Venue experience", async () => {
  const [page, experience, layout] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/conference-experience.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);
  assert.match(page, /ConferenceExperience/);
  assert.match(experience, /AttendeeView/);
  assert.match(experience, /ProducerView/);
  assert.match(experience, /Rescue Mode/);
  assert.match(experience, /api\/leads/);
  assert.match(experience, /LiveKitRoom/);
  assert.match(experience, /VideoConference/);
  assert.match(experience, /PreJoin/);
  assert.match(experience, /persistUserChoices=\{false\}/);
  assert.match(experience, /useConnectionState/);
  assert.match(experience, /useParticipants/);
  assert.match(experience, /velocity-theme/);
  assert.match(experience, /Conference invite copied/);
  assert.match(experience, /Notifications marked as read/);
  assert.match(experience, /Demo connection request sent/);
  assert.match(experience, /sendChatMessage/);
  assert.match(experience, /velocity-mode/);
  assert.match(experience, /mode === "demo"/);
  assert.match(experience, /No simulated recovery was shown/);
  assert.match(experience, /producer-run-show/);
  assert.match(experience, /Refresh room monitor/);
  assert.match(experience, /View full log/);
  assert.match(experience, /signInWithOAuth/);
  assert.match(experience, /Continue with Google/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(`${page}${layout}`, /codex-preview|SkeletonPreview/);
});

test("keeps third-party credentials server-side", async () => {
  const [client, tokenRoute, producerRoute, envExample] = await Promise.all([
    readFile(new URL("app/conference-experience.tsx", root), "utf8"),
    readFile(new URL("app/api/livekit-token/route.ts", root), "utf8"),
    readFile(new URL("app/api/producer/room/route.ts", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.doesNotMatch(client, /LIVEKIT_API_SECRET|CRM_WEBHOOK_URL/);
  assert.match(tokenRoute, /LIVEKIT_API_SECRET/);
  assert.match(tokenRoute, /cache-control/);
  assert.match(tokenRoute, /isVenueRoomName/);
  assert.match(tokenRoute, /crypto\.randomUUID/);
  assert.match(envExample, /LIVEKIT_API_KEY=/);
  assert.match(envExample, /CRM_WEBHOOK_URL=/);
  assert.match(producerRoute, /authorizeProducerRequest/);
  assert.match(producerRoute, /moveParticipant/);
  assert.match(producerRoute, /mutePublishedTrack/);
  assert.match(producerRoute, /requested room does not exist/);
  assert.match(producerRoute, /participants: \[\]/);
  assert.match(envExample, /PRODUCER_EMAILS=/);
});

test("defines durable lead and incident records", async () => {
  const [schema, hosting, operationsRoute] = await Promise.all([
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
    readFile(new URL("app/api/producer/operations/route.ts", root), "utf8"),
  ]);
  assert.match(schema, /sqliteTable\("leads"/);
  assert.match(schema, /sqliteTable\("incidents"/);
  assert.match(schema, /sqliteTable\("audit_events"/);
  assert.match(schema, /sqliteTable\("run_of_show_items"/);
  assert.match(schema, /sqliteTable\("support_tickets"/);
  assert.match(operationsRoute, /authorizeProducerRequest/);
  assert.match(operationsRoute, /set-run-status/);
  assert.match(operationsRoute, /update-support/);
  assert.equal(JSON.parse(hosting).d1, "DB");
});

test("provides calendar, team messaging, and CRM adapters", async () => {
  const [integrations, producerIntegrationRoute, leadsRoute, envExample] = await Promise.all([
    readFile(new URL("app/integrations.ts", root), "utf8"),
    readFile(new URL("app/api/producer/integrations/route.ts", root), "utf8"),
    readFile(new URL("app/api/leads/route.ts", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.match(integrations, /CALENDAR_WEBHOOK_URL/);
  assert.match(integrations, /SLACK_WEBHOOK_URL/);
  assert.match(integrations, /TEAMS_WEBHOOK_URL/);
  assert.match(integrations, /hubspot/);
  assert.match(integrations, /salesforce/);
  assert.match(producerIntegrationRoute, /authorizeProducerRequest/);
  assert.match(leadsRoute, /dispatchCrmLead/);
  assert.match(envExample, /CRM_PROVIDER=/);
});

test("ships operator and maintainer documentation", async () => {
  const [productDocs, readme, architecture, api, deployment, operations] = await Promise.all([
    readFile(new URL("app/docs/page.tsx", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("docs/ARCHITECTURE.md", root), "utf8"),
    readFile(new URL("docs/API.md", root), "utf8"),
    readFile(new URL("docs/DEPLOYMENT.md", root), "utf8"),
    readFile(new URL("docs/OPERATIONS.md", root), "utf8"),
  ]);
  assert.match(productDocs, /Operate the venue with confidence/);
  assert.match(productDocs, /Failure and recovery/);
  assert.match(readme, /Documentation/);
  assert.match(architecture, /Trust boundaries/);
  assert.match(api, /Error conventions/);
  assert.match(deployment, /Rollback/);
  assert.match(operations, /Rescue Mode/);
});

test("ships the attendee engagement and conference memory layer", async () => {
  const [hub, experienceRoute, schema] = await Promise.all([
    readFile(new URL("app/event-experience-hub.tsx", root), "utf8"),
    readFile(new URL("app/api/experience/route.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
  ]);
  assert.match(hub, /Polls & Q&amp;A/);
  assert.match(hub, /Opt-in networking profile/);
  assert.match(hub, /Search event transcript/);
  assert.match(hub, /Reduced-data mode/);
  assert.match(experienceRoute, /authenticateRequest/);
  assert.match(experienceRoute, /sponsor-interest/);
  assert.match(experienceRoute, /raise-hand/);
  assert.match(schema, /sqliteTable\("attendee_profiles"/);
  assert.match(schema, /sqliteTable\("engagement_items"/);
  assert.match(schema, /sqliteTable\("transcript_segments"/);
  assert.match(schema, /sqliteTable\("sponsor_booths"/);
});

test("ships verified telemetry, recording, streaming, and producer intelligence", async () => {
  const [webhook, transcriptIngest, route, center, envExample] = await Promise.all([
    readFile(new URL("app/api/livekit-webhook/route.ts", root), "utf8"),
    readFile(new URL("app/api/transcript-ingest/route.ts", root), "utf8"),
    readFile(new URL("app/api/producer/intelligence/route.ts", root), "utf8"),
    readFile(new URL("app/producer-intelligence-center.tsx", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.match(webhook, /WebhookReceiver/);
  assert.match(webhook, /externalId/);
  assert.match(transcriptIngest, /TRANSCRIPT_INGEST_TOKEN/);
  assert.match(transcriptIngest, /finalized transcript segments/);
  assert.match(route, /startRoomCompositeEgress/);
  assert.match(route, /StreamProtocol\.RTMP/);
  assert.match(route, /generate-memory/);
  assert.match(center, /VENUE INTELLIGENCE/);
  assert.match(center, /Producer copilot/);
  assert.match(envExample, /RECORDING_S3_BUCKET=/);
  assert.match(envExample, /LIVEKIT_RTMP_URLS=/);
});
