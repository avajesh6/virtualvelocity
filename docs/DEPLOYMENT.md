# Deployment guide

## Current target

The production deployment uses:

`https://virtualvelocity.avajesh6.workers.dev`

Connecting a custom domain remains the final launch TODO.

## Prerequisites

- Node.js 22.13 or newer
- A Cloudflare account authenticated through Wrangler
- A D1 database bound as `DB`
- A LiveKit project
- A Supabase project with email/password authentication enabled
- For Google sign-in, a Google Cloud OAuth web client connected to the Supabase Google provider

## Environment variables

| Key | Required | Secret | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_LIVEKIT_URL` | Yes for live media | No | LiveKit websocket URL |
| `LIVEKIT_API_KEY` | Yes for live media | Yes | Server token and room administration |
| `LIVEKIT_API_SECRET` | Yes for live media | Yes | Server token and room administration |
| `AGORA_APP_ID` | Agora media | No | Alternative Agora project identifier |
| `AGORA_APP_CERTIFICATE` | Agora media | Yes | Server-only Agora token signing secret |
| `DEEPL_API_KEY` | Translation | Yes | Preferred direct DeepL API credential; never exposed to clients |
| `TRANSLATION_WEBHOOK_URL` | Optional fallback | Yes | Approved non-DeepL translation adapter |
| `TRANSLATION_WEBHOOK_TOKEN` | Optional fallback | Yes | Translation adapter bearer token |
| `TRANSLATION_PROVIDER_NAME` | Optional fallback | No | Adapter label shown with translated captions |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes for sign-in | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes for sign-in | No | Browser/server token validation |
| `PRODUCER_EMAILS` | Optional | Yes | Comma-separated producer allowlist |
| `CRM_WEBHOOK_URL` | Optional | Yes | CRM ingestion endpoint |
| `CRM_PROVIDER` | Optional | No | `generic`, `hubspot`, or `salesforce` |
| `CRM_AUTH_TOKEN` | Optional | Yes | CRM bearer token |
| `CALENDAR_WEBHOOK_URL` | Optional | Yes | Calendar adapter endpoint |
| `SLACK_WEBHOOK_URL` | Optional | Yes | Slack incoming webhook |
| `TEAMS_WEBHOOK_URL` | Optional | Yes | Teams webhook endpoint |
| `RECORDING_S3_ACCESS_KEY` | Recording | Yes | S3-compatible recording access key |
| `RECORDING_S3_SECRET` | Recording | Yes | S3-compatible recording secret |
| `RECORDING_S3_BUCKET` | Recording | No | Recording destination bucket |
| `RECORDING_S3_ENDPOINT` | Optional | No | Custom S3-compatible endpoint, including R2 |
| `RECORDING_S3_REGION` | Optional | No | Destination region; defaults to `auto` |
| `RECORDING_S3_FORCE_PATH_STYLE` | Optional | No | Enable path-style S3 addressing |
| `LIVEKIT_RTMP_URLS` | Optional | Yes | Comma-separated RTMP stream destinations |
| `MEMORY_GENERATION_WEBHOOK_URL` | Optional | Yes | Approved private transcript-summary service |
| `MEMORY_GENERATION_WEBHOOK_TOKEN` | Optional | Yes | Bearer token for the memory service |
| `TRANSCRIPT_INGEST_TOKEN` | Captions | Yes | Shared credential for the approved transcription agent |

Never commit real secret values. `.env.example` documents names only. When
`DEEPL_API_KEY` is configured, the server calls DeepL directly and ignores the
generic webhook settings. Keys ending in `:fx` use DeepL's API Free endpoint;
other keys use the Pro endpoint. Account usernames and passwords are never
stored in the application or deployment environment.

The optional translation webhook receives `{ "text": "…", "targetLanguage": "es" }`
and must return `{ "translated": "…", "provider": "optional label" }` within
eight seconds. Exercise each enabled media provider and translation language in
the deployment rehearsal; missing providers, invalid keys, rate limits, quota
exhaustion, malformed responses, and timeouts surface as controlled errors and
never fall back to simulated success.

## LiveKit webhooks, captions, and Egress

1. Configure the LiveKit project webhook URL as
   `https://virtualvelocity.avajesh6.workers.dev/api/livekit-webhook`.
2. Keep webhook signing enabled; the application rejects unsigned events.
3. Connect a LiveKit transcription agent to rooms where captions and searchable
   transcripts are required. Configure it to send finalized segments to
   `/api/transcript-ingest` with `TRANSCRIPT_INGEST_TOKEN`.
4. Configure at least one S3-compatible destination or RTMP URL before using
   the producer recording control.
5. Test recording and streaming in a rehearsal room, then publish a replay URL
   only after verifying access controls and attendee consent.

## Google sign-in configuration

The application calls Supabase `signInWithOAuth({ provider: "google" })`; no
Google client secret is stored in the Worker.

1. In Google Auth Platform, create an OAuth client with application type **Web application**.
2. Add `https://virtualvelocity.avajesh6.workers.dev` as an authorized JavaScript origin.
3. Add the Supabase callback shown on **Supabase → Authentication → Sign In / Providers → Google** as an authorized redirect URI. It has the form `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Paste the Google Client ID and Client Secret into the Supabase Google provider and enable it.
5. In **Supabase → Authentication → URL Configuration**, set the Site URL to the Workers URL and allow `https://virtualvelocity.avajesh6.workers.dev/**`.
6. Grant Producer access separately through `app_metadata.role` or `PRODUCER_EMAILS`. Google authentication identifies the user; it does not grant operational privileges.

When the custom domain is added later, register it in Google and Supabase before
switching production traffic.

## Database migration

Generate schema changes:

```powershell
npm.cmd run db:generate
```

Inspect the generated SQL before applying it. Apply only migrations that are
not already present in the target database.

Apply pending migrations with the migration-only Wrangler configuration. This
keeps schema history separate from the deployment configuration generated by
vinext:

```powershell
npx.cmd wrangler d1 migrations apply velocity-venue-db --remote --config wrangler.migrations.jsonc
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

Pushes to `main` use two deliberately separate services:

- `.github/workflows/deploy.yml` installs the locked dependencies, runs lint,
  and executes the complete build/test suite. It can also be rerun manually
  from the repository's **Actions** page.
- Cloudflare's native Git integration is the sole production publisher. It
  watches `main` and creates the Worker deployment without a GitHub API token.

Keeping one publisher prevents duplicate Worker versions while leaving GitHub
Actions focused on repeatable validation.

GitHub validation requires:

- GitHub variables `NEXT_PUBLIC_LIVEKIT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not add `CLOUDFLARE_API_TOKEN` to this workflow while Cloudflare's native
Git integration is active; doing so would create two independent publishers.

Worker runtime secrets such as `LIVEKIT_API_SECRET` remain stored in Cloudflare
and are not copied into GitHub. Database migrations remain an explicit,
reviewed operation and are not applied automatically during a code deployment.

For an emergency or locally initiated deployment:

```powershell
npm.cmd run deploy:cloudflare
```

After deployment, run the live suite against the returned Workers URL and
inspect the rendered attendee page for console and accessibility errors.

## Rollback

Use Cloudflare Workers deployment history to restore the preceding known-good
version. Database migrations should remain backward compatible; do not remove
columns or tables as part of an emergency Worker rollback.
