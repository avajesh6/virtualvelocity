# Deployment guide

## Current target

The test-submission deployment uses:

`https://virtualvelocity.avajesh6.workers.dev`

Connecting a custom domain is intentionally the final post-submission TODO.

## Prerequisites

- Node.js 22.13 or newer
- A Cloudflare account authenticated through Wrangler
- A D1 database bound as `DB`
- A LiveKit project
- A Supabase project with email/password authentication enabled

## Environment variables

| Key | Required | Secret | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_LIVEKIT_URL` | Yes for live media | No | LiveKit websocket URL |
| `LIVEKIT_API_KEY` | Yes for live media | Yes | Server token and room administration |
| `LIVEKIT_API_SECRET` | Yes for live media | Yes | Server token and room administration |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes for sign-in | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes for sign-in | No | Browser/server token validation |
| `PRODUCER_EMAILS` | Optional | Yes | Comma-separated producer allowlist |
| `CRM_WEBHOOK_URL` | Optional | Yes | CRM ingestion endpoint |
| `CRM_PROVIDER` | Optional | No | `generic`, `hubspot`, or `salesforce` |
| `CRM_AUTH_TOKEN` | Optional | Yes | CRM bearer token |
| `CALENDAR_WEBHOOK_URL` | Optional | Yes | Calendar adapter endpoint |
| `SLACK_WEBHOOK_URL` | Optional | Yes | Slack incoming webhook |
| `TEAMS_WEBHOOK_URL` | Optional | Yes | Teams webhook endpoint |

Never commit real secret values. `.env.example` documents names only.

## Database migration

Generate schema changes:

```powershell
npm.cmd run db:generate
```

Inspect the generated SQL before applying it. Apply only migrations that are
not already present in the target database.

Example:

```powershell
npx.cmd wrangler d1 execute velocity-venue-db --remote --file drizzle/0001_messy_vector.sql --config dist/server/wrangler.json
```

## Validation

```powershell
npm.cmd test
npm.cmd run lint
```

After starting a local or production target:

```powershell
$env:TEST_BASE_URL="http://localhost:3000"
npm.cmd run test:live
```

The live suite checks page availability, invalid/unauthorized failure paths, and
a representative concurrent request burst.

## Deploy

```powershell
npm.cmd run deploy:cloudflare
```

After deployment, run the live suite against the returned Workers URL and
inspect the rendered attendee page for console and accessibility errors.

## Rollback

Use Cloudflare Workers deployment history to restore the preceding known-good
version. Database migrations should remain backward compatible; do not remove
columns or tables as part of an emergency Worker rollback.

