# API reference

All request and response bodies use JSON unless otherwise noted.

## Public endpoints

### `POST /api/livekit-token`

Creates a short-lived attendee token.

```json
{
  "identity": "Alex Morgan",
  "room": "global-innovation-stage"
}
```

Allowed rooms are `global-innovation-stage`, `global-innovation-studio`, and
`global-innovation-lounge`. Successful responses include `token` and
`serverUrl`. Missing service credentials return `503`.

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

### `GET /api/producer/room?room=<room-name>`

Lists current LiveKit participants and their audio state.

### `POST /api/producer/room`

Supported actions:

```json
{ "action": "mute", "room": "global-innovation-stage", "identity": "user-id", "trackSid": "TR_..." }
```

```json
{ "action": "remove", "room": "global-innovation-stage", "identity": "user-id" }
```

```json
{ "action": "rescue", "room": "global-innovation-stage" }
```

### `GET /api/producer/operations`

Returns:

- `runOfShow`: ordered persistent show items.
- `activity`: newest audit events.
- `incidents`: newest operational incidents.

When an event has no run-of-show rows, the endpoint seeds the default program.

### `POST /api/producer/operations`

Advance a run-of-show item:

```json
{ "action": "set-run-status", "itemId": 3, "status": "live" }
```

Record an operator note:

```json
{ "action": "record-event", "message": "Speaker rejoined", "target": "Main Stage" }
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

## Error conventions

| Status | Meaning |
| --- | --- |
| `400` | Invalid JSON, fields, room, action, or status |
| `401` | Missing, invalid, or expired Supabase session |
| `403` | Valid attendee account without producer access |
| `404` | Requested persistent record does not exist |
| `502` | Configured external provider failed |
| `503` | Required service or binding is not configured/available |

