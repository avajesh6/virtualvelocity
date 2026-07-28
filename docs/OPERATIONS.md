# Producer operations runbook

## Safe demo and rehearsal

Use Demo mode for product tours and operator orientation. It is intentionally
browser-local: room controls do not request device access, producer actions do not
call provider APIs, and attendee interactions do not create records or leads.

1. Confirm the header says `DEMO DATA · NO LIVE IMPACT`.
2. Open the attendee demo room and test its simulated media controls.
3. Open `Producer demo` without an account and exercise the run of show, Rescue
   Mode, recording, poll, transcript, replay, sponsor, and memory controls.
4. Switch back to Live and confirm the demo room closes and Producer access again
   requires authorization.

Use a separate non-production Live environment for actual camera, microphone,
LiveKit, Agora, recording, webhook, or connector rehearsals.

## Before an event

1. Confirm the attendee venue loads from the production URL.
2. Sign in with a producer account and confirm Producer mode opens.
3. Join each LiveKit room through the device-preview lobby and verify camera,
   microphone, speaker output, participant video, screen sharing, and chat.
4. Copy an invite link from the conference header and verify it opens the expected
   room after authentication.
5. Check the attendee experience in both light and dark modes at desktop and mobile
   widths.
6. Verify participant refresh, mute, and removal in a non-production rehearsal room.
7. Publish at least one run-of-show item, then confirm it can be advanced.
8. Create an attendee support request and verify assignment and resolution in Producer mode.
9. Send test calendar, Slack, Teams, and CRM requests only to approved test endpoints.
10. Confirm a backup room can be created and that the event team understands Rescue Mode.
11. Confirm the LiveKit webhook has produced room and participant events in Venue Intelligence.
12. Publish a test poll, answer it as an attendee, submit and moderate a question, and test hand raising.
13. Verify networking discoverability is opt-in and sponsor lead sharing records explicit consent.
14. Confirm captions appear from the approved transcription agent and test the chosen caption languages.
15. Start and stop a rehearsal recording, validate its destination, publish a replay, and generate conference memory.
16. Confirm keyboard focus stays inside sign-in, device-lobby, announcement, and
    confirmation dialogs; verify Escape closes them and returns focus to the opener.

## During an event

- Use the run of show as the operational source of truth.
- Refresh participants before muting or removing someone.
- Use persisted announcements for venue-wide information.
- Treat a “not configured” adapter message differently from a delivery failure.
- Do not repeatedly activate Rescue Mode. Once started, allow LiveKit movement and incident logging to complete.
- Monitor Venue Intelligence recommendations alongside LiveKit's current room
  state. Recommendations are operational prompts, not automatic destructive actions.
- Confirm recording and transcription consent before starting capture.
- Read and accept the confirmation before participant removal, Rescue Mode,
  run-of-show advancement, and recording start/stop actions.
- Close completed questions and polls so attendee controls accurately reflect the moderator state.

## Rescue Mode

Use Rescue Mode when the active room is materially disrupted and normal
reconnection is insufficient.

Expected sequence:

1. An incident record is opened.
2. A `<source-room>-backup` room is created.
3. Active participants are moved.
4. The incident is resolved with affected count and recovery time.
5. The action is written to the audit trail.

If D1 is unavailable, LiveKit recovery still proceeds. Record the incident
manually after the event.

## Common conditions

### Producer sign-in is unavailable

- Confirm the Supabase URL and publishable key are configured.
- Confirm email/password sign-in is enabled.
- Confirm the user exists and the password is current.
- For Google, confirm the provider is enabled in Supabase and its Google Client ID and Client Secret are valid.
- Confirm the Workers URL is present in Supabase redirect URLs and the Supabase callback is present in Google authorized redirect URIs.

### Account signs in as attendee

- Set `app_metadata.role` to `producer` or `admin`, or
- Add the normalized email address to `PRODUCER_EMAILS`.

Sign out and sign in again after changing role metadata.

### Live room reports configuration required

- Confirm the LiveKit websocket URL is deployed.
- Confirm `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are Worker secrets.
- Confirm the requested room is on the server allowlist.

### Run-of-show data is unavailable or empty

- Confirm the `DB` binding points to the intended D1 database.
- Confirm all files in `drizzle/` have been applied in order.
- Check the protected operations endpoint for a `503` response.
- An empty array is valid until a producer publishes an agenda item.

### Announcement is not delivered

- A `503` with `configured: false` means no webhook URL is configured.
- A `502` means a configured provider rejected or failed the request.
- Check the audit trail for the channel and recorded delivery state.

### Venue Intelligence has no history

- Confirm LiveKit points to `/api/livekit-webhook` on the production host.
- Confirm `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` match the webhook-signing project.
- Trigger a rehearsal join and inspect the protected intelligence endpoint.

### Recording cannot start

- Configure an S3-compatible destination and/or `LIVEKIT_RTMP_URLS`.
- Confirm the LiveKit plan and project permit Egress.
- Verify the destination credentials can create objects in the configured bucket.

### Captions are ready but no text appears

- The interface never fabricates captions. Confirm the LiveKit transcription
  agent is connected and publishes transcription text streams.
- Confirm the agent publishes finalized source captions and the attendee selected a supported DeepL target language.

## After an event

1. Export or inspect consented sponsor interactions, engagement, telemetry, leads, incidents, and audit events.
2. Review recovery duration and participant impact.
3. Rotate temporary provider credentials when required.
4. Record follow-up engineering work separately from the immutable event audit trail.
5. Connect the custom domain only after the test submission phase, as documented in the project TODO.
6. Publish verified replay URLs, generate conference memory, and apply the event's transcript and recording retention policy.
