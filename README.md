# Velocity Venue + Command

A branded virtual-event venue for attendees paired with a live producer command center.

## What is included

- Attendee venue with lobby, main stage, studio, expo, and networking spaces
- Producer dashboard with room health, run of show, speaker cues, and support queue
- Rescue Mode simulation for moving a disrupted session to a backup room
- Expo lead capture persisted to Cloudflare D1, with an optional CRM webhook
- Secure server-side LiveKit token endpoint and a real LiveKit conference room with device controls, screen sharing, chat, and reconnection handling; API credentials never reach the browser
- Responsive, accessible UI and a generated Open Graph social card

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The experience runs in demo mode without external credentials. Lead capture still returns a successful demo response; LiveKit reports that configuration is required.

## Connect services

Copy `.env.example` to `.env.local` and provide:

```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
CRM_WEBHOOK_URL=
CRM_PROVIDER=generic
CRM_AUTH_TOKEN=
CALENDAR_WEBHOOK_URL=
SLACK_WEBHOOK_URL=
TEAMS_WEBHOOK_URL=
PRODUCER_EMAILS=producer@example.com
```

`CRM_WEBHOOK_URL` is optional and can point to HubSpot, Salesforce, Zapier, Make, or an internal event-ingestion endpoint. Set `CRM_PROVIDER` to `hubspot`, `salesforce`, or `generic`. Calendar, Slack, and Teams adapters use their corresponding webhook URLs. In a hosted environment, bind a D1 database as `DB` and apply the migrations in `drizzle/`.

Producer mode uses Supabase email/password sign-in. Grant producer access with Supabase `app_metadata.role` (`producer` or `admin`) or the optional comma-separated `PRODUCER_EMAILS` allowlist.

## Verification

```bash
npm run build
node --test tests/rendered-html.test.mjs
set TEST_BASE_URL=http://localhost:3000 && npm run test:live
```

The live HTTP suite checks failure handling and a 25-request concurrent smoke load against a running preview or deployed URL.

## Production status

- Producer authentication and role-based permissions: complete
- LiveKit room administration and Rescue Mode: complete
- D1-backed incidents, audit events, and run-of-show state: complete
- Calendar, Slack/Teams, and HubSpot/Salesforce/generic CRM adapters: complete
- Source, build, route contract, failure-path, responsive accessibility, and smoke-load checks: complete

## Remaining production hardening

1. Configure and smoke-test the production Supabase, LiveKit, D1, calendar, messaging, and CRM credentials.
2. Run representative load, cross-browser, screen-reader, and provider failure drills in the production environment.
3. TODO (final): connect the preferred custom domain after the Worker-hosted test submission is accepted.
