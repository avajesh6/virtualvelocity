import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

test("serves the attendee experience", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Global Innovation Summit/);
});

test("rejects invalid and unauthorized API requests safely", async () => {
  const [token, operations, integrations, lead] = await Promise.all([
    fetch(`${baseUrl}/api/livekit-token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identity: "", room: "not-a-room" }),
    }),
    fetch(`${baseUrl}/api/producer/operations`),
    fetch(`${baseUrl}/api/producer/integrations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: "slack", message: "test" }),
    }),
    fetch(`${baseUrl}/api/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Incomplete" }),
    }),
  ]);
  assert.equal(token.status, 400);
  assert.equal(operations.status, 401);
  assert.equal(integrations.status, 401);
  assert.equal(lead.status, 400);
});

test("handles a representative concurrent page burst", async () => {
  const startedAt = performance.now();
  const responses = await Promise.all(
    Array.from({ length: 25 }, () => fetch(baseUrl, { headers: { "cache-control": "no-cache" } })),
  );
  const elapsedMs = performance.now() - startedAt;
  assert.ok(responses.every((response) => response.status === 200));
  assert.ok(elapsedMs < 10_000, `25 concurrent requests took ${Math.round(elapsedMs)}ms`);
});
