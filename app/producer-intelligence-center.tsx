"use client";

import {
  Activity,
  BarChart3,
  Captions,
  CircleStop,
  CloudUpload,
  Lightbulb,
  Play,
  RadioTower,
  Sparkles,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { VENUE_ROOMS } from "./venue-config";

type IntelligenceData = {
  metrics: {
    joins: number;
    leaves: number;
    engagementResponses: number;
    openQuestions: number;
    sponsorOptIns: number;
    transcriptSegments: number;
  };
  telemetry: Array<{ id: number; eventType: string; roomName: string; participantName: string; occurredAt: string }>;
  items: Array<{ id: number; kind: string; prompt: string; status: string; responseCount: number }>;
  recordings: Array<{ id: number; egressId: string; roomName: string; status: string; createdAt: string }>;
  recommendations: string[];
  recordingConfigured: boolean;
  streamingConfigured: boolean;
};

export function ProducerIntelligenceCenter({
  mode,
  accessToken,
  notify,
}: {
  mode: "live" | "demo";
  accessToken: string;
  notify: (message: string) => void;
}) {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [busy, setBusy] = useState(false);
  const [poll, setPoll] = useState({ room: VENUE_ROOMS[0].roomName, prompt: "", options: ["", ""] });
  const [replay, setReplay] = useState({ room: VENUE_ROOMS[0].roomName, title: "", url: "", summary: "" });
  const [sponsor, setSponsor] = useState({ name: "", description: "", resourceUrl: "" });
  const [transcriptText, setTranscriptText] = useState("");

  const refresh = useCallback(async () => {
    if (mode === "demo") {
      setData({
        metrics: { joins: 468, leaves: 37, engagementResponses: 282, openQuestions: 14, sponsorOptIns: 36, transcriptSegments: 194 },
        telemetry: [
          { id: -1, eventType: "participant_joined", roomName: VENUE_ROOMS[0].roomName, participantName: "Demo attendee", occurredAt: new Date().toISOString() },
          { id: -2, eventType: "track_published", roomName: VENUE_ROOMS[0].roomName, participantName: "Demo speaker", occurredAt: new Date().toISOString() },
        ],
        items: [],
        recordings: [{ id: -1, egressId: "demo-egress", roomName: VENUE_ROOMS[0].roomName, status: "DEMO_ACTIVE", createdAt: new Date().toISOString() }],
        recommendations: ["Demo insight: the Q&A queue is growing. Bring a top-ranked question to stage.", "Demo insight: Studio One is nearing its planned transition time."],
        recordingConfigured: true,
        streamingConfigured: true,
      });
      return;
    }
    try {
      const response = await fetch("/api/producer/intelligence", {
        headers: { authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      const payload = await response.json() as IntelligenceData & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Event intelligence is unavailable.");
      setData(payload);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Event intelligence is unavailable.");
    }
  }, [accessToken, mode, notify]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
    if (mode === "demo") return;
    const interval = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(interval);
  }, [mode, refresh]);

  const post = async (body: Record<string, unknown>, success: string) => {
    if (mode === "demo") {
      notify(`Demo: ${success} No live system was changed.`);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/producer/intelligence", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The operation failed.");
      notify(success);
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "The operation failed.");
    } finally {
      setBusy(false);
    }
  };

  const activeRecording = data?.recordings.find((recording) =>
    ["EGRESS_STARTING", "EGRESS_ACTIVE", "starting", "active", "DEMO_ACTIVE"].includes(recording.status),
  );

  return (
    <section className="producer-intelligence scroll-target" id="producer-intelligence">
      <div className="panel-head">
        <div><span className="eyebrow"><Sparkles size={13} /> VENUE INTELLIGENCE</span><h2>Control tower</h2></div>
        <span className="intelligence-live"><i />{mode === "demo" ? "DEMO TELEMETRY" : "LIVEKIT WEBHOOK DATA"}</span>
      </div>
      <div className="intelligence-metrics">
        <span><Activity size={17} /><small>JOIN EVENTS</small><strong>{data?.metrics.joins ?? 0}</strong></span>
        <span><BarChart3 size={17} /><small>RESPONSES</small><strong>{data?.metrics.engagementResponses ?? 0}</strong></span>
        <span><Captions size={17} /><small>TRANSCRIPT SEGMENTS</small><strong>{data?.metrics.transcriptSegments ?? 0}</strong></span>
        <span><Sparkles size={17} /><small>SPONSOR OPT-INS</small><strong>{data?.metrics.sponsorOptIns ?? 0}</strong></span>
      </div>
      <div className="intelligence-grid">
        <div className="intelligence-column">
          <h3><Lightbulb size={17} />Producer copilot</h3>
          {!data?.recommendations.length && <p className="experience-empty">No operational recommendations right now.</p>}
          {data?.recommendations.map((recommendation) => <div className="recommendation" key={recommendation}><i /><p>{recommendation}</p></div>)}
          <h3><RadioTower size={17} />Recent venue events</h3>
          <div className="telemetry-list">
            {!data?.telemetry.length && <p className="experience-empty">No verified webhook events received yet.</p>}
            {data?.telemetry.slice(0, 8).map((event) => <div key={event.id}><span>{event.eventType.replaceAll("_", " ")}</span><strong>{event.participantName || event.roomName || "Venue"}</strong><small>{new Date(event.occurredAt).toLocaleTimeString()}</small></div>)}
          </div>
          <h3><BarChart3 size={17} />Moderator queue</h3>
          <div className="moderator-list">
            {!data?.items.filter((item) => item.kind === "question" && item.status === "open").length && <p className="experience-empty">No open audience questions.</p>}
            {data?.items.filter((item) => item.kind === "question" && item.status === "open").slice(0, 10).map((item) => (
              <div key={item.id}><p>{item.prompt}</p><span>{item.responseCount} votes</span><button disabled={busy} onClick={() => void post({ action: "close-item", itemId: item.id }, "Question closed.")}>Close</button></div>
            ))}
          </div>
        </div>
        <div className="intelligence-column">
          <h3><Video size={17} />Recording &amp; streaming</h3>
          <div className="recording-control">
            <select id="recording-room" aria-label="Recording room" defaultValue={VENUE_ROOMS[0].roomName}>{VENUE_ROOMS.map((room) => <option value={room.roomName} key={room.id}>{room.title}</option>)}</select>
            {activeRecording
              ? <button className="stop" disabled={busy} onClick={() => void post({ action: "stop-recording", egressId: activeRecording.egressId }, "Recording stop requested.")}><CircleStop size={15} />Stop recording</button>
              : <button disabled={busy || (mode === "live" && !data?.recordingConfigured && !data?.streamingConfigured)} onClick={() => {
                const room = (document.getElementById("recording-room") as HTMLSelectElement | null)?.value;
                void post({ action: "start-recording", room }, "Recording and configured streams started.");
              }}><RadioTower size={15} />Start recording</button>}
            <p>{mode === "demo" ? "Demo controls do not create media." : data?.recordingConfigured || data?.streamingConfigured ? "Output destinations are configured." : "Add an S3-compatible destination or RTMP URL in deployment settings."}</p>
          </div>
          <button className="memory-generate-button" disabled={busy} onClick={() => void post({ action: "generate-memory", room: VENUE_ROOMS[0].roomName, title: "Main stage conference memory" }, "Searchable conference memory generated.")}><Sparkles size={15} />Generate summary, chapters &amp; actions</button>
          <form className="producer-mini-form" onSubmit={(event) => {
            event.preventDefault();
            const transcript = transcriptText.split(/\r?\n/).map((line, index) => {
              const [speaker, ...text] = line.split(":");
              return { speakerName: text.length ? speaker.trim() : "Speaker", text: (text.length ? text.join(":") : speaker).trim(), language: "en", startMs: index * 5000 };
            }).filter((segment) => segment.text);
            void post({ action: "import-transcript", room: VENUE_ROOMS[0].roomName, transcript }, "Finalized transcript imported.").then(() => setTranscriptText(""));
          }}>
            <h3><Captions size={17} />Import finalized transcript</h3>
            <textarea placeholder={"Speaker: Finalized caption text\nSpeaker: Next caption segment"} value={transcriptText} onChange={(event) => setTranscriptText(event.target.value)} required />
            <button type="submit" disabled={busy || !transcriptText.trim()}>Import transcript</button>
          </form>
          <form className="producer-mini-form" onSubmit={(event) => {
            event.preventDefault();
            void post({ action: "create-poll", ...poll }, "Audience poll published.").then(() => setPoll((value) => ({ ...value, prompt: "", options: ["", ""] })));
          }}>
            <h3><BarChart3 size={17} />Publish a poll</h3>
            <select value={poll.room} onChange={(event) => setPoll((value) => ({ ...value, room: event.target.value }))}>{VENUE_ROOMS.map((room) => <option value={room.roomName} key={room.id}>{room.title}</option>)}</select>
            <input placeholder="Poll question" value={poll.prompt} onChange={(event) => setPoll((value) => ({ ...value, prompt: event.target.value }))} required minLength={5} />
            {poll.options.map((option, index) => <input key={index} placeholder={`Choice ${index + 1}`} value={option} onChange={(event) => setPoll((value) => ({ ...value, options: value.options.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} required />)}
            <button type="submit" disabled={busy}>Publish poll</button>
          </form>
          <form className="producer-mini-form" onSubmit={(event) => {
            event.preventDefault();
            void post({ action: "publish-replay", ...replay }, "Replay published to the conference memory.").then(() => setReplay((value) => ({ ...value, title: "", url: "", summary: "" })));
          }}>
            <h3><CloudUpload size={17} />Publish a replay</h3>
            <select value={replay.room} onChange={(event) => setReplay((value) => ({ ...value, room: event.target.value }))}>{VENUE_ROOMS.map((room) => <option value={room.roomName} key={room.id}>{room.title}</option>)}</select>
            <input placeholder="Session title" value={replay.title} onChange={(event) => setReplay((value) => ({ ...value, title: event.target.value }))} required />
            <input type="url" placeholder="https://cdn.example.com/session.mp4" value={replay.url} onChange={(event) => setReplay((value) => ({ ...value, url: event.target.value }))} required />
            <textarea placeholder="Summary and key takeaways" value={replay.summary} onChange={(event) => setReplay((value) => ({ ...value, summary: event.target.value }))} />
            <button type="submit" disabled={busy}><Play size={14} />Publish replay</button>
          </form>
          <form className="producer-mini-form" onSubmit={(event) => {
            event.preventDefault();
            void post({ action: "publish-sponsor", ...sponsor }, "Sponsor booth published.").then(() => setSponsor({ name: "", description: "", resourceUrl: "" }));
          }}>
            <h3><Sparkles size={17} />Publish a sponsor booth</h3>
            <input placeholder="Sponsor name" value={sponsor.name} onChange={(event) => setSponsor((value) => ({ ...value, name: event.target.value }))} required />
            <input type="url" placeholder="https://sponsor.example/resource" value={sponsor.resourceUrl} onChange={(event) => setSponsor((value) => ({ ...value, resourceUrl: event.target.value }))} />
            <textarea placeholder="Sponsor description" value={sponsor.description} onChange={(event) => setSponsor((value) => ({ ...value, description: event.target.value }))} />
            <button type="submit" disabled={busy}>Publish booth</button>
          </form>
        </div>
      </div>
    </section>
  );
}
