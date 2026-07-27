"use client";

import {
  Accessibility,
  BarChart3,
  Captions,
  Check,
  ChevronUp,
  Clock,
  Download,
  Languages,
  MessageCircleQuestion,
  Network,
  Play,
  Radio,
  Send,
  Sparkles,
  UserRoundSearch,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VENUE_ROOMS, type VenueRoomId } from "./venue-config";
import { generateIcsContent } from "./integrations";

type Mode = "live" | "demo";
type Tab = "engage" | "network" | "replay" | "access";
type Profile = {
  company: string;
  jobTitle: string;
  interests: string[];
  discoverable: boolean;
  captionLanguage: string;
  reducedData: boolean;
};
type EngagementItem = {
  id: number;
  roomName: string;
  kind: "poll" | "question" | "reaction" | "hand";
  authorName: string;
  prompt: string;
  options: string[];
  results: Record<string, number>;
  userResponse: string | null;
  status: string;
};
type Match = {
  userId: string;
  displayName: string;
  company: string;
  jobTitle: string;
  sharedInterests: string[];
};
type Replay = {
  id: number;
  title: string;
  url: string;
  summary: string;
  status: string;
};
type Transcript = {
  id: number;
  speakerName: string;
  text: string;
  language: string;
};
type ExperienceData = {
  items: EngagementItem[];
  profile: Profile | null;
  matches: Match[];
  connections: Array<{ id?: number; recipientId: string; recipientName?: string; requesterName?: string; direction?: "incoming" | "outgoing"; status?: string; startsAt?: string }>;
  replays: Replay[];
  transcripts: Transcript[];
  sponsors: Array<{ id: number; name: string; description: string; resourceUrl: string }>;
};

const icebreakers = [
  "What is the single biggest game-changer technology in your industry this year?",
  "What problem are you trying to solve at this conference?",
  "What was your key takeaway from today's opening sessions?",
  "How is your team measuring product trust and responsible implementation?",
];

const demoData: ExperienceData = {
  items: [
    {
      id: -1,
      roomName: "velocity-venue-stage",
      kind: "poll",
      authorName: "Producer",
      prompt: "Which capability creates the most trust?",
      options: ["Transparency", "Human oversight", "Independent audits"],
      results: { Transparency: 94, "Human oversight": 121, "Independent audits": 67 },
      userResponse: null,
      status: "open",
    },
    {
      id: -2,
      roomName: "velocity-venue-stage",
      kind: "question",
      authorName: "Rina",
      prompt: "How do you measure whether responsible-AI controls change product decisions?",
      options: [],
      results: { upvote: 38 },
      userResponse: null,
      status: "open",
    },
  ],
  profile: {
    company: "Northstar Labs",
    jobTitle: "Product lead",
    interests: ["Responsible AI", "Product strategy"],
    discoverable: true,
    captionLanguage: "en",
    reducedData: false,
  },
  matches: [
    { userId: "demo-noor", displayName: "Noor Patel", company: "Arcline", jobTitle: "AI governance lead", sharedInterests: ["Responsible AI"] },
    { userId: "demo-jonas", displayName: "Jonas Weber", company: "Common Ground", jobTitle: "Product director", sharedInterests: ["Product strategy"] },
  ],
  connections: [
    { id: -1, recipientId: "demo-self", requesterName: "Priya Shah", direction: "incoming", status: "pending" },
    { id: -2, recipientId: "demo-jonas", recipientName: "Jonas Weber", direction: "outgoing", status: "accepted" },
  ],
  replays: [{ id: -1, title: "Opening keynote", url: "#", summary: "A practical framework for building trustworthy AI products.", status: "published" }],
  transcripts: [
    { id: -1, speakerName: "Maya Chen", language: "en", text: "Trust is a product behavior, not a launch message." },
    { id: -2, speakerName: "Elias Brooks", language: "en", text: "Teams need evidence that safeguards influence everyday decisions." },
  ],
  sponsors: [{ id: -1, name: "Lumen Systems", description: "Operational tools for responsible AI teams.", resourceUrl: "#" }],
};

const createDemoData = () => structuredClone(demoData);

