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
  assert.match(tokenRoute, /global-innovation-/);
  assert.match(envExample, /LIVEKIT_API_KEY=/);
  assert.match(envExample, /CRM_WEBHOOK_URL=/);
  assert.match(producerRoute, /authorizeProducerRequest/);
  assert.match(producerRoute, /moveParticipant/);
  assert.match(producerRoute, /mutePublishedTrack/);
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
  assert.match(operationsRoute, /authorizeProducerRequest/);
  assert.match(operationsRoute, /set-run-status/);
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
