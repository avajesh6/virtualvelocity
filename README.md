# Velocity Venue + Command

A working product concept for Virtual Velocity: a branded virtual-event venue for attendees paired with a live producer command center.

## What is included

- Attendee venue with lobby, main stage, studio, expo, and networking spaces
- Producer dashboard with room health, run of show, speaker cues, and support queue
- Rescue Mode simulation for moving a disrupted session to a backup room
- Expo lead capture persisted to Cloudflare D1, with an optional CRM webhook
- Secure server-side LiveKit token endpoint; API credentials never reach the browser
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
```

`CRM_WEBHOOK_URL` is optional and can point to HubSpot, Salesforce, Zapier, Make, or an internal event-ingestion endpoint. In a hosted environment, bind a D1 database as `DB` and apply the migration in `drizzle/0000_sloppy_vapor.sql`.

## Verification

```bash
npm run build
node --test tests/rendered-html.test.mjs
```

## Suggested next production increments

1. Connect the room UI to LiveKit and add device preflight/reconnect handling.
2. Add producer authentication and role-based permissions.
3. Persist incidents, audit events, and run-of-show edits to D1.
4. Add calendar, Slack/Teams, and CRM-specific adapters behind the webhook interface.
5. Add load, browser, accessibility, and failure-recovery tests.
