"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  VideoConference,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  CameraOff,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  ExternalLink,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  Map,
  MessageSquareText,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  TimerReset,
  Users,
  Video,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Role = "attendee" | "producer";
type RoomId = "stage" | "studio" | "expo" | "lounge";
type LiveConnection = { token: string; serverUrl: string; roomName: string };
type ProducerUser = { displayName: string; email: string };
type ManagedParticipant = { identity: string; name: string; audioTrackSid: string | null; audioMuted: boolean };

const rooms = [
  {
    id: "stage" as RoomId,
    kicker: "LIVE NOW",
    title: "Main stage",
    description: "Building trust in an AI-first world",
    count: 286,
    accent: "coral",
    icon: Radio,
  },
  {
    id: "studio" as RoomId,
    kicker: "NEXT · 11:35",
    title: "Studio one",
    description: "The human side of transformation",
    count: 84,
    accent: "violet",
    icon: MonitorUp,
  },
  {
    id: "expo" as RoomId,
    kicker: "12 BOOTHS OPEN",
    title: "Partner expo",
    description: "Meet the teams building what comes next",
    count: 61,
    accent: "lime",
    icon: Store,
  },
  {
    id: "lounge" as RoomId,
    kicker: "18 OPEN SEATS",
    title: "Connection lounge",
    description: "Small conversations, useful introductions",
    count: 42,
    accent: "cyan",
    icon: Users,
  },
];

const people = [
  { name: "Maya Chen", role: "Chief Product Officer", initials: "MC", color: "violet" },
  { name: "Elias Brooks", role: "Futurist & Author", initials: "EB", color: "cyan" },
  { name: "Sofia Alvarez", role: "VP, Responsible AI", initials: "SA", color: "coral" },
];

const runOfShow = [
  { time: "11:00", title: "Opening film", owner: "Playback", status: "done" },
  { time: "11:03", title: "Welcome & context", owner: "Maya Chen", status: "done" },
  { time: "11:12", title: "Building trust in an AI-first world", owner: "Elias + Sofia", status: "live" },
  { time: "11:32", title: "Audience pulse", owner: "Cris", status: "next" },
  { time: "11:35", title: "Transition to Studio One", owner: "All producers", status: "queued" },
];

const initialEvents = [
  { time: "11:24:08", text: "Speaker handoff completed", tone: "good" },
  { time: "11:22:41", text: "Maya Chen returned to green room", tone: "neutral" },
  { time: "11:19:16", text: "Poll #1 closed · 214 responses", tone: "neutral" },
];

function BrandMark() {
  return (
    <div className="brand" aria-label="Velocity Venue">
      <span className="brand-mark"><i /><i /></span>
      <span>VELOCITY<span>VENUE</span></span>
    </div>
  );
}

function AvatarStack({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`avatar-stack ${compact ? "compact" : ""}`} aria-label="Active attendees">
      {people.map((person) => (
        <span className={`mini-avatar ${person.color}`} key={person.name}>{person.initials}</span>
      ))}
      <span className="mini-avatar more">+8</span>
    </div>
  );
}

function StatusPill({ children, tone = "live" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`status-pill ${tone}`}><i />{children}</span>;
}

