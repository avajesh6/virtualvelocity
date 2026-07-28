# Velocity transcription agent

This STT-only LiveKit agent creates a transcription session for every remote
participant in an allowlisted venue room. LiveKit publishes captions to
connected clients; the agent sends finalized segments to the application's
authenticated transcript-ingest endpoint.

Copy `.env.example` to `.env.local`, fill in the LiveKit credentials, and use
the same `TRANSCRIPT_INGEST_TOKEN` configured on the Cloudflare Worker.

```powershell
python -m pip install -e .
python agent.py dev
```

The default STT model uses LiveKit Inference, so no separate Deepgram API key is
required against LiveKit Cloud. Deploy from this directory with:

```powershell
lk cloud auth
lk agent create --secrets-file .env.local .
```

The unnamed RTC session uses automatic dispatch. Non-venue rooms are ignored.
