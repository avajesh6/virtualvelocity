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
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(`${page}${layout}`, /codex-preview|SkeletonPreview/);
});

test("keeps third-party credentials server-side", async () => {
  const [client, tokenRoute, envExample] = await Promise.all([
    readFile(new URL("app/conference-experience.tsx", root), "utf8"),
    readFile(new URL("app/api/livekit-token/route.ts", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.doesNotMatch(client, /LIVEKIT_API_SECRET|CRM_WEBHOOK_URL/);
  assert.match(tokenRoute, /LIVEKIT_API_SECRET/);
  assert.match(envExample, /LIVEKIT_API_KEY=/);
  assert.match(envExample, /CRM_WEBHOOK_URL=/);
});

test("defines durable lead and incident records", async () => {
  const [schema, hosting] = await Promise.all([
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
  ]);
  assert.match(schema, /sqliteTable\("leads"/);
  assert.match(schema, /sqliteTable\("incidents"/);
  assert.equal(JSON.parse(hosting).d1, "DB");
});