export function ConferenceExperience({
  producerUser,
  producerSignInPath,
  producerSignOutPath,
}: {
  producerUser: ProducerUser | null;
  producerSignInPath: string;
  producerSignOutPath: string;
}) {
  const [role, setRole] = useState<Role>("attendee");
  const [room, setRoom] = useState<RoomId>("stage");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [leadSent, setLeadSent] = useState(false);
  const [leadSending, setLeadSending] = useState(false);
  const [rescueState, setRescueState] = useState<"idle" | "moving" | "complete">("idle");
  const [activeRos, setActiveRos] = useState(2);
  const [events, setEvents] = useState(initialEvents);
  const [liveDialogOpen, setLiveDialogOpen] = useState(false);
  const [liveName, setLiveName] = useState("Alex Morgan");
  const [liveJoining, setLiveJoining] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveConnection, setLiveConnection] = useState<LiveConnection | null>(null);

  const activeRoom = useMemo(() => rooms.find((item) => item.id === room) ?? rooms[0], [room]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (producerUser && new URLSearchParams(window.location.search).get("role") === "producer") {
      setRole("producer");
    }
  }, [producerUser]);

  const enterRoom = (next: RoomId) => {
    setRoom(next);
    setNotice(`You’re now in ${rooms.find((item) => item.id === next)?.title}.`);
  };

  const captureLead = async () => {
    setLeadSending(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Alex Morgan",
          email: "alex@northstar.example",
          company: "Northstar Labs",
          event: "Global Innovation Summit 2026",
          booth: "Lumen Systems",
          interest: "Responsible AI field guide",
        }),
      });
      if (!response.ok) throw new Error("Lead capture failed");
      setLeadSent(true);
      setNotice("Interest captured and routed to the event CRM.");
    } catch {
      setNotice("We couldn’t route the lead. Please try again.");
    } finally {
      setLeadSending(false);
    }
  };

  const triggerRescue = async () => {
    if (rescueState !== "idle") return;
    setRescueState("moving");
    setEvents((current) => [
      { time: "11:27:02", text: "Rescue Mode activated by Cris", tone: "warn" },
      ...current,
    ]);
    let moved = 286;
    let liveRecovery = false;
    try {
      const response = await fetch("/api/producer/room", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "rescue", room: "global-innovation-stage" }),
      });
      const payload = (await response.json()) as { moved?: number };
      if (response.ok) {
        moved = payload.moved ?? 0;
        liveRecovery = true;
      }
    } catch {
      // The visual recovery remains available as a clearly labelled demo fallback.
    }
    window.setTimeout(() => {
      setRescueState("complete");
      setEvents((current) => [
        { time: "11:27:09", text: liveRecovery ? `${moved} live participants moved to Main Stage Backup` : "Demo recovery completed for 286 attendees", tone: "good" },
        ...current,
      ]);
      setNotice(liveRecovery ? `Live recovery complete · ${moved} participants moved.` : "Demo recovery complete · connect LiveKit to move real participants.");
    }, liveRecovery ? 500 : 1700);
  };

  const resetDemo = () => {
    setRescueState("idle");
    setEvents(initialEvents);
    setNotice("Rescue simulation reset.");
  };

  const openLiveRoom = () => {
    setLiveError(null);
    setLiveDialogOpen(true);
  };

  const connectLiveRoom = async () => {
    if (!liveName.trim()) {
      setLiveError("Enter the name you want other attendees to see.");
      return;
    }
    setLiveJoining(true);
    setLiveError(null);
    try {
      const roomName = `global-innovation-${room}`;
      const response = await fetch("/api/livekit-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identity: liveName.trim(), room: roomName }),
      });
      const payload = (await response.json()) as { token?: string; serverUrl?: string; message?: string; error?: string };
      if (!response.ok || !payload.token || !payload.serverUrl) {
        throw new Error(payload.message || payload.error || "The live room is temporarily unavailable.");
      }
      setLiveConnection({ token: payload.token, serverUrl: payload.serverUrl, roomName });
      setLiveDialogOpen(false);
      setNotice("Connected securely to the live room.");
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : "The live room is temporarily unavailable.");
    } finally {
      setLiveJoining(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <BrandMark />
        <div className="event-title">
          <span>GLOBAL INNOVATION SUMMIT 2026</span>
          <small>LIVE · JUL 31</small>
        </div>
        <div className="top-actions">
          <div className="role-switch" aria-label="Switch demo role">
            <button className={role === "attendee" ? "active" : ""} onClick={() => setRole("attendee")}>Attendee</button>
            <button className={role === "producer" ? "active" : ""} onClick={() => producerUser ? setRole("producer") : window.location.assign(producerSignInPath)}>{producerUser ? "Producer" : "Producer sign in"}</button>
          </div>
          <button className="icon-button" aria-label="Notifications"><Bell size={18} /><span className="notification-dot" /></button>
          {producerUser && role === "producer" ? <a className="profile-button" href={producerSignOutPath} aria-label="Sign out of producer mode" title={`Signed in as ${producerUser.email}`}>{producerUser.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</a> : <button className="profile-button" aria-label="Open profile">AM</button>}
        </div>
      </header>

      {role === "attendee" ? (
        <AttendeeView
          room={room}
          activeRoom={activeRoom}
          enterRoom={enterRoom}
          micOn={micOn}
          setMicOn={setMicOn}
          cameraOn={cameraOn}
          setCameraOn={setCameraOn}
          chatOpen={chatOpen}
          setChatOpen={setChatOpen}
          leadSent={leadSent}
          leadSending={leadSending}
          captureLead={captureLead}
          openLiveRoom={openLiveRoom}
          liveConnected={Boolean(liveConnection)}
        />
      ) : (
        <ProducerView
          rescueState={rescueState}
          triggerRescue={triggerRescue}
          resetDemo={resetDemo}
          activeRos={activeRos}
          setActiveRos={setActiveRos}
          events={events}
          notify={setNotice}
          producerUser={producerUser!}
        />
      )}

      {liveDialogOpen && (
        <LiveJoinDialog
          name={liveName}
          setName={setLiveName}
          roomTitle={activeRoom.title}
          joining={liveJoining}
          error={liveError}
          close={() => setLiveDialogOpen(false)}
          connect={connectLiveRoom}
        />
      )}

      {liveConnection && (
        <ConnectedLiveRoom
          connection={liveConnection}
          roomTitle={activeRoom.title}
          cameraOn={cameraOn}
          micOn={micOn}
          leave={() => setLiveConnection(null)}
        />
      )}

      {notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}
    </main>
  );
}

function AttendeeView({
  room,
  activeRoom,
  enterRoom,
  micOn,
  setMicOn,
  cameraOn,
  setCameraOn,
  chatOpen,
  setChatOpen,
  leadSent,
  leadSending,
  captureLead,
  openLiveRoom,
  liveConnected,
}: {
  room: RoomId;
  activeRoom: (typeof rooms)[number];
  enterRoom: (room: RoomId) => void;
  micOn: boolean;
  setMicOn: (value: boolean) => void;
  cameraOn: boolean;
  setCameraOn: (value: boolean) => void;
  chatOpen: boolean;
  setChatOpen: (value: boolean) => void;
  leadSent: boolean;
  leadSending: boolean;
  captureLead: () => void;
  openLiveRoom: () => void;
  liveConnected: boolean;
}) {
  return (
    <div className="attendee-layout">
      <aside className="side-nav">
        <div>
          <button className="nav-item active"><Map size={20} /><span>Venue</span></button>
          <button className="nav-item"><CalendarDays size={20} /><span>Agenda</span></button>
          <button className="nav-item"><Users size={20} /><span>People</span></button>
          <button className="nav-item"><Store size={20} /><span>Expo</span></button>
        </div>
        <div>
          <button className="nav-item"><CircleHelp size={20} /><span>Help</span></button>
        </div>
      </aside>

      <section className="venue-content">
        <div className="welcome-row">
          <div>
            <span className="eyebrow"><Sparkles size={14} /> YOUR EVENT, IN MOTION</span>
            <h1>Good morning, Alex.</h1>
            <p>Everything happening now—without the conference chaos.</p>
          </div>
          <div className="global-pulse"><Activity size={16} /><strong>431</strong><span>people here now</span></div>
        </div>

        <section className="live-feature">
          <div className="feature-copy">
            <StatusPill>LIVE · MAIN STAGE</StatusPill>
            <h2>Building trust in<br />an AI-first world</h2>
            <p>Maya Chen, Elias Brooks and Sofia Alvarez unpack what responsible innovation looks like when the stakes are real.</p>
            <div className="speaker-row"><AvatarStack /><span>3 speakers · 286 watching</span></div>
            <button className="primary-button" onClick={() => room === "stage" ? openLiveRoom() : enterRoom("stage")}>{room === "stage" ? "Join live room" : "Join main stage"}<ArrowRight size={17} /></button>
          </div>
          <div className="stage-visual" aria-label="Live speaker preview">
            {people.map((person, index) => (
              <div className={`speaker-tile speaker-${index + 1}`} key={person.name}>
                <div className={`speaker-portrait ${person.color}`}>{person.initials}</div>
                <div className="speaker-label"><i />{person.name}<small>{person.role}</small></div>
              </div>
            ))}
            <div className="signal-lines" />
            <div className="live-corner"><span>LIVE</span><strong>48:12</strong></div>
          </div>
        </section>

        <div className="section-heading">
          <div><span className="eyebrow">EXPLORE THE VENUE</span><h3>Where do you want to go?</h3></div>
          <button className="text-button">View full agenda <ChevronRight size={16} /></button>
        </div>

        <div className="room-grid">
          {rooms.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`room-card ${item.accent} ${room === item.id ? "selected" : ""}`} onClick={() => enterRoom(item.id)}>
                <div className="room-top"><span className="room-icon"><Icon size={19} /></span><span className="room-count"><Users size={13} />{item.count}</span></div>
                <small>{item.kicker}</small>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <span className="room-link">Enter space <ArrowRight size={15} /></span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="right-rail">
        <div className="now-card">
          <div className="rail-title"><span>YOU ARE HERE</span><MoreHorizontal size={18} /></div>
          <div className={`now-icon ${activeRoom.accent}`}><activeRoom.icon size={22} /></div>
          <h3>{activeRoom.title}</h3>
          <p>{activeRoom.description}</p>
          <div className="media-controls">
            <button className={!micOn ? "off" : ""} onClick={() => setMicOn(!micOn)} aria-label={micOn ? "Mute microphone" : "Unmute microphone"}>{micOn ? <Mic size={18} /> : <MicOff size={18} />}</button>
            <button className={!cameraOn ? "off" : ""} onClick={() => setCameraOn(!cameraOn)} aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}>{cameraOn ? <Camera size={18} /> : <CameraOff size={18} />}</button>
            <button onClick={() => setChatOpen(!chatOpen)} aria-label="Toggle chat"><MessageSquareText size={18} /></button>
          </div>
          {room !== "expo" && <button className="join-live-button" onClick={openLiveRoom}><Video size={15} />{liveConnected ? "Reopen live room" : "Connect to live room"}</button>}
          <div className="connection-status"><i /> {liveConnected ? "LiveKit room connected" : "Secure media preflight ready"}</div>
        </div>

        {room === "expo" ? (
          <div className="expo-spotlight">
            <span className="eyebrow">FEATURED PARTNER</span>
            <div className="lumen-logo">LU<span>MEN</span></div>
            <h3>Make responsible AI operational.</h3>
            <p>Take the field guide used by product leaders across regulated industries.</p>
            <button className="secondary-button"><Download size={16} />Download guide</button>
            <button className={`primary-button full ${leadSent ? "success" : ""}`} onClick={captureLead} disabled={leadSending || leadSent}>{leadSent ? <><Check size={16} />Interest captured</> : leadSending ? "Routing…" : <>I’m interested <ExternalLink size={15} /></>}</button>
          </div>
        ) : (
          <>
            <div className="rail-block">
              <div className="rail-title"><span>UP NEXT</span><Clock3 size={16} /></div>
              <strong>11:35 · Studio One</strong>
              <h4>The human side of transformation</h4>
              <button className="text-button" onClick={() => enterRoom("studio")}>Save my seat <ChevronRight size={15} /></button>
            </div>
            <div className="rail-block">
              <div className="rail-title"><span>PEOPLE TO MEET</span><WandSparkles size={16} /></div>
              <div className="match-person"><span className="mini-avatar violet">NP</span><div><strong>Noor Patel</strong><small>3 shared interests</small></div><button aria-label="Connect with Noor"><Send size={15} /></button></div>
              <div className="match-person"><span className="mini-avatar coral">JW</span><div><strong>Jonas Weber</strong><small>Also in responsible AI</small></div><button aria-label="Connect with Jonas"><Send size={15} /></button></div>
            </div>
          </>
        )}
      </aside>

      {chatOpen && (
        <div className="chat-panel">
          <div className="chat-head"><div><strong>Stage conversation</strong><small>286 participants</small></div><button onClick={() => setChatOpen(false)} aria-label="Close chat"><X size={18} /></button></div>
          <div className="chat-messages">
            <p><strong>Priya</strong> The governance point is so important.</p>
            <p><strong>Daniel</strong> Would love the framework Sofia mentioned.</p>
            <p className="producer-message"><strong>Producer</strong> Drop your questions below—we’ll bring three to the stage.</p>
          </div>
          <div className="chat-input"><input aria-label="Chat message" placeholder="Share a thought…" /><button aria-label="Send message"><Send size={16} /></button></div>
        </div>
      )}
    </div>
  );
}

