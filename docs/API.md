# API reference

All request and response bodies use JSON unless otherwise noted.

## Public endpoints

### `POST /api/livekit-token`

Creates a short-lived attendee token.

```json
{
  "displayName": "Ava Morgan",
  "room": "velocity-venue-stage"
}
```

Allowed rooms are `velocity-venue-stage`, `velocity-venue-studio`,
`velocity-venue-expo`, and `velocity-venue-lounge`. The server creates a unique
participant identity so duplicate display names do not collide. Successful responses include `token` and
`serverUrl`. Missing service credentials return `503`.

### `POST /api/agora-token`

Creates a one-hour Agora publisher token for an allowlisted venue channel. The
server generates the numeric UID to prevent deliberate attendee collisions.

```json
{ "channelName": "velocity-venue-stage" }
```

Successful responses include `token`, `appId`, `channelName`, and `uid` and are
marked `no-store`. Invalid rooms return `400`; missing Agora credentials return
`503`.

### `POST /api/translation`

Forwards up to 2,000 characters of finalized caption text to the explicitly
configured translation service. Supported target languages are `es`, `fr`,
`de`, and `ja`. The endpoint returns `503` when no provider is configured and
never manufactures translated text, confidence scores, or provider names.

### `GET /api/venue`

Returns current LiveKit participant totals for all venue rooms, the persisted
agenda, recent producer announcements, and explicit media/schedule availability.
It never returns Demo-mode samples.

### `POST /api/livekit-webhook`

Receives LiveKit room, participant, track, and Egress webhooks. Requests must
carry a valid LiveKit signature. Delivery is idempotent using the provider event
id; retries return success without creating duplicate telemetry.

### `POST /api/transcript-ingest`

Allows an approved transcription agent to persist finalized caption segments.
It uses a dedicated bearer credential (`TRANSCRIPT_INGEST_TOKEN`), accepts only
allowlisted venue rooms, ignores partial hypotheses, and limits each request to
500 segments.

### `POST /api/leads`

Persists expo interest and optionally forwards it to a CRM adapter.

Required fields: `name`, `email`, `event`, and `booth`.

The response reports:

- `persisted`: the lead was written to D1.
- `routed`: the CRM accepted the request.
- `provider`: `generic`, `hubspot`, or `salesforce`.
- `mode`: `connected` when a CRM endpoint is configured, otherwise `demo`.

## Authenticated endpoints

Protected routes require:

```http
Authorization: Bearer <supabase-access-token>
```

The account must have `app_metadata.role` equal to `producer` or `admin`, or its
email must appear in `PRODUCER_EMAILS`.

### `GET /api/auth/me`

Returns the verified user profile and effective role.

### `GET /api/support`

Returns support requests created by the signed-in attendee.

### `POST /api/support`

Creates a persisted producer support ticket using the verified account identity:

```json
{ "room": "velocity-venue-stage", "issue": "My microphone is not detected." }
```

### `GET /api/experience`

Returns published polls and Q&A, vote totals, replays, transcript segments,
sponsor booths, and—when signed in—the attendee's private networking profile,
matches, and outgoing connection requests.

### `POST /api/experience`

Authenticated attendee actions include `save-profile`, `ask-question`, `vote`,
`answer-poll`, `reaction`, `raise-hand`, `request-connection`, and
`sponsor-interest`. Sponsor sharing requires `consent: true`.

### `GET /api/producer/room?room=<room-name>`

Lists current LiveKit participants and their audio state.

### `POST /api/producer/room`

Supported actions:

```json
{ "action": "mute", "room": "velocity-venue-stage", "identity": "user-id", "trackSid": "TR_..." }
```

```json
{ "action": "remove", "room": "velocity-venue-stage", "identity": "user-id" }
```

```json
{ "action": "rescue", "room": "velocity-venue-stage" }
```

### `GET /api/producer/operations`

Returns:

- `runOfShow`: ordered persistent show items.
- `activity`: newest audit events.
- `incidents`: newest operational incidents.
- `supportTickets`: persisted attendee support requests.

An event with no schedule returns an empty array; it does not seed sample data.

### `POST /api/producer/operations`

Advance a run-of-show item:

```json
{ "action": "set-run-status", "itemId": 3, "status": "live" }
```

Record an operator note:

```json
{ "action": "record-event", "message": "Speaker rejoined", "target": "Main Stage" }
```

Create an agenda item, publish an attendee announcement, or update a ticket:

```json
{ "action": "add-run-item", "scheduledTime": "10:30", "title": "Keynote", "owner": "Host" }
```

```json
{ "action": "announce", "message": "The keynote begins in five minutes." }
```

```json
{ "action": "update-support", "ticketId": 12, "status": "resolved" }
```

### `POST /api/producer/integrations`

Dispatches an authenticated operational message.

```json
{
  "channel": "slack",
  "message": "Main Stage is live",
  "roomName": "Main Stage",
  "startsAt": "2026-07-31T11:00:00Z",
  "endsAt": "2026-07-31T12:00:00Z"
}
```

`channel` may be `calendar`, `slack`, or `teams`.

### `GET /api/producer/intelligence`

Returns webhook-derived attendance history, engagement totals, open moderator
items, sponsor opt-ins, transcript coverage, Egress jobs, replay assets, and
rule-based producer recommendations.

### `POST /api/producer/intelligence`

Producer actions include:

- `create-poll` and `close-item`
- `start-recording` and `stop-recording`
- `publish-replay`
- `import-transcript` and `generate-memory`
- `publish-sponsor`

Recording starts a LiveKit room-composite Egress and uses the configured
S3-compatible and/or RTMP destinations. Conference memory uses the configured
private generation endpoint when present, otherwise it produces a local
extractive summary without transferring transcript text.

## Error conventions

| Status | Meaning |
| --- | --- |
| `400` | Invalid JSON, fields, room, action, or status |
| `401` | Missing, invalid, or expired Supabase session |
| `403` | Valid attendee account without producer access |
| `404` | Requested persistent record does not exist |
| `502` | Configured external provider failed |
| `503` | Required service or binding is not configured/available |
