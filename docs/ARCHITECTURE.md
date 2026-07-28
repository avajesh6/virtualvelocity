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
  |-- LiveKit and Agora token APIs
  |-- LiveKit Webhook and Egress APIs
  |-- Cloudflare D1
  `-- DeepL / Calendar / Slack / Teams / CRM / optional memory and translation webhooks
```

## Application boundaries

| Area | Location | Responsibility |
| --- | --- | --- |
| Attendee and producer UI | `app/conference-experience.tsx` | Interactive venue and command-center state |
| Product documentation | `app/docs/page.tsx` | Operator and evaluator help inside the deployed app |
| Authentication | `app/producer-auth.ts` | Supabase token verification and producer authorization |
| LiveKit token API | `app/api/livekit-token/route.ts` | Short-lived attendee room grants |
| Agora token API | `app/api/agora-token/route.ts` | Allowlisted one-hour alternative media grants |
| Translation API | `app/api/translation/route.ts` | Server-side DeepL translation with a validated private-webhook fallback |
| Producer room API | `app/api/producer/room/route.ts` | Participant listing, mute, removal, and Rescue Mode |
| Venue API | `app/api/venue/route.ts` | Public real-time room totals, agenda, and announcements |
| Support API | `app/api/support/route.ts` | Authenticated attendee support requests |
| Operational API | `app/api/producer/operations/route.ts` | Run-of-show, announcements, tickets, and audit history |
| Integration API | `app/api/producer/integrations/route.ts` | Authenticated calendar and messaging dispatch |
| Lead API | `app/api/leads/route.ts` | D1 lead persistence and CRM dispatch |
| Experience API | `app/api/experience/route.ts` | Profiles, polls, Q&A, networking, sponsor consent, transcripts, and replay discovery |
| Intelligence API | `app/api/producer/intelligence/route.ts` | Producer telemetry, moderation, recording, streaming, replays, and conference memory |
| LiveKit webhook | `app/api/livekit-webhook/route.ts` | Signed, idempotent room/participant/track/Egress event ingestion |
| Persistence | `db/` and `drizzle/` | D1 schema and migrations |
| Worker entry point | `worker/index.ts` | Asset/image routing and app dispatch |

## Trust boundaries

1. The browser never receives LiveKit/Agora signing secrets, integration credentials, or webhook URLs.
2. Producer UI state is not authorization. Every producer endpoint validates a Supabase bearer token and checks the role server-side.
3. LiveKit room names are allowlisted. A client cannot mint a token for an arbitrary room.
4. D1 is the source of truth for operational data. Live mode never falls back to sample records.
5. Integration results distinguish unconfigured, failed, and delivered states.
6. Demo mode is explicit, browser-local, and does not invoke live mutation endpoints.
7. Networking is opt-in, sponsor sharing requires affirmative consent, and
   transcript text leaves the application only when an operator configures the
   optional private memory-generation endpoint.

## Event intelligence flow

1. LiveKit signs and sends room, participant, track, and Egress events to the webhook endpoint.
2. The Worker verifies the signature and stores an idempotent telemetry record in D1.
3. The control tower derives attendance, engagement, recording, and operational recommendations from persisted records.
4. Producers can publish polls, moderate Q&A, start Egress, publish replay URLs, and generate conference memory.
5. Attendees see only real persisted records in Live mode; empty systems render explicit empty states.

## Failure model

- Missing LiveKit credentials return an unavailable status or `503`; Live mode shows no fabricated participants.
- Missing D1 bindings leave attendee lead capture and LiveKit control usable where possible, while persistence endpoints report `503`.
- Missing webhook configuration reports `configured: false`; the interface never claims delivery.
- Rescue Mode treats LiveKit movement as authoritative. Audit persistence is attempted independently so a temporary database issue cannot block participant recovery.

## Data flow: Rescue Mode

1. An authorized producer calls `POST /api/producer/room` with `action: "rescue"`.
2. The server inserts an active incident when D1 is available.
3. LiveKit creates a backup room and moves source-room participants.
4. The incident is resolved with participant count and recovery duration.
5. An audit event records the actor, source room, destination, and moved count.
6. The UI reports the actual recovery result. A simulated recovery is available only in explicit Demo mode.