function LiveJoinDialog({
  name,
  setName,
  roomTitle,
  joining,
  error,
  close,
  connect,
}: {
  name: string;
  setName: (value: string) => void;
  roomTitle: string;
  joining: boolean;
  error: string | null;
  close: () => void;
  connect: () => void;
}) {
  return (
    <div className="live-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <form className="live-dialog" role="dialog" aria-modal="true" aria-labelledby="live-dialog-title" onSubmit={(event) => { event.preventDefault(); connect(); }}>
        <button className="live-dialog-close" type="button" onClick={close} aria-label="Close live room setup"><X size={19} /></button>
        <span className="eyebrow"><ShieldCheck size={14} /> SECURE ROOM PRE-FLIGHT</span>
        <h2 id="live-dialog-title">Join {roomTitle}</h2>
        <p>Your camera and microphone remain under your control. You can change devices after joining.</p>
        <label htmlFor="live-display-name">Display name</label>
        <input id="live-display-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={64} autoFocus />
        <div className="preflight-devices">
          <span><Mic size={16} />Microphone ready</span>
          <span><Camera size={16} />Camera ready</span>
        </div>
        {error && <div className="live-error" role="alert"><AlertTriangle size={16} /><span><strong>Live connection not configured</strong>{error}</span></div>}
        <button className="primary-button full" type="submit" disabled={joining}>{joining ? "Connecting securely…" : "Enter live room"}<ArrowRight size={16} /></button>
        <button className="live-demo-link" type="button" onClick={close}>Continue exploring the interactive demo</button>
      </form>
    </div>
  );
}