export function EventExperienceHub({
  mode,
  accessToken,
  room,
  signedIn,
  requestSignIn,
  navigationTarget,
  notify,
}: {
  mode: Mode;
  accessToken: string | null;
  room: VenueRoomId;
  signedIn: boolean;
  requestSignIn: () => void;
  navigationTarget?: { tab: Tab; requestId: number } | null;
  notify: (message: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("engage");
  const [data, setData] = useState<ExperienceData | null>(mode === "demo" ? createDemoData() : null);
  const [loading, setLoading] = useState(mode === "live");
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const [profile, setProfile] = useState<Profile>({
    company: "",
    jobTitle: "",
    interests: [],
    discoverable: false,
    captionLanguage: "en",
    reducedData: false,
  });
  const [interestDraft, setInterestDraft] = useState("");
  const [transcriptQuery, setTranscriptQuery] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [demoSponsorOptIns, setDemoSponsorOptIns] = useState<string[]>([]);
  
  // Speed networking state
  const [speedActive, setSpeedActive] = useState(false);
  const [speedTime, setSpeedTime] = useState(180);
  const [icebreakerIdx, setIcebreakerIdx] = useState(0);
  const tabOrder: Tab[] = ["engage", "network", "replay", "access"];

  const handleTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, current: Tab) => {
    const currentIndex = tabOrder.indexOf(current);
    const nextIndex = event.key === "Home" ? 0
      : event.key === "End" ? tabOrder.length - 1
        : event.key === "ArrowRight" || event.key === "ArrowDown" ? (currentIndex + 1) % tabOrder.length
          : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (currentIndex - 1 + tabOrder.length) % tabOrder.length
            : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const next = tabOrder[nextIndex];
    setTab(next);
    document.getElementById(`experience-tab-${next}`)?.focus();
  };

  // Speed networking timer countdown
  useEffect(() => {
    if (!speedActive) return;
    const interval = window.setInterval(() => {
      setSpeedTime((prev) => {
        if (prev <= 1) {
          setIcebreakerIdx((idx) => (idx + 1) % icebreakers.length);
          notify("Speed networking round complete! Paired with next match.");
          return 180;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [speedActive, notify]);

  const refresh = useCallback(async () => {
    if (mode === "demo") {
      const nextDemoData = createDemoData();
      setData(nextDemoData);
      setProfile(nextDemoData.profile!);
      setDemoSponsorOptIns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/experience", {
        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
        cache: "no-store",
      });
      const payload = await response.json() as ExperienceData & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Experience data is unavailable.");
      setData(payload);
      if (payload.profile) setProfile(payload.profile);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Experience data is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, mode, notify]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  useEffect(() => {
    if (!navigationTarget) return;
    queueMicrotask(() => setTab(navigationTarget.tab));
    // Wait for the requested panel to render before moving focus and viewport
    // to its meaningful content, especially on the single-column mobile view.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const target = navigationTarget.tab === "network"
        ? document.getElementById("partner-discovery")
        : document.getElementById(`experience-panel-${navigationTarget.tab}`);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      target?.focus({ preventScroll: true });
    }));
  }, [navigationTarget]);

  const post = async (body: Record<string, unknown>, success: string) => {
    if (mode === "demo") {
      // Demo mutations intentionally stop here: they update the browser state
      // that powers the visible sandbox, never an API, identity, or connector.
      setData((current) => {
        if (!current) return current;
        const action = String(body.action ?? "");
        if (action === "answer-poll") {
          const itemId = Number(body.itemId);
          const response = String(body.response ?? "");
          return {
            ...current,
            items: current.items.map((item) => {
              if (item.id !== itemId || item.kind !== "poll") return item;
              const results = { ...item.results };
              if (item.userResponse && item.userResponse !== response) results[item.userResponse] = Math.max(0, (results[item.userResponse] ?? 1) - 1);
              if (item.userResponse !== response) results[response] = (results[response] ?? 0) + 1;
              return { ...item, results, userResponse: response };
            }),
          };
        }
        if (action === "vote") {
          const itemId = Number(body.itemId);
          return { ...current, items: current.items.map((item) => item.id === itemId && !item.userResponse ? { ...item, results: { ...item.results, upvote: (item.results.upvote ?? 0) + 1 }, userResponse: "upvote" } : item) };
        }
        if (action === "ask-question") {
          return { ...current, items: [...current.items, { id: -Date.now(), roomName: String(body.room), kind: "question", authorName: "You", prompt: String(body.prompt), options: [], results: { upvote: 0 }, userResponse: null, status: "open" }] };
        }
        if (action === "save-profile") {
          const nextProfile: Profile = {
            company: String(body.company ?? ""),
            jobTitle: String(body.jobTitle ?? ""),
            interests: Array.isArray(body.interests) ? body.interests.map(String) : [],
            discoverable: Boolean(body.discoverable),
            captionLanguage: String(body.captionLanguage ?? "en"),
            reducedData: Boolean(body.reducedData),
          };
          return { ...current, profile: nextProfile };
        }
        if (action === "request-connection") {
          return { ...current, connections: [...current.connections, { id: -Date.now(), recipientId: String(body.recipientId), recipientName: String(body.recipientName), direction: "outgoing", status: "pending" }] };
        }
        if (action === "respond-connection") {
          return { ...current, connections: current.connections.map((connection) => connection.id === Number(body.connectionId) ? { ...connection, status: String(body.status) } : connection) };
        }
        if (action === "schedule-connection") {
          return { ...current, connections: current.connections.map((connection) => connection.id === Number(body.connectionId) ? { ...connection, startsAt: String(body.startsAt) } : connection) };
        }
        return current;
      });
      if (body.action === "sponsor-interest") setDemoSponsorOptIns((current) => [...new Set([...current, String(body.boothName)])]);
      notify(`Demo: ${success} No real attendee or integration was contacted.`);
      return true;
    }
    if (!accessToken) {
      notify("Sign in to use this feature.");
      requestSignIn();
      return false;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/experience", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The update could not be saved.");
      notify(success);
      await refresh();
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "The update could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const downloadIcs = (title: string, startsAt: string) => {
    const csData = generateIcsContent({
      title: `Velocity Venue Meeting: ${title}`,
      description: `Networking 1-on-1 meeting scheduled via Velocity Venue.`,
      startsAt: startsAt || new Date().toISOString(),
    });
    const blob = new Blob([csData], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meeting-${Date.now()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify("Calendar .ics invitation downloaded.");
  };

  const downloadConferenceCapsule = () => {
    const replayLines = (data?.replays ?? []).map((replay) => `- ${replay.title}: ${replay.summary || "No summary published."}`);
    const transcriptLines = (data?.transcripts ?? []).slice(0, 20).map((segment) => `- ${segment.speakerName || "Speaker"}: ${segment.text}`);
    const content = [
      "# Velocity Venue conference capsule",
      "",
      "## Published session summaries",
      ...(replayLines.length ? replayLines : ["- No session summaries have been published."]),
      "",
      "## Transcript highlights",
      ...(transcriptLines.length ? transcriptLines : ["- No finalized transcript segments are available."]),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "velocity-venue-conference-capsule.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify("Conference capsule downloaded from published event data.");
  };

  const currentRoomName = VENUE_ROOMS.find((item) => item.id === room)?.roomName ?? VENUE_ROOMS[0].roomName;
  const items = data?.items.filter((item) => item.roomName === currentRoomName && (item.kind === "poll" || item.kind === "question")) ?? [];
  const filteredTranscript = useMemo(() => {
    const query = transcriptQuery.trim().toLowerCase();
    return (data?.transcripts ?? []).filter((segment) =>
      !query || `${segment.speakerName} ${segment.text}`.toLowerCase().includes(query),
    );
  }, [data?.transcripts, transcriptQuery]);
  const speedMatch = data?.matches.length ? data.matches[icebreakerIdx % data.matches.length] : null;

  return (
    <section className="experience-hub" id="experience" aria-labelledby="experience-title">
      <div className="experience-heading">
        <div>
          <span className="eyebrow"><Sparkles size={14} /> PARTICIPATE, CONNECT, REMEMBER</span>
          <h3 id="experience-title">Your event intelligence layer</h3>
          <p>{mode === "demo" ? "Explore sample workflows without contacting anyone." : "Every Live interaction below is persisted and attributed to signed-in attendees."}</p>
        </div>
        <span className={`experience-source ${mode}`}><Radio size={13} />{mode === "demo" ? "DEMO DATA" : "LIVE DATA"}</span>
      </div>
      <div className="experience-tabs" role="tablist" aria-label="Event experience">
        <button id="experience-tab-engage" role="tab" tabIndex={tab === "engage" ? 0 : -1} aria-selected={tab === "engage"} aria-controls="experience-panel-engage" className={tab === "engage" ? "active" : ""} onKeyDown={(event) => handleTabKey(event, "engage")} onClick={() => setTab("engage")}><BarChart3 size={16} />Polls &amp; Q&amp;A</button>
        <button id="experience-tab-network" role="tab" tabIndex={tab === "network" ? 0 : -1} aria-selected={tab === "network"} aria-controls="experience-panel-network" className={tab === "network" ? "active" : ""} onKeyDown={(event) => handleTabKey(event, "network")} onClick={() => setTab("network")}><Network size={16} />Networking</button>
        <button id="experience-tab-replay" role="tab" tabIndex={tab === "replay" ? 0 : -1} aria-selected={tab === "replay"} aria-controls="experience-panel-replay" className={tab === "replay" ? "active" : ""} onKeyDown={(event) => handleTabKey(event, "replay")} onClick={() => setTab("replay")}><Play size={16} />Conference memory</button>
        <button id="experience-tab-access" role="tab" tabIndex={tab === "access" ? 0 : -1} aria-selected={tab === "access"} aria-controls="experience-panel-access" className={tab === "access" ? "active" : ""} onKeyDown={(event) => handleTabKey(event, "access")} onClick={() => setTab("access")}><Accessibility size={16} />Accessibility</button>
      </div>

      {loading ? <p className="experience-empty">Loading live event experience…</p> : null}

      {!loading && tab === "engage" && (
        <div className="experience-grid" id="experience-panel-engage" role="tabpanel" aria-labelledby="experience-tab-engage">
          <div className="experience-list">
            {!items.length && <p className="experience-empty">No live polls or audience questions in this room yet.</p>}
            {items.map((item) => (
              <article className="interaction-card" key={item.id}>
                <span>{item.kind === "poll" ? "LIVE POLL" : "AUDIENCE Q&A"} · {item.status.toUpperCase()}</span>
                <h4>{item.prompt}</h4>
                {item.kind === "poll" ? (
                  <div className="poll-options">
                    {item.options.map((option) => {
                      const count = item.results[option] ?? 0;
                      const total = Object.values(item.results).reduce((sum, value) => sum + value, 0);
                      const percentage = total ? Math.round(count / total * 100) : 0;
                      return (
                        <button
                          key={option}
                          className={item.userResponse === option ? "selected" : ""}
                          disabled={busy || item.status !== "open"}
                          onClick={() => void post({ action: "answer-poll", itemId: item.id, response: option }, "Your poll response was recorded.")}
                        >
                          <span>{option}<strong>{percentage}%</strong></span><i style={{ width: `${percentage}%` }} />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="question-meta">
                    <span>Asked by {item.authorName}</span>
                    <button
                      className={item.userResponse ? "selected" : ""}
                      disabled={busy || item.status !== "open"}
                      onClick={() => void post({ action: "vote", itemId: item.id }, "Your vote was recorded.")}
                    ><ChevronUp size={15} />{item.results.upvote ?? 0}</button>
                  </div>
                )}
              </article>
            ))}
          </div>
          <form className="experience-form" onSubmit={(event) => {
            event.preventDefault();
            void post({ action: "ask-question", room: currentRoomName, prompt: question }, "Your question was added to the moderator queue.")
              .then((ok) => ok && setQuestion(""));
          }}>
            <MessageCircleQuestion size={22} />
            <h4>Ask the stage</h4>
            <p>Questions are visible to attendees and ranked by verified votes.</p>
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} minLength={5} maxLength={500} required placeholder="What would you like the speakers to address?" />
            <small className="field-hint">Enter at least 5 characters to enable submission.</small>
            <button type="submit" disabled={busy || question.trim().length < 5}><Send size={15} />Submit question</button>
            <div className="quick-reactions" aria-label="Quick audience reactions">
              <button type="button" onClick={() => void post({ action: "reaction", room: currentRoomName, response: "applause" }, "Applause sent.")}>👏 Applause</button>
              <button type="button" onClick={() => void post({ action: "reaction", room: currentRoomName, response: "agree" }, "Agreement sent.")}>✓ Agree</button>
              <button type="button" onClick={() => void post({ action: "reaction", room: currentRoomName, response: "insightful" }, "Insight reaction sent.")}>✦ Insightful</button>
              <button type="button" onClick={() => void post({ action: "raise-hand", room: currentRoomName }, "Your hand is in the moderator queue.")}>✋ Raise hand</button>
            </div>
          </form>
        </div>
      )}

      {!loading && tab === "network" && (
        <div className="experience-grid" id="experience-panel-network" role="tabpanel" aria-labelledby="experience-tab-network">
          <form className="experience-form profile-form" onSubmit={(event) => {
            event.preventDefault();
            void post({ action: "save-profile", ...profile }, "Your networking preferences were saved.");
          }}>
            <UserRoundSearch size={22} />
            <h4>Opt-in networking profile</h4>
            <p>You appear in suggestions only when discoverability is enabled.</p>
            <input aria-label="Company" placeholder="Company" value={profile.company} onChange={(event) => setProfile((value) => ({ ...value, company: event.target.value }))} />
            <input aria-label="Job title" placeholder="Job title" value={profile.jobTitle} onChange={(event) => setProfile((value) => ({ ...value, jobTitle: event.target.value }))} />
            <div className="interest-editor">
              <input aria-label="Interest" placeholder="Add an interest" value={interestDraft} onChange={(event) => setInterestDraft(event.target.value)} />
              <button type="button" onClick={() => {
                const interest = interestDraft.trim();
                if (!interest || profile.interests.includes(interest)) return;
                setProfile((value) => ({ ...value, interests: [...value.interests, interest].slice(0, 12) }));
                setInterestDraft("");
              }}>Add</button>
            </div>
            <div className="interest-chips">{profile.interests.map((interest) => <button type="button" key={interest} onClick={() => setProfile((value) => ({ ...value, interests: value.interests.filter((item) => item !== interest) }))}>{interest} ×</button>)}</div>
            <label className="consent-row"><input type="checkbox" checked={profile.discoverable} onChange={(event) => setProfile((value) => ({ ...value, discoverable: event.target.checked }))} /><span><strong>Make me discoverable</strong><small>Share this profile with signed-in event attendees.</small></span></label>
            <button type="submit" disabled={busy}><Check size={15} />Save preferences</button>
          </form>
          <div className="experience-list">
            {/* Speed Networking Widget */}
            <div className="interaction-card" style={{ borderColor: "rgba(200, 255, 99, 0.4)", background: "rgba(200, 255, 99, 0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--lime)" }}><Zap size={13} style={{ display: "inline", marginRight: 4 }} />FACILITATED NETWORKING · 3-MIN TIMER</span>
                <span className="status-pill healthy" style={{ fontSize: 8 }}>{speedActive ? `${Math.floor(speedTime / 60)}:${String(speedTime % 60).padStart(2, '0')}` : "PAUSED"}</span>
              </div>
              <h4 style={{ margin: "10px 0 6px" }}>{speedActive && speedMatch ? `Conversation round with ${speedMatch.displayName}` : "Start a timed round with an opt-in match"}</h4>
              <p className="experience-empty">This timer provides a prompt only; it does not start a call or contact the match automatically.</p>
              {speedActive && (
                <p style={{ color: "var(--lime)", fontSize: 10, margin: "6px 0", fontWeight: 700 }}>
                  💡 Icebreaker: &ldquo;{icebreakers[icebreakerIdx]}&rdquo;
                </p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!speedMatch}
                  style={{ fontSize: 10, padding: "8px 12px" }}
                  onClick={() => {
                    setSpeedActive(!speedActive);
                    notify(speedActive ? "Networking timer paused." : `Three-minute conversation timer started with ${speedMatch?.displayName}.`);
                  }}
                >
                  <Clock size={13} />{speedActive ? "Pause round" : "Start lightning round"}
                </button>
                {speedActive && (
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ fontSize: 10, padding: "8px 12px" }}
                    onClick={() => {
                      setSpeedTime(180);
                      setIcebreakerIdx((idx) => (idx + 1) % icebreakers.length);
                      notify("Moved to the next available opt-in match.");
                    }}
                  >
                    Next match →
                  </button>
                )}
              </div>
            </div>

            {mode === "live" && !signedIn && <p className="experience-empty">Sign in and enable discoverability to receive consent-based matches.</p>}
            {mode === "live" && signedIn && !(data?.matches.length) && <p className="experience-empty">No compatible opt-in attendee profiles are available yet.</p>}
            {data?.connections.filter((connection) => connection.direction === "incoming" && connection.status === "pending").map((connection) => (
              <article className="incoming-request" key={connection.id}>
                <div><strong>{connection.requesterName}</strong><small>wants to connect with you</small></div>
                <button disabled={busy} onClick={() => void post({ action: "respond-connection", connectionId: connection.id, status: "accepted" }, "Connection accepted.")}>Accept</button>
                <button disabled={busy} onClick={() => void post({ action: "respond-connection", connectionId: connection.id, status: "declined" }, "Connection declined.")}>Decline</button>
              </article>
            ))}
            {data?.connections.some((connection) => connection.status === "accepted") && (
              <div className="schedule-intro">
                <label htmlFor="intro-time">Schedule a 20-minute introduction</label>
                <input id="intro-time" type="datetime-local" value={meetingTime} onChange={(event) => setMeetingTime(event.target.value)} />
                {data.connections.filter((connection) => connection.status === "accepted").map((connection) => (
                  <div key={connection.id} style={{ display: "flex", gap: 6 }}>
                    <button disabled={!meetingTime || busy} onClick={() => void post({ action: "schedule-connection", connectionId: connection.id, startsAt: new Date(meetingTime).toISOString() }, `Calendar introduction requested with ${connection.direction === "incoming" ? connection.requesterName : connection.recipientName}.`)}>
                      Book with {connection.direction === "incoming" ? connection.requesterName : connection.recipientName}
                    </button>
                    <button disabled={!meetingTime} onClick={() => downloadIcs(connection.direction === "incoming" ? connection.requesterName! : connection.recipientName!, meetingTime)}>
                      <Download size={13} />.ics
                    </button>
                  </div>
                ))}
              </div>
            )}
            {data?.matches.map((match) => {
              const requested = data.connections.some((connection) => connection.direction !== "incoming" && connection.recipientId === match.userId);
              return (
                <article className="match-card" key={match.userId}>
                  <span className="match-initials">{match.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span>
                  <div><h4>{match.displayName}</h4><p>{[match.jobTitle, match.company].filter(Boolean).join(" · ") || "Event attendee"}</p><small>{match.sharedInterests.length ? `${match.sharedInterests.length} shared: ${match.sharedInterests.join(", ")}` : "Open to new perspectives"}</small></div>
                  <button disabled={busy || requested} onClick={() => void post({ action: "request-connection", recipientId: match.userId, recipientName: match.displayName }, "Connection request recorded.")}>{requested ? "Requested" : "Connect"}</button>
                </article>
              );
            })}
            <h4 id="partner-discovery" className="scroll-target" tabIndex={-1}>Partner discovery</h4>
            {!data?.sponsors.length && <p className="experience-empty">No sponsor booths have been published.</p>}
            {data?.sponsors.map((sponsor) => (
              <article className="match-card sponsor-card" key={sponsor.id}>
                <span className="match-initials"><Sparkles size={15} /></span>
                <div>
                  <h4>{sponsor.name}</h4>
                  <p>{sponsor.description || "Event partner"}</p>
                  {sponsor.resourceUrl && (sponsor.resourceUrl === "#" ? <button type="button" className="demo-resource" onClick={() => notify("Demo resource preview only. No external page was opened.")}>Preview demo resource</button> : <a href={sponsor.resourceUrl} target="_blank" rel="noreferrer">Open resource</a>)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button disabled={busy || (mode === "demo" && demoSponsorOptIns.includes(sponsor.name))} onClick={() => void post({ action: "sponsor-interest", boothName: sponsor.name, consent: true }, `Your details were shared with ${sponsor.name} with consent.`)}>{mode === "demo" && demoSponsorOptIns.includes(sponsor.name) ? "Shared in demo" : "Share details"}</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {!loading && tab === "replay" && (
        <div className="memory-grid" id="experience-panel-replay" role="tabpanel" aria-labelledby="experience-tab-replay">
          <div className="experience-list">
            <div className="interaction-card" style={{ borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.05)" }}>
              <span style={{ color: "var(--violet)" }}><Sparkles size={13} style={{ display: "inline", marginRight: 4 }} />CONFERENCE CAPSULE EXPORT</span>
              <h4 style={{ margin: "8px 0" }}>Export published summaries and transcript highlights</h4>
              <p style={{ fontSize: 10, color: "var(--muted)", margin: "0 0 10px" }}>Builds a Markdown briefing from the event data currently available to you.</p>
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: 10, padding: "8px 12px", color: "var(--violet)", borderColor: "rgba(168, 85, 247, 0.4)" }}
                onClick={downloadConferenceCapsule}
              >
                <Download size={13} />Download conference capsule
              </button>
            </div>

            <h4>Published replays</h4>
            {!data?.replays.length && <p className="experience-empty">No recordings have been published yet.</p>}
            {data?.replays.map((replay) => (
              <article className="replay-card" key={replay.id}>
                <span><Play size={16} /></span><div><h4>{replay.title}</h4><p>{replay.summary || "Replay published by the event team."}</p></div>
                {replay.url
                  ? replay.url === "#" ? <button type="button" className="demo-resource" onClick={() => notify("Demo replay preview only. No video was opened.")}>Preview demo replay</button> : <a href={replay.url} target="_blank" rel="noreferrer">Watch</a>
                  : <span className="memory-label">Memory</span>}
              </article>
            ))}
          </div>
          <div className="transcript-search">
            <div><Captions size={20} /><span><h4>Search event transcript</h4><p>Finalized captions become a searchable conference memory.</p></span></div>
            <input type="search" value={transcriptQuery} onChange={(event) => setTranscriptQuery(event.target.value)} placeholder="Search speakers, topics, or decisions" />
            <div className="transcript-results">
              {!filteredTranscript.length && <p className="experience-empty">No transcript segments match this search.</p>}
              {filteredTranscript.slice(0, 12).map((segment) => <p key={segment.id}><strong>{segment.speakerName || "Speaker"}</strong>{segment.text}</p>)}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === "access" && (
        <form className="accessibility-panel" id="experience-panel-access" role="tabpanel" aria-labelledby="experience-tab-access" onSubmit={(event) => {
          event.preventDefault();
          window.localStorage.setItem("velocity-reduced-data", String(profile.reducedData));
          void post({ action: "save-profile", ...profile }, "Accessibility preferences were saved.");
        }}>
          <div><Languages size={23} /><span><h4>Caption language</h4><p>Live translated text appears when the room’s transcription agent publishes that language.</p></span></div>
          <select value={profile.captionLanguage} onChange={(event) => setProfile((value) => ({ ...value, captionLanguage: event.target.value }))}>
            <option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="hi">Hindi</option><option value="ja">Japanese</option>
          </select>
          <label className="consent-row"><input type="checkbox" checked={profile.reducedData} onChange={(event) => setProfile((value) => ({ ...value, reducedData: event.target.checked }))} /><span><strong>Reduced-data mode</strong><small>Start room preflight with video off and prioritize audio and captions.</small></span></label>
          <button type="submit" disabled={busy}><Check size={15} />Save accessibility settings</button>
        </form>
      )}
    </section>
  );
}
