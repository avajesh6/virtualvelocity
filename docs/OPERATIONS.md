# Producer operations runbook

## Before an event

1. Confirm the attendee venue loads from the production URL.
2. Sign in with a producer account and confirm Producer mode opens.
3. Join each LiveKit room with a test attendee.
4. Verify participant refresh, mute, and removal in a non-production rehearsal room.
5. Confirm the run of show loads from D1 and can be advanced.
6. Send test calendar, Slack, Teams, and CRM requests only to approved test endpoints.
7. Confirm a backup room can be created and that the event team understands Rescue Mode.

## During an event

- Use the run of show as the operational source of truth.
- Refresh participants before muting or removing someone.
- Use quick cues for speaker timing; use announcements for venue-wide information.
- Treat a “not configured” adapter message differently from a delivery failure.
- Do not repeatedly activate Rescue Mode. Once started, allow LiveKit movement and incident logging to complete.

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

### Account signs in as attendee

- Set `app_metadata.role` to `producer` or `admin`, or
- Add the normalized email address to `PRODUCER_EMAILS`.

Sign out and sign in again after changing role metadata.

### Live room reports configuration required

- Confirm the LiveKit websocket URL is deployed.
- Confirm `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are Worker secrets.
- Confirm the requested room is on the server allowlist.

### Run-of-show data remains in demo mode

- Confirm the `DB` binding points to the intended D1 database.
- Confirm all files in `drizzle/` have been applied in order.
- Check the protected operations endpoint for a `503` response.

### Announcement is not delivered

- A `503` with `configured: false` means no webhook URL is configured.
- A `502` means a configured provider rejected or failed the request.
- Check the audit trail for the channel and recorded delivery state.

## After an event

1. Export or inspect leads, incidents, and audit events.
2. Review recovery duration and participant impact.
3. Rotate temporary provider credentials when required.
4. Record follow-up engineering work separately from the immutable event audit trail.
5. Connect the custom domain only after the test submission phase, as documented in the project TODO.