function ConnectedLiveRoom({
  connection,
  roomTitle,
  cameraOn,
  micOn,
  leave,
}: {
  connection: LiveConnection;
  roomTitle: string;
  cameraOn: boolean;
  micOn: boolean;
  leave: () => void;
}) {
  return (
    <div className="live-room-overlay" role="dialog" aria-modal="true" aria-label={`${roomTitle} live room`}>
      <LiveKitRoom
        className="live-room-shell"
        token={connection.token}
        serverUrl={connection.serverUrl}
        connect
        video={cameraOn}
        audio={micOn}
        onDisconnected={leave}
        data-lk-theme="default"
      >
        <header className="live-room-header">
          <div><StatusPill>LIVE</StatusPill><span>{roomTitle}</span><small>{connection.roomName}</small></div>
          <button onClick={leave}><X size={18} />Leave room</button>
        </header>
        <div className="live-room-conference"><VideoConference /></div>
        <RoomAudioRenderer />
        <StartAudio label="Enable room audio" />
      </LiveKitRoom>
    </div>
  );
}

function ProducerView({
  rescueState,
  triggerRescue,
  resetDemo,
  activeRos,
  setActiveRos,
  events,
  notify,
  producerUser,
}: {
  rescueState: "idle" | "moving" | "complete";
  triggerRescue: () => void;
  resetDemo: () => void;
  activeRos: number;
  setActiveRos: (index: number) => void;
  events: { time: string; text: string; tone: string }[];
  notify: (message: string) => void;
  producerUser: ProducerUser;
}) {
  const [managedParticipants, setManagedParticipants] = useState<ManagedParticipant[]>([]);
  const [participantStatus, setParticipantStatus] = useState<"loading" | "ready" | "demo" | "error">("loading");

  const refreshParticipants = async () => {
    setParticipantStatus("loading");
    try {
      const response = await fetch("/api/producer/room?room=global-innovation-stage", { cache: "no-store" });
      const payload = (await response.json()) as { participants?: ManagedParticipant[] };
      if (!response.ok) {
        setManagedParticipants([]);
        setParticipantStatus(response.status === 503 ? "demo" : "error");
        return;
      }
      setManagedParticipants(payload.participants ?? []);
      setParticipantStatus("ready");
    } catch {
      setParticipantStatus("error");
    }
  };

  useEffect(() => {
    void refreshParticipants();
  }, []);

  const manageParticipant = async (action: "remove" | "mute", participant: ManagedParticipant) => {
    const response = await fetch("/api/producer/room", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, room: "global-innovation-stage", identity: participant.identity, trackSid: participant.audioTrackSid }),
    });
    if (!response.ok) {
      notify("The producer action could not be completed.");
      return;
    }
    notify(action === "remove" ? `${participant.name} was removed from the live room.` : `${participant.name} was muted.`);
    await refreshParticipants();
  };

  return (
    <div className="producer-layout">
      <aside className="producer-nav">
        <div className="producer-label">PRODUCER MODE</div>
        <button className="producer-nav-item active"><LayoutDashboard size={18} />Show overview</button>
        <button className="producer-nav-item"><TimerReset size={18} />Run of show</button>
        <button className="producer-nav-item"><Video size={18} />Rooms & stages</button>
        <button className="producer-nav-item"><Users size={18} />Speakers</button>
        <button className="producer-nav-item"><MessageSquareText size={18} />Engagement</button>
        <button className="producer-nav-item"><Gauge size={18} />Event data</button>
        <div className="nav-divider" />
        <button className="producer-nav-item"><LifeBuoy size={18} />Support queue <span>2</span></button>
        <div className="event-health"><div><HeartPulse size={17} /><span>EVENT HEALTH</span></div><strong>99.8%</strong><small>All critical systems normal</small></div>
      </aside>

      <section className="command-content">
        <div className="command-heading">
          <div><span className="eyebrow"><Radio size={13} /> SHOW IS LIVE · SIGNED IN</span><h1>Good morning, {producerUser.displayName.split(" ")[0]}.</h1><p>You’re 24 minutes into the program. Everything is on time.</p></div>
          <div className="command-actions"><button className="secondary-button" onClick={() => notify("Announcement sent to all attendees.")}><Bell size={16} />Send announcement</button><button className="primary-button"><ExternalLink size={15} />Open attendee view</button></div>
        </div>

        {rescueState !== "idle" && (
          <div className={`rescue-banner ${rescueState}`}>
            <div className="rescue-symbol">{rescueState === "moving" ? <Zap size={24} /> : <ShieldCheck size={24} />}</div>
            <div><span>{rescueState === "moving" ? "RESCUE MODE ACTIVE" : "RECOVERY COMPLETE"}</span><strong>{rescueState === "moving" ? "Moving the audience to Main Stage Backup…" : "286 attendees reconnected in 7 seconds"}</strong><small>{rescueState === "moving" ? "Conference state is preserved. No attendee action required." : "Chat, agenda and engagement history remained available."}</small></div>
            {rescueState === "complete" && <button onClick={resetDemo}>Reset demo</button>}
          </div>
        )}

        <div className="metric-grid">
          <MetricCard label="ATTENDEES ONLINE" value="431" change="+38 in 10 min" icon={Users} tone="cyan" />
          <MetricCard label="ACTIVE ROOMS" value="4 / 6" change="2 scheduled later" icon={Radio} tone="violet" />
          <MetricCard label="OPEN SUPPORT" value="2" change="Median reply 0:42" icon={LifeBuoy} tone="coral" />
          <MetricCard label="ENGAGEMENT" value="87%" change="Above event target" icon={Activity} tone="lime" />
        </div>

        <div className="command-grid">
          <section className="panel run-panel">
            <div className="panel-head"><div><span className="eyebrow">LIVE CONTROL</span><h2>Run of show</h2></div><span className="on-time"><Check size={13} />ON TIME</span></div>
            <div className="ros-list">
              {runOfShow.map((item, index) => (
                <button key={item.time} className={`ros-item ${index === activeRos ? "active" : ""} ${index < activeRos ? "done" : ""}`} onClick={() => setActiveRos(index)}>
                  <span className="ros-time">{item.time}</span><span className="ros-line"><i /></span><span className="ros-copy"><strong>{item.title}</strong><small>{item.owner}</small></span><span className="ros-status">{index < activeRos ? <Check size={14} /> : index === activeRos ? "LIVE" : item.status === "next" ? "NEXT" : ""}</span>
                </button>
              ))}
            </div>
            <div className="cue-actions"><span>Quick cue</span><button onClick={() => notify("“Stand by” sent privately to the next speaker.")}>Stand by</button><button onClick={() => notify("“2 minutes” sent privately to all active speakers.")}>2 minutes</button><button onClick={() => notify("“Wrap up” sent privately to the active speaker.")}>Wrap up</button></div>
          </section>

          <section className="panel room-health-panel">
            <div className="panel-head"><div><span className="eyebrow">ROOM MONITOR</span><h2>Live spaces</h2></div><button className="icon-button"><MoreHorizontal size={18} /></button></div>
            <div className="health-room">
              <div className="health-room-head"><span className="health-icon coral"><Radio size={16} /></span><div><strong>Main Stage</strong><small>Live · 286 attendees</small></div><StatusPill tone="healthy">Healthy</StatusPill></div>
              <div className="health-stats"><span><i className="green" />Media <strong>Excellent</strong></span><span>Latency <strong>112 ms</strong></span><span>Speakers <strong>3 / 3</strong></span></div>
              <div className="health-actions"><button onClick={() => notify("Main Stage monitor opened.")}><MonitorUp size={15} />Monitor</button><button className="danger-outline" onClick={triggerRescue} disabled={rescueState !== "idle"}><ShieldCheck size={15} />Activate Rescue Mode</button></div>
              <div className="live-participants">
                <div><strong>LIVEKIT PARTICIPANTS</strong><button onClick={refreshParticipants}>Refresh</button></div>
                {participantStatus === "loading" && <p>Checking the live room…</p>}
                {participantStatus === "demo" && <p>Demo data shown until LiveKit credentials are connected.</p>}
                {participantStatus === "error" && <p>Live participant status is temporarily unavailable.</p>}
                {participantStatus === "ready" && managedParticipants.length === 0 && <p>The live room is ready and currently empty.</p>}
                {managedParticipants.slice(0, 4).map((participant) => (
                  <div className="managed-participant" key={participant.identity}>
                    <span className="mini-avatar cyan">{participant.name.slice(0, 2).toUpperCase()}</span>
                    <span><strong>{participant.name}</strong><small>{participant.audioTrackSid ? participant.audioMuted ? "Audio muted" : "Audio live" : "No audio track"}</small></span>
                    <button onClick={() => manageParticipant("mute", participant)} disabled={!participant.audioTrackSid || participant.audioMuted}>Mute</button>
                    <button className="remove" onClick={() => manageParticipant("remove", participant)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="health-room compact-room"><span className="health-icon violet"><MonitorUp size={16} /></span><div><strong>Studio One</strong><small>Green room · 5 speakers</small></div><span className="ready-state"><i />Ready</span></div>
            <div className="health-room compact-room"><span className="health-icon lime"><Store size={16} /></span><div><strong>Partner Expo</strong><small>12 booths · 61 attendees</small></div><span className="ready-state"><i />Open</span></div>
            <div className="health-room compact-room warning"><span className="health-icon cyan"><Users size={16} /></span><div><strong>Connection Lounge</strong><small>18 open seats</small></div><span className="ready-state amber"><i />Review</span></div>
          </section>
        </div>

        <div className="bottom-grid">
          <section className="panel activity-panel">
            <div className="panel-head"><div><span className="eyebrow">OPERATIONAL RECORD</span><h2>Event activity</h2></div><button className="text-button">View incident log <ChevronRight size={15} /></button></div>
            <div className="event-list">{events.slice(0, 4).map((event, index) => <div className="event-row" key={`${event.time}-${index}`}><span>{event.time}</span><i className={event.tone} /><strong>{event.text}</strong></div>)}</div>
          </section>
          <section className="panel support-panel">
            <div className="panel-head"><div><span className="eyebrow">NEEDS ATTENTION</span><h2>Support queue</h2></div><span className="queue-count">2 OPEN</span></div>
            <div className="support-ticket"><span className="mini-avatar coral">RK</span><div><strong>Rina Kapoor</strong><small>Can’t share screen · Studio One</small></div><button onClick={() => notify("You joined Rina’s private support room.")}>Join</button></div>
            <div className="support-ticket"><span className="mini-avatar violet">DM</span><div><strong>David Mills</strong><small>Audio echo · Green room</small></div><button onClick={() => notify("You joined David’s private support room.")}>Join</button></div>
          </section>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, change, icon: Icon, tone }: { label: string; value: string; change: string; icon: typeof Users; tone: string }) {
  return <div className="metric-card"><span className={`metric-icon ${tone}`}><Icon size={18} /></span><small>{label}</small><strong>{value}</strong><p><i />{change}</p></div>;
}
