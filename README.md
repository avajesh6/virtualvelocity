# Velocity Venue + Command

A branded virtual-event venue for attendees paired with a live producer command center.

## What is included

- Attendee venue with lobby, main stage, studio, expo, and networking spaces
- Producer dashboard with real room counts, run-of-show control, announcements, audit history, and a persisted support queue
- Live Rescue Mode for moving a disrupted session to a backup room
- Explicit Demo mode for evaluating sample workflows without affecting live participants or records
- Secure server-side LiveKit and Agora token endpoints with selectable real media rooms, device controls, remote subscriptions, and connection cleanup; API credentials never reach the browser
- Camera and microphone preview with device selection before joining
- Responsive participant layout, live participant/connection status, and shareable room links
- Persistent light and dark appearance modes
- Live polls, ranked Q&A, reactions, hand raising, and a producer moderator queue
- Consent-based attendee profiles, interest matching, connection requests, and sponsor lead sharing
- LiveKit webhook telemetry, operational recommendations, room recording, RTMP streaming, and replay publishing
- Live captions from LiveKit transcription streams plus searchable transcript memory, summaries, and chapters
- Accessibility preferences including caption language, reduced-data mode, reduced motion, keyboard navigation, and responsive layouts
- Responsive, accessible UI and a generated Open Graph social card

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Live mode is the default. It never substitutes sample values when a service is
empty or unavailable. Use the clearly labelled **Demo** switch to explore sample
attendees, schedules, chat, recovery, tickets, media controls, and expo lead capture without
affecting real systems.

## Demo walkthrough

Demo mode is a browser-local product tour; it does not request camera or microphone
permission, issue media tokens, persist records, or call CRM and messaging adapters.

1. Select **Demo**, open Main Stage, and exercise the simulated microphone, camera,
   captions, screen-share, and leave controls.
2. Use **Polls & Q&A** to vote and submit a question. In **Networking**, edit the
   opt-in profile, accept a sample request, schedule an introduction, and download
   its `.ics` file. The facilitated networking timer demonstrates prompts and
   pacing only; it never starts a call. Search and export the sample conference memory.
3. Select **Producer demo** without signing in. Exercise Rescue Mode, run-of-show,
   support, recording, poll, transcript, replay, sponsor, and memory controls.
4. Switch to **Live**. Demo surfaces close and protected producer operations again
   require an authorized account.

The persistent header label must read **DEMO DATA · NO LIVE IMPACT** throughout the
tour. Switching modes resets demo-only state.

## Connect services

Copy `.env.example` to `.env.local` and provide:

```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
DEEPL_API_KEY=
TRANSLATION_WEBHOOK_URL=
TRANSLATION_WEBHOOK_TOKEN=
TRANSLATION_PROVIDER_NAME=
CRM_WEBHOOK_URL=
CRM_PROVIDER=generic
CRM_AUTH_TOKEN=
CALENDAR_WEBHOOK_URL=
SLACK_WEBHOOK_URL=
TEAMS_WEBHOOK_URL=
RECORDING_S3_ACCESS_KEY=
RECORDING_S3_SECRET=
RECORDING_S3_BUCKET=
RECORDING_S3_ENDPOINT=
LIVEKIT_RTMP_URLS=
MEMORY_GENERATION_WEBHOOK_URL=
MEMORY_GENERATION_WEBHOOK_TOKEN=
TRANSCRIPT_INGEST_TOKEN=
PRODUCER_EMAILS=producer@example.com
```

`CRM_WEBHOOK_URL` is optional and can point to HubSpot, Salesforce, Zapier, Make, or an internal event-ingestion endpoint. Set `CRM_PROVIDER` to `hubspot`, `salesforce`, or `generic`. Calendar, Slack, and Teams adapters use their corresponding webhook URLs. In a hosted environment, bind a D1 database as `DB` and apply the migrations in `drizzle/`.

For historical event intelligence, configure the LiveKit project webhook as
`https://<your-host>/api/livekit-webhook`. Recording requires an S3-compatible
destination and/or `LIVEKIT_RTMP_URLS`. Conference memory works without an AI
provider by using a deterministic extractive summary; configure the optional
private memory webhook only when transcript processing has been approved.

Agora is an optional alternative media provider. Its token endpoint accepts only
the four configured venue rooms and returns an explicit `503` until both Agora
credentials are set. Agora supplies audio/video media; room chat, screen sharing,
and LiveKit captions require the LiveKit provider. Real-time caption translation uses
the server-side DeepL integration when `DEEPL_API_KEY` is configured, with the approved
translation webhook retained as an optional fallback. Untranslated text is never presented
as translated output.

Producer mode uses Supabase Google OAuth or email/password sign-in. Google must be enabled in the Supabase provider settings as described in the deployment guide. Grant producer access separately with Supabase `app_metadata.role` (`producer` or `admin`) or the optional comma-separated `PRODUCER_EMAILS` allowlist.

## Verification

```bash
npm run build
node --test tests/rendered-html.test.mjs
set TEST_BASE_URL=http://localhost:3000 && npm run test:live
```

The live HTTP suite checks failure handling and a 25-request concurrent smoke load against a running preview or deployed URL.

## Documentation

- [Project and technical brief for Cris](docs/CRIS_PROJECT_BRIEF.md) — submission overview, full stack, architecture, security, validation, and demo walkthrough
- [Architecture](docs/ARCHITECTURE.md) — components, trust boundaries, data flow, and failure model
- [API reference](docs/API.md) — public and producer endpoints, payloads, and errors
- [Deployment guide](docs/DEPLOYMENT.md) — environment, migrations, validation, deployment, and rollback
- [Operations runbook](docs/OPERATIONS.md) — rehearsal, live-event, rescue, troubleshooting, and post-event procedures

The deployed application also includes a user-facing guide at `/docs`, available from the attendee Help navigation.

## Production status

- Producer authentication and role-based permissions: complete
- LiveKit room administration and Rescue Mode: complete
- D1-backed incidents, audit events, and run-of-show state: complete
- D1-backed attendee support requests and producer ticket lifecycle: complete
- Explicit, isolated Live and Demo data modes: complete
- Calendar, Slack/Teams, and HubSpot/Salesforce/generic CRM adapters: complete
- Polls, Q&A, reactions, hand raising, networking, sponsor consent, captions, transcript search, replay publishing, and event intelligence: complete
- LiveKit webhook ingestion and producer-controlled Egress recording/streaming: complete; provider destinations must be configured per deployment
- Source, build, route contract, failure-path, responsive accessibility, and smoke-load checks: complete

## Remaining production hardening

1. Configure and smoke-test the production Supabase, LiveKit, D1, calendar, messaging, and CRM credentials.
2. Run representative load, cross-browser, screen-reader, and provider failure drills in the production environment.
3. TODO (final): connect the preferred custom domain after the Worker-hosted test submission is accepted.

Until that final domain task is completed, the supported production URL is
`https://virtualvelocity.avajesh6.workers.dev`.
