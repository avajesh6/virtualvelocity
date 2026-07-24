# Velocity Venue architecture

## Purpose

Velocity Venue is a two-sided virtual-event application:

- The attendee venue provides navigation, LiveKit conferencing, chat, device controls, networking prompts, and expo lead capture.
- The producer command center provides authenticated room administration, run-of-show control, integration dispatch, incident recovery, and an operational audit trail.

The application is deployed as a Cloudflare Worker at
`https://virtualvelocity.avajesh6.workers.dev`.

## Runtime topology

```text
Browser
  |
  | HTTPS / React Server Components / API requests
  v
Cloudflare Worker (vinext)
  |-- Static assets
  |-- Supabase token verification
  |-- LiveKit token and RoomService APIs
  |-- Cloudflare D1
  `-- Calendar / Slack / Teams / CRM webhooks
```

## Application boundaries

| Area | Location | Responsibility |
| --- | --- | --- |
| Attendee and producer UI | `app/conference-experience.tsx` | Interactive venue and command-center state |
| Product documentation | `app/docs/page.tsx` | Operator and evaluator help inside the deployed app |
| Authentication | `app/producer-auth.ts` | Supabase token verification and producer authorization |
| LiveKit token API | `app/api/livekit-token/route.ts` | Short-lived attendee room grants |
| Producer room API | `app/api/producer/room/route.ts` | Participant listing, mute, removal, and Rescue Mode |
| Operational API | `app/api/producer/operations/route.ts` | Run-of-show state and audit history |
| Integration API | `app/api/producer/integrations/route.ts` | Authenticated calendar and messaging dispatch |
| Lead API | `app/api/leads/route.ts` | D1 lead persistence and CRM dispatch |
| Persistence | `db/` and `drizzle/` | D1 schema and migrations |
| Worker entry point | `worker/index.ts` | Asset/image routing and app dispatch |

## Trust boundaries

1. The browser never receives LiveKit API secrets, CRM credentials, or webhook URLs.
2. Producer UI state is not authorization. Every producer endpoint validates a Supabase bearer token and checks the role server-side.
3. LiveKit room names are allowlisted. A client cannot mint a token for an arbitrary room.
4. D1 is the source of truth for operational data. Client state is used only for immediate feedback and demo fallback behavior.
5. Integration results distinguish unconfigured, failed, and delivered states.

## Failure model

- Missing LiveKit credentials return `503` with a demo-mode explanation.
- Missing D1 bindings leave attendee lead capture and LiveKit control usable where possible, while persistence endpoints report `503`.
- Missing webhook configuration reports `configured: false`; the interface never claims delivery.
- Rescue Mode treats LiveKit movement as authoritative. Audit persistence is attempted independently so a temporary database issue cannot block participant recovery.

## Data flow: Rescue Mode

1. An authorized producer calls `POST /api/producer/room` with `action: "rescue"`.
2. The server inserts an active incident when D1 is available.
3. LiveKit creates a backup room and moves source-room participants.
4. The incident is resolved with participant count and recovery duration.
5. An audit event records the actor, source room, destination, and moved count.
6. The UI reports a live recovery or a clearly labelled demo recovery.

