import asyncio
import logging
import os
import time

import aiohttp
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    AutoSubscribe,
    JobContext,
    StopResponse,
    cli,
    inference,
    llm,
    room_io,
    utils,
)

load_dotenv(".env.local")
logger = logging.getLogger("velocity-transcriber")

INGEST_URL = os.getenv(
    "TRANSCRIPT_INGEST_URL",
    "https://virtualvelocity.avajesh6.workers.dev/api/transcript-ingest",
)
INGEST_TOKEN = os.getenv("TRANSCRIPT_INGEST_TOKEN", "")
TRANSCRIPTION_MODEL = os.getenv("TRANSCRIPTION_MODEL", "deepgram/nova-3")
TRANSCRIPTION_LANGUAGE = os.getenv("TRANSCRIPTION_LANGUAGE", "en")
VENUE_ROOMS = {
    "velocity-venue-stage",
    "velocity-venue-studio",
    "velocity-venue-expo",
    "velocity-venue-lounge",
}


class TranscriptIngestor:
    def __init__(self, room_name: str):
        self.room_name = room_name
        self.started_at = time.monotonic()
        self._http = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10))

    async def close(self) -> None:
        await self._http.close()

    async def submit(self, speaker_name: str, text: str) -> None:
        payload = {
            "room": self.room_name,
            "segments": [
                {
                    "speakerName": speaker_name[:120],
                    "language": TRANSCRIPTION_LANGUAGE[:12],
                    "text": text[:2000],
                    "startMs": max(0, int((time.monotonic() - self.started_at) * 1000)),
                    "final": True,
                }
            ],
        }
        headers = {"Authorization": f"Bearer {INGEST_TOKEN}"}
        for attempt in range(3):
            try:
                async with self._http.post(INGEST_URL, json=payload, headers=headers) as response:
                    if response.status == 201:
                        return
                    error = await response.text()
                    logger.warning("transcript ingest returned %s: %s", response.status, error[:300])
                    if response.status < 500:
                        return
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                logger.warning("transcript ingest attempt %s failed: %s", attempt + 1, exc)
            await asyncio.sleep(2**attempt)


class ParticipantTranscriber(Agent):
    def __init__(
        self,
        *,
        participant_identity: str,
        participant_name: str,
        ingestor: TranscriptIngestor,
    ):
        super().__init__(
            instructions="Transcribe speech without responding.",
            stt=inference.STT(TRANSCRIPTION_MODEL, language=TRANSCRIPTION_LANGUAGE),
        )
        self.participant_identity = participant_identity
        self.participant_name = participant_name or participant_identity
        self.ingestor = ingestor

    async def on_user_turn_completed(
        self,
        chat_ctx: llm.ChatContext,
        new_message: llm.ChatMessage,
    ) -> None:
        transcript = new_message.text_content.strip()
        if transcript:
            await self.ingestor.submit(self.participant_name, transcript)
        # This is an STT-only agent. It must never generate an LLM response.
        raise StopResponse()


class MultiUserTranscriber:
    def __init__(self, ctx: JobContext, ingestor: TranscriptIngestor):
        self.ctx = ctx
        self.ingestor = ingestor
        self._sessions: dict[str, AgentSession] = {}
        self._tasks: set[asyncio.Task] = set()

    def start(self) -> None:
        self.ctx.room.on("participant_connected", self.on_participant_connected)
        self.ctx.room.on("participant_disconnected", self.on_participant_disconnected)

    async def close(self) -> None:
        await utils.aio.cancel_and_wait(*self._tasks)
        await asyncio.gather(
            *[self._close_session(session) for session in self._sessions.values()]
        )
        self.ctx.room.off("participant_connected", self.on_participant_connected)
        self.ctx.room.off("participant_disconnected", self.on_participant_disconnected)
        await self.ingestor.close()

    def on_participant_connected(self, participant: rtc.RemoteParticipant) -> None:
        if participant.identity in self._sessions:
            return
        task = asyncio.create_task(self._start_session(participant))
        self._tasks.add(task)

        def on_task_done(done: asyncio.Task) -> None:
            try:
                self._sessions[participant.identity] = done.result()
            except Exception:
                logger.exception("could not start transcription for %s", participant.identity)
            finally:
                self._tasks.discard(done)

        task.add_done_callback(on_task_done)

    def on_participant_disconnected(self, participant: rtc.RemoteParticipant) -> None:
        session = self._sessions.pop(participant.identity, None)
        if session is None:
            return
        task = asyncio.create_task(self._close_session(session))
        self._tasks.add(task)
        task.add_done_callback(lambda done: self._tasks.discard(done))

    async def _start_session(self, participant: rtc.RemoteParticipant) -> AgentSession:
        session = AgentSession()
        await session.start(
            agent=ParticipantTranscriber(
                participant_identity=participant.identity,
                participant_name=participant.name,
                ingestor=self.ingestor,
            ),
            room=self.ctx.room,
            room_options=room_io.RoomOptions(
                audio_input=True,
                text_output=True,
                audio_output=False,
                participant_identity=participant.identity,
                text_input=False,
            ),
        )
        return session

    async def _close_session(self, session: AgentSession) -> None:
        await session.drain()
        await session.aclose()


server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext) -> None:
    if not INGEST_TOKEN:
        raise RuntimeError("TRANSCRIPT_INGEST_TOKEN is required")
    if ctx.room.name not in VENUE_ROOMS:
        logger.info("ignoring non-venue room %s", ctx.room.name)
        return

    transcriber = MultiUserTranscriber(ctx, TranscriptIngestor(ctx.room.name))
    transcriber.start()
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    for participant in ctx.room.remote_participants.values():
        transcriber.on_participant_connected(participant)
    ctx.add_shutdown_callback(transcriber.close)


if __name__ == "__main__":
    cli.run_app(server)
