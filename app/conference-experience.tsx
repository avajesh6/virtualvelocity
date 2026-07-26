"use client";

import {
  LiveKitRoom,
  type LocalUserChoices,
  PreJoin,
  RoomAudioRenderer,
  StartAudio,
  VideoConference,
  useConnectionState,
  useParticipants,
  useTranscriptions,
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
  Captions,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  ExternalLink,
  Gauge,
  Globe,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  Map,
  MessageSquareText,
  Mic,
  MicOff,
  Moon,
  MonitorUp,
  MoreHorizontal,
  Radio,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  TimerReset,
  Users,
  Video,
  WandSparkles,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "./supabase-client";
import { VENUE_ROOMS, type VenueRoomId } from "./venue-config";
import { EventExperienceHub } from "./event-experience-hub";
import { ProducerIntelligenceCenter } from "./producer-intelligence-center";
import { AgoraRoom } from "./agora-room";

type Role = "attendee" | "producer";
type Theme = "dark" | "light";
type AppMode = "live" | "demo";
type RoomId = VenueRoomId;
type LiveConnection = {
  token: string;
  serverUrl: string;
  roomName: string;
  choices: LocalUserChoices;
};
type AgoraConnection = {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  choices: LocalUserChoices;
};
type ProducerUser = { displayName: string; email: string; role: Role };
type ManagedParticipant = { identity: string; name: string; audioTrackSid: string | null; audioMuted: boolean };
type RunOfShowItem = {
  id?: number;
  scheduledTime: string;
  title: string;
  owner: string;
  status: string;
};
type OperationalEvent = {
  id?: number;
  createdAt?: string;
  detail: string;
  action?: string;
};
type SupportTicket = {
  id: number;
  requesterName: string;
  requesterEmail: string;
  roomName: string;
  issue: string;
  status: "open" | "in_progress" | "resolved";
  assignedTo: string;
  createdAt: string;
};
type VenueSnapshot = {
  eventName: string;
  serverTime: string;
  mediaAvailable: boolean;
  mediaError: string | null;
  scheduleAvailable: boolean;
  totalParticipants: number;
  activeRooms: number;
  rooms: Array<{
    id: RoomId;
    roomName: string;
    title: string;
    participantCount: number;
  }>;
  runOfShow: RunOfShowItem[];
  announcements: Array<{ id: number; detail: string; createdAt: string }>;
};

const demoRooms = [
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

const liveRoomPresentation = [
  {
    id: "stage" as RoomId,
    kicker: "LIVE ROOM",
    title: "Main stage",
    description: "Primary conference room",
    accent: "coral",
    icon: Radio,
  },
  {
    id: "studio" as RoomId,
    kicker: "LIVE ROOM",
    title: "Studio one",
    description: "Breakout and speaker room",
    accent: "violet",
    icon: MonitorUp,
  },
  {
    id: "expo" as RoomId,
    kicker: "LIVE ROOM",
    title: "Expo room",
    description: "Partner and product conversations",
    accent: "lime",
    icon: Store,
  },
  {
    id: "lounge" as RoomId,
    kicker: "LIVE ROOM",
    title: "Connection lounge",
    description: "Open networking room",
    accent: "cyan",
    icon: Users,
  },
];

const demoPeople = [
  { name: "Maya Chen", role: "Chief Product Officer", initials: "MC", color: "violet" },
  { name: "Elias Brooks", role: "Futurist & Author", initials: "EB", color: "cyan" },
  { name: "Sofia Alvarez", role: "VP, Responsible AI", initials: "SA", color: "coral" },
];

const demoRunOfShow = [
  { time: "11:00", title: "Opening film", owner: "Playback", status: "done" },
  { time: "11:03", title: "Welcome & context", owner: "Maya Chen", status: "done" },
  { time: "11:12", title: "Building trust in an AI-first world", owner: "Elias + Sofia", status: "live" },
  { time: "11:32", title: "Audience pulse", owner: "Cris", status: "next" },
  { time: "11:35", title: "Transition to Studio One", owner: "All producers", status: "queued" },
];

const demoEvents = [
  { time: "11:24:08", text: "Speaker handoff completed", tone: "good" },
  { time: "11:22:41", text: "Maya Chen returned to green room", tone: "neutral" },
  { time: "11:19:16", text: "Poll #1 closed · 214 responses", tone: "neutral" },
];

type DisplayRoom = {
  id: RoomId;
  kicker: string;
  title: string;
  description: string;
  count: number;
  accent: string;
  icon: typeof Radio;
};

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
      {demoPeople.map((person) => (
        <span className={`mini-avatar ${person.color}`} key={person.name}>{person.initials}</span>
      ))}
      <span className="mini-avatar more">+8</span>
    </div>
  );
}

function StatusPill({ children, tone = "live" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`status-pill ${tone}`}><i />{children}</span>;
}

export function ConferenceExperience() {
  // The attendee and producer experiences share one shell so a producer can
  // inspect the attendee surface without losing the authenticated session.
  // Deterministic initial values keep the server and first browser render
  // identical. Device preferences are restored immediately after hydration.
  const [theme, setTheme] = useState<Theme>("dark");
  const [mode, setMode] = useState<AppMode>("live");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [localHour, setLocalHour] = useState(12);
  const [role, setRole] = useState<Role>("attendee");
  const [producerUser, setProducerUser] = useState<ProducerUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomId>("stage");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsUnread, setNotificationsUnread] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [leadSent, setLeadSent] = useState(false);
  const [leadSending, setLeadSending] = useState(false);
  const [rescueState, setRescueState] = useState<"idle" | "moving" | "complete">("idle");
  const [, setActiveRos] = useState(2);
  const [events, setEvents] = useState(demoEvents);
  const [liveDialogOpen, setLiveDialogOpen] = useState(false);
  const [liveJoining, setLiveJoining] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveConnection, setLiveConnection] = useState<LiveConnection | null>(null);
  const [agoraConnection, setAgoraConnection] = useState<AgoraConnection | null>(null);
  const [activeEngine, setActiveEngine] = useState<"livekit" | "agora">("livekit");
  const [venueSnapshot, setVenueSnapshot] = useState<VenueSnapshot | null>(null);
  const [venueStatus, setVenueStatus] = useState<"loading" | "ready" | "error">("loading");

  const displayRooms = useMemo(() => {
    if (mode === "demo") return demoRooms;
    return liveRoomPresentation.map((presentation) => ({
      ...presentation,
      count: venueSnapshot?.rooms.find((item) => item.id === presentation.id)?.participantCount ?? 0,
    }));
  }, [mode, venueSnapshot]);
  const activeRoom = useMemo(
    () => displayRooms.find((item) => item.id === room) ?? displayRooms[0],
    [displayRooms, room],
  );
  const greeting = localHour < 12 ? "Good morning" : localHour < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("velocity-theme");
    const storedMode = window.localStorage.getItem("velocity-mode");
    const reducedData = window.localStorage.getItem("velocity-reduced-data") === "true";
    queueMicrotask(() => {
      setTheme(
        storedTheme === "light" || storedTheme === "dark"
          ? storedTheme
          : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark",
      );
      setMode(storedMode === "demo" ? "demo" : "live");
      setLocalHour(new Date().getHours());
      if (reducedData) setCameraOn(false);
      setPreferencesReady(true);
    });
  }, []);

  useEffect(() => {
    // Theme is a device-local preference, so browser storage is appropriate.
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem("velocity-mode", mode);
    if (mode === "demo") {
      queueMicrotask(() => setVenueStatus("ready"));
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch("/api/venue", { cache: "no-store" });
        if (!response.ok) throw new Error("Venue status request failed");
        const payload = await response.json() as VenueSnapshot;
        if (!cancelled) {
          setVenueSnapshot(payload);
          setVenueStatus("ready");
        }
      } catch {
        if (!cancelled) setVenueStatus("error");
      }
    };
    queueMicrotask(() => setVenueStatus("loading"));
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [mode, preferencesReady]);

  useEffect(() => {
    queueMicrotask(() => {
      setNotificationsUnread(mode === "demo" || Boolean(venueSnapshot?.announcements.length));
    });
  }, [mode, venueSnapshot?.announcements.length]);

  useEffect(() => {
    // Invite URLs use the stable venue room id. Accept the older full LiveKit
    // room name as well so previously copied links continue to work.
    const requested = new URLSearchParams(window.location.search)
      .get("room")
      ?.replace(/^(global-innovation|velocity-venue)-/, "");
    const invitedRoom = VENUE_ROOMS.find((item) => item.id === requested)?.id;
    if (invitedRoom) {
      queueMicrotask(() => {
        setRoom(invitedRoom);
        setLiveDialogOpen(true);
      });
    }
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      window.localStorage.setItem("velocity-theme", next);
      return next;
    });
  };

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const closeTransientPanels = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNotificationsOpen(false);
      setChatOpen(false);
      setAuthDialogOpen(false);
      setLiveDialogOpen(false);
    };
    window.addEventListener("keydown", closeTransientPanels);
    return () => window.removeEventListener("keydown", closeTransientPanels);
  }, []);

  useEffect(() => {
    // Supabase owns browser session refresh. This effect mirrors only the
    // verified, server-derived role into application state.
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      queueMicrotask(() => setAuthReady(true));
      return;
    }

    const applySession = async (token: string | null) => {
      setAccessToken(token);
      if (!token) {
        setProducerUser(null);
        setRole("attendee");
        setAuthReady(true);
        return;
      }
      try {
        // Never derive producer access from the JWT in the browser. The server
        // verifies the token and applies metadata/allowlist authorization.
        const response = await fetch("/api/auth/me", {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload = await response.json() as {
          user?: ProducerUser;
          error?: string;
        };
        if (!response.ok || !payload.user) {
          throw new Error(payload.error || "Your account could not be verified.");
        }
        setProducerUser(payload.user);
        if (
          payload.user.role === "producer" &&
          new URLSearchParams(window.location.search).get("role") === "producer"
        ) {
          setRole("producer");
        }
      } catch (error) {
        setProducerUser(null);
        setAuthError(error instanceof Error ? error.message : "Your account could not be verified.");
      } finally {
        setAuthReady(true);
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session?.access_token ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.access_token ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError("Supabase authentication is not configured.");
      return;
    }
    setAuthSubmitting(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });
    if (error || !data.session) {
      setAuthError(error?.message || "The email or password was not accepted.");
      setAuthSubmitting(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/me", {
        headers: { authorization: `Bearer ${data.session.access_token}` },
        cache: "no-store",
      });
      const payload = await response.json() as {
        user?: ProducerUser;
        error?: string;
      };
      if (!response.ok || !payload.user) {
        throw new Error(payload.error || "Your account could not be verified.");
      }
      setAccessToken(data.session.access_token);
      setProducerUser(payload.user);
      setAuthDialogOpen(false);
      setAuthPassword("");
      setNotice(
        payload.user.role === "producer"
          ? "Producer account verified."
          : "Attendee account verified.",
      );
      if (payload.user.role === "producer") setRole("producer");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Your account could not be verified.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const signInWithGoogle = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError("Supabase authentication is not configured.");
      return;
    }
    setAuthSubmitting(true);
    setAuthError(null);

    // Supabase owns OAuth state validation and returns the resulting session to
    // its browser client. The role query restores Producer mode after redirect,
    // but the server still decides whether this Google account is a producer.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/?role=producer`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setAuthError(error.message || "Google sign-in could not be started.");
      setAuthSubmitting(false);
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    setProducerUser(null);
    setAccessToken(null);
    setRole("attendee");
    setNotice("You have signed out.");
  };

  const openProducer = () => {
    if (!producerUser) {
      setAuthError(null);
      setAuthDialogOpen(true);
      return;
    }
    if (producerUser.role !== "producer") {
      setNotice("This account has attendee access only.");
      return;
    }
    setRole("producer");
  };

  const enterRoom = (next: RoomId) => {
    setRoom(next);
    setNotice(`You’re now viewing ${displayRooms.find((item) => item.id === next)?.title}.`);
  };

  const captureLead = async () => {
    // The lead endpoint reports persistence and routing separately; the
    // attendee interaction stays simple while the server handles fan-out.
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
    if (mode === "demo") {
      setEvents((current) => [
        { time: new Date().toLocaleTimeString(), text: "Demo Rescue Mode activated", tone: "warn" },
        ...current,
      ]);
      window.setTimeout(() => {
        setRescueState("complete");
        setEvents((current) => [
          { time: new Date().toLocaleTimeString(), text: "Demo recovery completed for 286 attendees", tone: "good" },
          ...current,
        ]);
        setNotice("Demo recovery complete. No live participants were affected.");
      }, 1_200);
      return;
    }
    try {
      const response = await fetch("/api/producer/room", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ action: "rescue", room: "velocity-venue-stage" }),
      });
      const payload = (await response.json()) as { moved?: number };
      if (!response.ok) throw new Error("Live recovery failed");
      setRescueState("complete");
      setNotice(`Live recovery complete · ${payload.moved ?? 0} participants moved.`);
    } catch {
      setRescueState("idle");
      setNotice("Live recovery failed. No simulated recovery was shown.");
    }
  };

  const resetDemo = () => {
    setRescueState("idle");
    setEvents(demoEvents);
    setNotice("Rescue simulation reset.");
  };

  const openLiveRoom = (nextRoom?: RoomId) => {
    if (nextRoom) setRoom(nextRoom);
    setLiveError(null);
    setLiveDialogOpen(true);
  };

  const connectLiveRoom = async (choices: LocalUserChoices) => {
    if (!choices.username.trim()) {
      setLiveError("Enter the name you want other attendees to see.");
      return;
    }
    setLiveJoining(true);
    setLiveError(null);
    try {
      const roomName = VENUE_ROOMS.find((item) => item.id === room)?.roomName;
      if (!roomName) throw new Error("This room is not configured.");

      if (activeEngine === "agora") {
        const response = await fetch("/api/agora-token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ channelName: roomName }),
        });
        const payload = (await response.json()) as { token?: string; appId?: string; channelName?: string; uid?: number; error?: string };
        if (!response.ok || !payload.token || !payload.appId || !payload.channelName || !payload.uid) {
          throw new Error(payload.error || "Agora engine room token generation failed.");
        }
        setMicOn(choices.audioEnabled);
        setCameraOn(choices.videoEnabled);
        setAgoraConnection({
          appId: payload.appId,
          channelName: payload.channelName,
          token: payload.token,
          uid: payload.uid,
          choices: { ...choices, username: choices.username.trim() },
        });
        setLiveConnection(null);
        setLiveDialogOpen(false);
        setNotice("Agora credentials accepted. Connecting media devices…");
        return;
      }

      // Request a LiveKit room-scoped token
      const response = await fetch("/api/livekit-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: choices.username.trim(), room: roomName }),
      });
      const payload = (await response.json()) as { token?: string; serverUrl?: string; message?: string; error?: string };
      if (!response.ok || !payload.token || !payload.serverUrl) {
        throw new Error(payload.message || payload.error || "The live room is temporarily unavailable.");
      }
      setMicOn(choices.audioEnabled);
      setCameraOn(choices.videoEnabled);
      setLiveConnection({
        token: payload.token,
        serverUrl: payload.serverUrl,
        roomName,
        choices: { ...choices, username: choices.username.trim() },
      });
      setAgoraConnection(null);
      setLiveDialogOpen(false);
      setNotice("Connected securely to the LiveKit room.");
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
          <span>{mode === "demo" ? "DEMO EVENT" : venueSnapshot?.eventName ?? "VELOCITY VENUE"}</span>
          <small>{mode === "demo" ? "DEMO DATA · NO LIVE IMPACT" : venueStatus === "ready" ? "LIVE DATA" : venueStatus.toUpperCase()}</small>
        </div>
        <div className="top-actions">
          <div className="role-switch mode-switch" aria-label="Choose data mode">
            <button className={mode === "live" ? "active" : ""} onClick={() => setMode("live")}>Live</button>
            <button className={mode === "demo" ? "active" : ""} onClick={() => setMode("demo")}>Demo</button>
          </div>
          <div className="role-switch" aria-label="Switch app role">
            <button className={role === "attendee" ? "active" : ""} onClick={() => setRole("attendee")}>Attendee</button>
            <button className={role === "producer" ? "active" : ""} onClick={openProducer} disabled={!authReady}>{producerUser?.role === "producer" ? "Producer" : "Producer sign in"}</button>
          </div>
          <button
            className="icon-button theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <div className="notification-control">
            <button
              className="icon-button"
              type="button"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              aria-controls="notification-menu"
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <Bell size={18} />
              {notificationsUnread && <span className="notification-dot" />}
            </button>
            {notificationsOpen && (
              <section className="notification-menu" id="notification-menu" aria-label="Recent notifications">
                <div><strong>{mode === "demo" ? "Demo notifications" : "Announcements"}</strong><span>{mode === "demo" ? 3 : venueSnapshot?.announcements.length ?? 0} recent</span></div>
                {mode === "demo" ? (
                  <>
                    <button type="button" onClick={() => { setNotificationsOpen(false); setNotice("Demo: Main Stage is live and healthy."); }}><Radio size={15} /><span><strong>Main Stage is live</strong><small>All speakers connected · demo</small></span></button>
                    <button type="button" onClick={() => { setNotificationsOpen(false); setNotice("Demo: Studio One opens soon."); }}><Video size={15} /><span><strong>Studio One opens soon</strong><small>Device check at 11:25 · demo</small></span></button>
                    <button type="button" onClick={() => { setNotificationsOpen(false); enterRoom("expo"); }}><Store size={15} /><span><strong>Partner expo is open</strong><small>12 booths available · demo</small></span></button>
                  </>
                ) : venueSnapshot?.announcements.length ? (
                  venueSnapshot.announcements.map((announcement) => (
                    <button key={announcement.id} type="button" onClick={() => { setNotificationsOpen(false); setNotice(announcement.detail); }}>
                      <Bell size={15} /><span><strong>{announcement.detail}</strong><small>{new Date(announcement.createdAt).toLocaleString()}</small></span>
                    </button>
                  ))
                ) : <p className="empty-state">No producer announcements.</p>}
                <button className="notification-clear" type="button" onClick={() => { setNotificationsUnread(false); setNotificationsOpen(false); setNotice("Notifications marked as read."); }}>Mark all as read</button>
              </section>
            )}
          </div>
          {producerUser ? <button className="profile-button" onClick={signOut} aria-label="Sign out" title={`Signed in as ${producerUser.email}. Click to sign out.`}>{producerUser.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</button> : <button className="profile-button" onClick={() => setAuthDialogOpen(true)} aria-label="Sign in"><Users size={15} /></button>}
        </div>
      </header>

      {role === "attendee" ? (
        <AttendeeView
          mode={mode}
          rooms={displayRooms}
          venueSnapshot={venueSnapshot}
          venueStatus={venueStatus}
          greeting={greeting}
          appUser={producerUser}
          accessToken={accessToken}
          requestSignIn={() => setAuthDialogOpen(true)}
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
          liveConnected={Boolean(liveConnection || agoraConnection)}
          notify={setNotice}
        />
      ) : (
        <ProducerView
          mode={mode}
          venueSnapshot={venueSnapshot}
          greeting={greeting}
          rescueState={rescueState}
          triggerRescue={triggerRescue}
          resetDemo={resetDemo}
          setActiveRos={setActiveRos}
          events={events}
          notify={setNotice}
          producerUser={producerUser!}
          accessToken={accessToken!}
        />
      )}

      {authDialogOpen && (
        <AuthDialog
          email={authEmail}
          password={authPassword}
          setEmail={setAuthEmail}
          setPassword={setAuthPassword}
          submitting={authSubmitting}
          error={authError}
          close={() => setAuthDialogOpen(false)}
          signIn={signIn}
          signInWithGoogle={signInWithGoogle}
        />
      )}

      {liveDialogOpen && (
        <LiveJoinDialog
          roomTitle={activeRoom.title}
          roomDescription={activeRoom.description}
          attendeeCount={activeRoom.count}
          defaultName={producerUser?.displayName ?? ""}
          audioEnabled={micOn}
          videoEnabled={cameraOn}
          engine={activeEngine}
          setEngine={setActiveEngine}
          joining={liveJoining}
          error={liveError}
          close={() => setLiveDialogOpen(false)}
          connect={connectLiveRoom}
        />
      )}

      {agoraConnection && (
        <AgoraRoom
          appId={agoraConnection.appId}
          channelName={agoraConnection.channelName}
          token={agoraConnection.token}
          uid={agoraConnection.uid}
          roomTitle={activeRoom.title}
          displayName={agoraConnection.choices.username}
          audioEnabled={agoraConnection.choices.audioEnabled}
          videoEnabled={agoraConnection.choices.videoEnabled}
          onLeave={() => setAgoraConnection(null)}
          notify={setNotice}
        />
      )}

      {liveConnection && (
        <ConnectedLiveRoom
          connection={liveConnection}
          roomTitle={activeRoom.title}
          theme={theme}
          toggleTheme={toggleTheme}
          notify={setNotice}
          leave={() => setLiveConnection(null)}
        />
      )}

      {notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}
    </main>
  );
}

function AttendeeView({
  mode,
  rooms,
  venueSnapshot,
  venueStatus,
  greeting,
  appUser,
  accessToken,
  requestSignIn,
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
  notify,
}: {
  mode: AppMode;
  rooms: DisplayRoom[];
  venueSnapshot: VenueSnapshot | null;
  venueStatus: "loading" | "ready" | "error";
  greeting: string;
  appUser: ProducerUser | null;
  accessToken: string | null;
  requestSignIn: () => void;
  room: RoomId;
  activeRoom: DisplayRoom;
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
  openLiveRoom: (room?: RoomId) => void;
  liveConnected: boolean;
  notify: (message: string) => void;
}) {
  const [chatDraft, setChatDraft] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportIssue, setSupportIssue] = useState("");
  const [supportBusy, setSupportBusy] = useState(false);

  const liveItem = venueSnapshot?.runOfShow.find((item) => item.status === "live");
  const nextItem = venueSnapshot?.runOfShow.find((item) => item.status === "next")
    ?? venueSnapshot?.runOfShow.find((item) => item.status === "queued");
  const stageCount = rooms.find((item) => item.id === "stage")?.count ?? 0;

  const submitSupport = async () => {
    if (!accessToken) {
      notify("Sign in before creating a support request.");
      requestSignIn();
      return;
    }
    const roomName = VENUE_ROOMS.find((item) => item.id === room)?.roomName;
    if (!roomName || supportIssue.trim().length < 5) return;
    setSupportBusy(true);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ room: roomName, issue: supportIssue.trim() }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Support request failed");
      setSupportIssue("");
      setSupportOpen(false);
      notify("Your support request was sent to the producer queue.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Your support request could not be sent.");
    } finally {
      setSupportBusy(false);
    }
  };

  const sendChatMessage = () => {
    if (mode !== "demo") {
      openLiveRoom(room);
      setChatOpen(false);
      return;
    }
    const message = chatDraft.trim();
    if (!message) return;
    setSentMessages((current) => [...current, message]);
    setChatDraft("");
  };

  return (
    <div className="attendee-layout">
      <aside className="side-nav">
        <div>
          <button className="nav-item active" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><Map size={20} /><span>Venue</span></button>
          <button className="nav-item" onClick={() => document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" })}><CalendarDays size={20} /><span>Agenda</span></button>
          <button className="nav-item" onClick={() => mode === "demo" ? setChatOpen(true) : openLiveRoom(room)}><MessageSquareText size={20} /><span>Chat</span></button>
          <button className="nav-item" onClick={() => enterRoom("expo")}><Store size={20} /><span>Expo</span></button>
        </div>
        <div>
          <button className="nav-item" onClick={() => mode === "demo" ? window.location.assign("/docs") : setSupportOpen(true)}><CircleHelp size={20} /><span>Help</span></button>
        </div>
      </aside>

      <section className="venue-content">
        <div className="welcome-row">
          <div>
            <span className="eyebrow"><Sparkles size={14} /> YOUR EVENT, IN MOTION</span>
            <h1>{greeting}{appUser ? `, ${appUser.displayName.split(" ")[0]}` : ""}.</h1>
            <p>{mode === "demo" ? "Demo event data is active—no live systems are affected." : "Live venue status from your connected conference services."}</p>
          </div>
          <div className="global-pulse"><Activity size={16} /><strong>{mode === "demo" ? 431 : venueStatus === "ready" ? venueSnapshot?.totalParticipants ?? 0 : "—"}</strong><span>{mode === "demo" ? "demo attendees" : "people here now"}</span></div>
        </div>

        <section className="live-feature">
          <div className="feature-copy">
            <StatusPill>{mode === "demo" ? "DEMO · MAIN STAGE" : stageCount > 0 ? "LIVE · MAIN STAGE" : venueSnapshot?.mediaAvailable ? "READY · MAIN STAGE" : "MAIN STAGE UNAVAILABLE"}</StatusPill>
            <h2>{mode === "demo" ? <>Building trust in<br />an AI-first world</> : liveItem?.title ?? "Main stage is ready"}</h2>
            <p>{mode === "demo" ? "Maya Chen, Elias Brooks and Sofia Alvarez unpack responsible innovation." : liveItem ? `${liveItem.owner} · scheduled ${liveItem.scheduledTime}` : "No live agenda item has been started by a producer."}</p>
            <div className="speaker-row">{mode === "demo" && <AvatarStack />}<span>{mode === "demo" ? "3 speakers · 286 watching" : `${stageCount} in the room`}</span></div>
            <button className="primary-button" onClick={() => openLiveRoom("stage")}>Join main stage<ArrowRight size={17} /></button>
          </div>
          <div className="stage-visual" aria-label="Live speaker preview">
            {mode === "demo" ? demoPeople.map((person, index) => (
              <div className={`speaker-tile speaker-${index + 1}`} key={person.name}>
                <div className={`speaker-portrait ${person.color}`}>{person.initials}</div>
                <div className="speaker-label"><i />{person.name}<small>{person.role}</small></div>
              </div>
            )) : <div className="real-data-stage"><Video size={42} /><strong>Live participant video opens securely in the room</strong><small>No fabricated speaker portraits are shown.</small></div>}
            <div className="signal-lines" />
            <div className="live-corner"><span>{mode === "demo" ? "DEMO" : stageCount > 0 ? "LIVE" : venueSnapshot?.mediaAvailable ? "READY" : "OFFLINE"}</span><strong>{mode === "demo" ? "48:12" : stageCount}</strong></div>
          </div>
        </section>

        <div className="section-heading">
          <div><span className="eyebrow">EXPLORE THE VENUE</span><h3>Where do you want to go?</h3></div>
          <button className="text-button" onClick={() => document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" })}>View full agenda <ChevronRight size={16} /></button>
        </div>

        <div className="conference-capability-strip" aria-label="Conference capabilities">
          <span><Video size={15} /><strong>HD video</strong><small>Adaptive quality</small></span>
          <span><MonitorUp size={15} /><strong>Screen sharing</strong><small>Present in one click</small></span>
          <span><MessageSquareText size={15} /><strong>Live chat</strong><small>Built into every room</small></span>
          <span><Settings2 size={15} /><strong>Device control</strong><small>Switch during the call</small></span>
        </div>

        <div className="room-grid" id="rooms">
          {rooms.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`room-card ${item.accent} ${room === item.id ? "selected" : ""}`}
                onClick={() => mode === "demo" && item.id === "expo" ? enterRoom(item.id) : openLiveRoom(item.id)}
              >
                <div className="room-top"><span className="room-icon"><Icon size={19} /></span><span className="room-count"><Users size={13} />{item.count}</span></div>
                <small>{item.kicker}</small>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <span className="room-link">{mode === "demo" && item.id === "expo" ? "Explore demo booths" : "Open video lobby"} <ArrowRight size={15} /></span>
              </button>
            );
          })}
        </div>

        <EventExperienceHub
          mode={mode}
          accessToken={accessToken}
          room={room}
          signedIn={Boolean(appUser)}
          requestSignIn={requestSignIn}
          notify={notify}
        />
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
          {(mode === "live" || room !== "expo") && <button className="join-live-button" onClick={() => openLiveRoom(room)}><Video size={15} />{liveConnected ? "Reopen live room" : "Open video lobby"}</button>}
          <div className="connection-status"><i /> {mode === "demo" ? "Demo controls only" : liveConnected ? "Live media room connected" : venueSnapshot?.mediaAvailable ? "Secure media preflight ready" : venueSnapshot?.mediaError ?? "Checking media…"}</div>
        </div>

        {mode === "demo" && room === "expo" ? (
          <div className="expo-spotlight">
            <span className="eyebrow">FEATURED PARTNER</span>
            <div className="lumen-logo">LU<span>MEN</span></div>
            <h3>Make responsible AI operational.</h3>
            <p>Take the field guide used by product leaders across regulated industries.</p>
            <button className="secondary-button" onClick={() => window.location.assign("/docs#capabilities")}><Download size={16} />Open venue guide</button>
            <button className={`primary-button full ${leadSent ? "success" : ""}`} onClick={captureLead} disabled={leadSending || leadSent}>{leadSent ? <><Check size={16} />Interest captured</> : leadSending ? "Routing…" : <>I’m interested <ExternalLink size={15} /></>}</button>
          </div>
        ) : (
          <>
            <div className="rail-block">
              <div className="rail-title"><span>UP NEXT</span><Clock3 size={16} /></div>
              <strong>{mode === "demo" ? "11:35 · Studio One" : nextItem ? `${nextItem.scheduledTime} · ${nextItem.owner}` : "No upcoming item"}</strong>
              <h4>{mode === "demo" ? "The human side of transformation" : nextItem?.title ?? "The producer has not published the next agenda item."}</h4>
              <button className="text-button" onClick={() => openLiveRoom("studio")}>Open Studio One <ChevronRight size={15} /></button>
            </div>
            <div className="rail-block">
              <div className="rail-title"><span>{mode === "demo" ? "DEMO CONNECTIONS" : "NEED HELP?"}</span>{mode === "demo" ? <WandSparkles size={16} /> : <LifeBuoy size={16} />}</div>
              {mode === "demo" ? (
                <>
                  <div className="match-person"><span className="mini-avatar violet">NP</span><div><strong>Noor Patel</strong><small>Demo profile</small></div><button aria-label="Demo connection with Noor" onClick={() => notify("Demo connection request sent. No real message was delivered.")}><Send size={15} /></button></div>
                  <div className="match-person"><span className="mini-avatar coral">JW</span><div><strong>Jonas Weber</strong><small>Demo profile</small></div><button aria-label="Demo connection with Jonas" onClick={() => notify("Demo connection request sent. No real message was delivered.")}><Send size={15} /></button></div>
                </>
              ) : (
                <>
                  <p>Create a real ticket for the signed-in producer team.</p>
                  <button className="secondary-button full" onClick={() => setSupportOpen(true)}><LifeBuoy size={15} />Request support</button>
                </>
              )}
            </div>
          </>
        )}
      </aside>

      {chatOpen && mode === "demo" && (
        <div className="chat-panel">
          <div className="chat-head"><div><strong>Demo conversation</strong><small>Sample messages</small></div><button onClick={() => setChatOpen(false)} aria-label="Close chat"><X size={18} /></button></div>
          <div className="chat-messages">
            <p><strong>Priya</strong> The governance point is so important.</p>
            <p><strong>Daniel</strong> Would love the framework Sofia mentioned.</p>
            <p className="producer-message"><strong>Producer</strong> Drop your questions below—we’ll bring three to the stage.</p>
            {sentMessages.map((message, index) => <p key={`${message}-${index}`}><strong>You</strong>{message}</p>)}
          </div>
          <form className="chat-input" onSubmit={(event) => { event.preventDefault(); sendChatMessage(); }}>
            <input aria-label="Chat message" placeholder="Share a thought…" value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} />
            <button type="submit" aria-label="Send message" disabled={!chatDraft.trim()}><Send size={16} /></button>
          </form>
        </div>
      )}
      {supportOpen && mode === "live" && (
        <div className="chat-panel support-request-panel">
          <div className="chat-head"><div><strong>Request support</strong><small>{activeRoom.title}</small></div><button onClick={() => setSupportOpen(false)} aria-label="Close support request"><X size={18} /></button></div>
          <form className="support-request-form" onSubmit={(event) => { event.preventDefault(); void submitSupport(); }}>
            <p>{appUser ? `Signed in as ${appUser.email}` : "Sign in first so producers can respond to you."}</p>
            <label htmlFor="support-issue">What is happening?</label>
            <textarea id="support-issue" value={supportIssue} onChange={(event) => setSupportIssue(event.target.value)} minLength={5} maxLength={500} required placeholder="Describe the audio, video, screen-sharing, or access problem." />
            <button className="primary-button full" type="submit" disabled={supportBusy || supportIssue.trim().length < 5}>{supportBusy ? "Sending…" : "Send to producer queue"}</button>
          </form>
        </div>
      )}
    </div>
  );
}

function AuthDialog({
  email,
  password,
  setEmail,
  setPassword,
  submitting,
  error,
  close,
  signIn,
  signInWithGoogle,
}: {
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  submitting: boolean;
  error: string | null;
  close: () => void;
  signIn: () => void;
  signInWithGoogle: () => void;
}) {
  return (
    <div className="live-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <form className="live-dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title" onSubmit={(event) => { event.preventDefault(); void signIn(); }}>
        <button className="live-dialog-close" type="button" onClick={close} aria-label="Close sign in"><X size={19} /></button>
        <span className="eyebrow"><ShieldCheck size={14} /> SECURE ACCOUNT ACCESS</span>
        <h2 id="auth-dialog-title">Sign in to Velocity Venue</h2>
        <p>Continue with Google, or use the email and password created for your attendee or producer account.</p>
        <button className="google-auth-button" type="button" onClick={() => void signInWithGoogle()} disabled={submitting}>
          <span aria-hidden="true">G</span>{submitting ? "Opening secure sign-in…" : "Continue with Google"}
        </button>
        <div className="auth-divider"><span>OR USE EMAIL</span></div>
        <label htmlFor="auth-email">Email address</label>
        <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus />
        <label htmlFor="auth-password">Password</label>
        <input id="auth-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
        {error && <div className="live-error" role="alert"><AlertTriangle size={16} /><span><strong>Sign-in unsuccessful</strong>{error}</span></div>}
        <button className="primary-button full" type="submit" disabled={submitting}>{submitting ? "Verifying account…" : "Sign in securely"}<ArrowRight size={16} /></button>
        <div className="auth-note"><ShieldCheck size={14} />Authentication is handled by Supabase. Google and password credentials are never stored by this app.</div>
      </form>
    </div>
  );
}

function LiveJoinDialog({
  roomTitle,
  roomDescription,
  attendeeCount,
  defaultName,
  audioEnabled,
  videoEnabled,
  engine,
  setEngine,
  joining,
  error,
  close,
  connect,
}: {
  roomTitle: string;
  roomDescription: string;
  attendeeCount: number;
  defaultName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  engine: "livekit" | "agora";
  setEngine: (engine: "livekit" | "agora") => void;
  joining: boolean;
  error: string | null;
  close: () => void;
  connect: (choices: LocalUserChoices) => void;
}) {
  return (
    <div className="live-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className="live-dialog live-prejoin-dialog" role="dialog" aria-modal="true" aria-labelledby="live-dialog-title">
        <button className="live-dialog-close" type="button" onClick={close} aria-label="Close live room setup"><X size={19} /></button>
        <div className="prejoin-heading">
          <span className="eyebrow"><ShieldCheck size={14} /> DEVICE CHECK & LOBBY</span>
          <h2 id="live-dialog-title">Join {roomTitle}</h2>
          <p>{roomDescription}</p>
          <div className="prejoin-room-facts">
            <span><Users size={15} />{attendeeCount} in the room</span>
            <span><ShieldCheck size={15} />Encrypted media</span>
            <span><Settings2 size={15} />Devices remain editable</span>
          </div>
          <fieldset className="media-engine-picker" disabled={joining}>
            <legend>Media provider</legend>
            <label className={engine === "livekit" ? "active" : ""}>
              <input type="radio" name="media-engine" value="livekit" checked={engine === "livekit"} onChange={() => setEngine("livekit")} />
              <span><strong>LiveKit</strong><small>Primary conference infrastructure</small></span>
            </label>
            <label className={engine === "agora" ? "active" : ""}>
              <input type="radio" name="media-engine" value="agora" checked={engine === "agora"} onChange={() => setEngine("agora")} />
              <span><strong>Agora</strong><small>Alternative SD-RTN infrastructure</small></span>
            </label>
          </fieldset>
        </div>
        <PreJoin
          className="velocity-prejoin"
          defaults={{ username: defaultName, videoEnabled, audioEnabled }}
          joinLabel={joining ? "Connecting securely…" : "Join conference"}
          micLabel="Microphone"
          camLabel="Camera"
          userLabel="Display name"
          // The venue's microphone and camera controls are the explicit source
          // of truth for each lobby opening; selected device IDs still flow into
          // the active LiveKit connection after the attendee joins.
          persistUserChoices={false}
          onValidate={(choices) => Boolean(choices.username.trim()) && !joining}
          onSubmit={(choices) => void connect(choices)}
          onError={(joinError) => console.warn("Media preview unavailable", joinError)}
        />
        {error && <div className="live-error" role="alert"><AlertTriangle size={16} /><span><strong>Unable to join this room</strong>{error}</span></div>}
        <button className="live-demo-link" type="button" onClick={close}>Continue exploring the venue</button>
      </section>
    </div>
  );
}

function ConnectedLiveRoom({
  connection,
  roomTitle,
  theme,
  toggleTheme,
  notify,
  leave,
}: {
  connection: LiveConnection;
  roomTitle: string;
  theme: Theme;
  toggleTheme: () => void;
  notify: (message: string) => void;
  leave: () => void;
}) {
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const copyInvite = async () => {
    const roomId = VENUE_ROOMS.find((room) => room.roomName === connection.roomName)?.id ?? "stage";
    const invite = `${window.location.origin}/?room=${roomId}`;
    try {
      await navigator.clipboard.writeText(invite);
      notify("Conference invite copied.");
    } catch {
      notify("Copy unavailable. Use the current page URL to invite attendees.");
    }
  };

  return (
    <div className="live-room-overlay" role="dialog" aria-modal="true" aria-label={`${roomTitle} live room`}>
      <LiveKitRoom
        className="live-room-shell"
        token={connection.token}
        serverUrl={connection.serverUrl}
        connect
        video={connection.choices.videoEnabled ? (connection.choices.videoDeviceId ? { deviceId: connection.choices.videoDeviceId } : true) : false}
        audio={connection.choices.audioEnabled ? (connection.choices.audioDeviceId ? { deviceId: connection.choices.audioDeviceId } : true) : false}
        onDisconnected={leave}
        data-lk-theme="default"
      >
        <header className="live-room-header">
          <div className="live-room-identity">
            <BrandMark />
            <span className="live-header-divider" />
            <div><StatusPill>LIVE</StatusPill><strong>{roomTitle}</strong><small>{connection.roomName}</small></div>
          </div>
          <ConferenceRoomMeta />
          <div className="live-room-actions">
            <button className="live-header-action" type="button" onClick={() => void copyInvite()}><Link2 size={16} />Invite</button>
            <button className="live-header-action" type="button" aria-pressed={captionsEnabled} onClick={() => setCaptionsEnabled((enabled) => !enabled)}><Captions size={16} />Captions</button>
            <button className="live-header-icon" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="leave-room-button" onClick={leave}><X size={18} />Leave room</button>
          </div>
        </header>
        <div className="live-room-conference">
          <VideoConference />
          {captionsEnabled && <LiveCaptions />}
        </div>
        <RoomAudioRenderer />
        <StartAudio label="Enable room audio" />
      </LiveKitRoom>
    </div>
  );
}

function LiveCaptions() {
  const transcriptions = useTranscriptions();
  const visible = transcriptions.slice(-3);
  const latestText = visible.at(-1)?.text ?? "";
  const [targetLang, setTargetLang] = useState<"en" | "es" | "fr" | "de" | "ja">("en");
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationProvider, setTranslationProvider] = useState<string | null>(null);

  useEffect(() => {
    if (targetLang === "en" || !latestText) return;

    let cancelled = false;
    async function translate() {
      try {
        const res = await fetch("/api/translation", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: latestText, targetLanguage: targetLang }),
        });
        const data = (await res.json()) as { translated?: string; provider?: string; error?: string };
        if (!res.ok || !data.translated) throw new Error(data.error || "Translation is unavailable.");
        if (!cancelled && data.translated) {
          setTranslatedText(data.translated);
          setTranslationProvider(data.provider || "Configured translation service");
          setTranslationError(null);
        }
      } catch (translationFailure) {
        if (!cancelled) {
          setTranslatedText(null);
          setTranslationProvider(null);
          setTranslationError(translationFailure instanceof Error ? translationFailure.message : "Translation is unavailable.");
        }
      }
    }
    void translate();
    return () => {
      cancelled = true;
    };
  }, [latestText, targetLang]);

  return (
    <div className={`live-captions ${visible.length ? "active" : ""}`} aria-live="polite" aria-label="Live captions">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px", color: "var(--cyan)" }}>
          <Globe size={13} /> REAL-TIME TRANSLATION{translationProvider ? ` · ${translationProvider}` : ""}
        </span>
        <select
          value={targetLang}
          onChange={(event) => {
            setTargetLang(event.target.value as "en" | "es" | "fr" | "de" | "ja");
            setTranslatedText(null);
            setTranslationProvider(null);
            setTranslationError(null);
          }}
          style={{
            background: "rgba(0,0,0,0.5)",
            border: "1px solid var(--glass-border)",
            color: "#fff",
            fontSize: "11px",
            borderRadius: "6px",
            padding: "2px 8px",
            cursor: "pointer"
          }}
        >
          <option value="en">English (Original)</option>
          <option value="es">Spanish (Español)</option>
          <option value="fr">French (Français)</option>
          <option value="de">German (Deutsch)</option>
          <option value="ja">Japanese (日本語)</option>
        </select>
      </div>

      {visible.length
        ? visible.map((segment, index) => (
          <p key={`${segment.streamInfo.id}-${index}`}>
            <strong>{segment.participantInfo.identity}</strong>
            {targetLang !== "en" && translatedText && index === visible.length - 1 ? translatedText : segment.text}
          </p>
        ))
        : <p><Captions size={15} /> Captions ready. Select target language above for real-time translation.</p>}
      {translationError && <p className="live-caption-error">Translation unavailable: {translationError}</p>}
    </div>
  );
}

function ConferenceRoomMeta() {
  // LiveKit's room context is the source of truth during reconnects and as
  // participants enter or leave; no dashboard counters are simulated here.
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const connected = String(connectionState).toLowerCase() === "connected";

  return (
    <div className="conference-room-meta" aria-live="polite">
      <span className={connected ? "connected" : "reconnecting"}><Wifi size={14} />{connected ? "Connected" : String(connectionState)}</span>
      <span><Users size={14} />{participants.length} {participants.length === 1 ? "participant" : "participants"}</span>
    </div>
  );
}

function ProducerView({
  mode,
  venueSnapshot,
  greeting,
  rescueState,
  triggerRescue,
  resetDemo,
  setActiveRos,
  events,
  notify,
  producerUser,
  accessToken,
}: {
  mode: AppMode;
  venueSnapshot: VenueSnapshot | null;
  greeting: string;
  rescueState: "idle" | "moving" | "complete";
  triggerRescue: () => void;
  resetDemo: () => void;
  setActiveRos: (index: number) => void;
  events: { time: string; text: string; tone: string }[];
  notify: (message: string) => void;
  producerUser: ProducerUser;
  accessToken: string;
}) {
  const [managedParticipants, setManagedParticipants] = useState<ManagedParticipant[]>([]);
  const [participantStatus, setParticipantStatus] = useState<"loading" | "ready" | "error">("loading");
  const [persistentRunOfShow, setPersistentRunOfShow] = useState<RunOfShowItem[]>([]);
  const [persistentEvents, setPersistentEvents] = useState<OperationalEvent[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [operationsStatus, setOperationsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [producerSection, setProducerSection] = useState("overview");
  const [showFullLog, setShowFullLog] = useState(false);
  const [integrationBusy, setIntegrationBusy] = useState<"announcement" | "calendar" | null>(null);
  const [newRunItem, setNewRunItem] = useState({ scheduledTime: "", title: "", owner: "" });
  const openTickets = supportTickets.filter((ticket) => ticket.status !== "resolved");
  const healthRooms = mode === "demo"
    ? demoRooms
    : liveRoomPresentation.map((item) => ({
      ...item,
      count: venueSnapshot?.rooms.find((room) => room.id === item.id)?.participantCount ?? 0,
    }));

  const openProducerSection = (section: string, targetId: string) => {
    setProducerSection(section);
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const refreshOperations = async () => {
    if (mode === "demo") {
      setPersistentRunOfShow(demoRunOfShow.map((item) => ({ ...item, scheduledTime: item.time })));
      setPersistentEvents([]);
      setSupportTickets([
        { id: -1, requesterName: "Rina Kapoor", requesterEmail: "demo@example.com", roomName: "Studio One", issue: "Can’t share screen", status: "open", assignedTo: "", createdAt: new Date().toISOString() },
        { id: -2, requesterName: "David Mills", requesterEmail: "demo@example.com", roomName: "Green room", issue: "Audio echo", status: "open", assignedTo: "", createdAt: new Date().toISOString() },
      ]);
      setOperationsStatus("ready");
      return;
    }
    setOperationsStatus("loading");
    try {
      const response = await fetch("/api/producer/operations", {
        cache: "no-store",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json() as {
        runOfShow?: RunOfShowItem[];
        activity?: OperationalEvent[];
        supportTickets?: SupportTicket[];
      };
      if (!response.ok) throw new Error("Operations request failed");
      setPersistentRunOfShow(payload.runOfShow ?? []);
      setPersistentEvents(payload.activity ?? []);
      setSupportTickets(payload.supportTickets ?? []);
      setOperationsStatus("ready");
    } catch {
      setPersistentRunOfShow([]);
      setPersistentEvents([]);
      setSupportTickets([]);
      setOperationsStatus("error");
    }
  };

  const refreshParticipants = async () => {
    if (mode === "demo") {
      setManagedParticipants([]);
      setParticipantStatus("ready");
      return;
    }
    setParticipantStatus("loading");
    try {
      const response = await fetch("/api/producer/room?room=velocity-venue-stage", {
        cache: "no-store",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json()) as { participants?: ManagedParticipant[] };
      if (!response.ok) {
        setManagedParticipants([]);
        setParticipantStatus("error");
        return;
      }
      setManagedParticipants(payload.participants ?? []);
      setParticipantStatus("ready");
    } catch {
      setParticipantStatus("error");
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshParticipants();
      void refreshOperations();
    }, 0);
    return () => window.clearTimeout(timer);
    // These loaders intentionally run once when the authenticated producer view opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const selectRunItem = async (index: number, item: RunOfShowItem) => {
    // Optimistic state gives the show caller immediate feedback. The following
    // request persists and normalizes all surrounding timeline statuses.
    setActiveRos(index);
    setPersistentRunOfShow((current) => current.map((candidate, candidateIndex) => ({
      ...candidate,
      status: candidateIndex < index ? "done" : candidateIndex === index ? "live" : candidateIndex === index + 1 ? "next" : "queued",
    })));
    if (!item.id) {
      notify("Demo run of show advanced. No live schedule changed.");
      return;
    }
    try {
      const response = await fetch("/api/producer/operations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: "set-run-status", itemId: item.id, status: "live" }),
      });
      if (!response.ok) throw new Error("Schedule update failed");
      notify("Run-of-show change saved.");
      await refreshOperations();
    } catch {
      notify("Run-of-show change could not be saved; live data was reloaded.");
      await refreshOperations();
    }
  };

  const addRunOfShowItem = async () => {
    if (mode === "demo") {
      notify("Schedule editing is disabled in Demo mode.");
      return;
    }
    try {
      const response = await fetch("/api/producer/operations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: "add-run-item", ...newRunItem }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Schedule item could not be added.");
      setNewRunItem({ scheduledTime: "", title: "", owner: "" });
      await refreshOperations();
      notify("Agenda item published.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Agenda item could not be added.");
    }
  };

  const updateSupportTicket = async (ticket: SupportTicket, status: SupportTicket["status"]) => {
    if (mode === "demo") {
      setSupportTickets((current) => current.map((item) => item.id === ticket.id ? { ...item, status } : item));
      notify("Demo ticket updated. No attendee was contacted.");
      return;
    }
    try {
      const response = await fetch("/api/producer/operations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: "update-support", ticketId: ticket.id, status }),
      });
      if (!response.ok) throw new Error("Ticket update failed");
      await refreshOperations();
      notify(status === "resolved" ? "Support ticket resolved." : "Support ticket assigned to you.");
    } catch {
      notify("The support ticket could not be updated.");
    }
  };

  const sendIntegration = async (channel: "calendar" | "slack" | "teams", message: string) => {
    // Integration URLs remain server-side. The client receives only delivery
    // classification suitable for a producer-facing status message.
    try {
      const response = await fetch("/api/producer/integrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          channel,
          message,
          roomName: "Main Stage",
        }),
      });
      const payload = await response.json() as { configured?: boolean };
      notify(
        response.ok
          ? `${channel === "calendar" ? "Calendar" : channel === "slack" ? "Slack" : "Teams"} update delivered.`
          : payload.configured === false
            ? `${channel === "calendar" ? "Calendar" : channel === "slack" ? "Slack" : "Teams"} is ready to connect in environment settings.`
            : "The integration could not be reached.",
      );
      await refreshOperations();
      return response.ok;
    } catch {
      notify("The integration could not be reached.");
      return false;
    }
  };

  const sendAnnouncement = async () => {
    if (mode === "demo") {
      notify("Demo announcement sent. No external channels or attendees were contacted.");
      return;
    }
    const message = window.prompt("Announcement for all attendees");
    if (!message?.trim()) return;
    setIntegrationBusy("announcement");
    const persisted = await fetch("/api/producer/operations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ action: "announce", message: message.trim() }),
    });
    if (!persisted.ok) {
      notify("The announcement could not be published.");
      setIntegrationBusy(null);
      return;
    }
    const results = await Promise.all([
      sendIntegration("slack", message.trim()),
      sendIntegration("teams", message.trim()),
    ]);
    notify(results.some(Boolean) ? "Announcement published and delivered to connected channels." : "Announcement published in the venue. External channels are not configured.");
    await refreshOperations();
    setIntegrationBusy(null);
  };

  const syncCalendar = async () => {
    if (mode === "demo") {
      notify("Demo calendar sync complete. No calendar was changed.");
      return;
    }
    setIntegrationBusy("calendar");
    const current = persistentRunOfShow.find((item) => item.status === "live");
    await sendIntegration("calendar", current ? `${current.title} — ${current.owner}` : "Velocity Venue — Main Stage");
    setIntegrationBusy(null);
  };

  const manageParticipant = async (action: "remove" | "mute", participant: ManagedParticipant) => {
    // Participant identity and audio track SID come from the latest server
    // snapshot, reducing the chance of acting on stale LiveKit state.
    try {
      const response = await fetch("/api/producer/room", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action, room: "velocity-venue-stage", identity: participant.identity, trackSid: participant.audioTrackSid }),
      });
      if (!response.ok) {
        notify("The producer action could not be completed.");
        return;
      }
      notify(action === "remove" ? `${participant.name} was removed from the live room.` : `${participant.name} was muted.`);
      await refreshParticipants();
    } catch {
      notify("The producer action could not be completed.");
    }
  };

  return (
    <div className="producer-layout">
      <aside className="producer-nav">
        <div className="producer-label">{mode === "demo" ? "PRODUCER · DEMO DATA" : "PRODUCER · LIVE DATA"}</div>
        <button className={`producer-nav-item ${producerSection === "overview" ? "active" : ""}`} onClick={() => openProducerSection("overview", "producer-overview")}><LayoutDashboard size={18} />Show overview</button>
        <button className={`producer-nav-item ${producerSection === "run" ? "active" : ""}`} onClick={() => openProducerSection("run", "producer-run-show")}><TimerReset size={18} />Run of show</button>
        <button className={`producer-nav-item ${producerSection === "rooms" ? "active" : ""}`} onClick={() => openProducerSection("rooms", "producer-rooms")}><Video size={18} />Rooms & stages</button>
        <button className={`producer-nav-item ${producerSection === "speakers" ? "active" : ""}`} onClick={() => openProducerSection("speakers", "producer-participants")}><Users size={18} />Speakers</button>
        <button className={`producer-nav-item ${producerSection === "engagement" ? "active" : ""}`} onClick={() => openProducerSection("engagement", "producer-activity")}><MessageSquareText size={18} />Engagement</button>
        <button className={`producer-nav-item ${producerSection === "data" ? "active" : ""}`} onClick={() => openProducerSection("data", "producer-metrics")}><Gauge size={18} />Event data</button>
        <button className={`producer-nav-item ${producerSection === "intelligence" ? "active" : ""}`} onClick={() => openProducerSection("intelligence", "producer-intelligence")}><Sparkles size={18} />Intelligence</button>
        <div className="nav-divider" />
        <button className={`producer-nav-item ${producerSection === "support" ? "active" : ""}`} onClick={() => openProducerSection("support", "producer-support")}><LifeBuoy size={18} />Support queue <span>{openTickets.length}</span></button>
        <div className="event-health"><div><HeartPulse size={17} /><span>EVENT SERVICES</span></div><strong>{mode === "demo" ? "DEMO" : venueSnapshot?.mediaAvailable && operationsStatus === "ready" ? "READY" : "CHECK"}</strong><small>{mode === "demo" ? "No live systems affected" : venueSnapshot?.mediaAvailable ? operationsStatus === "ready" ? "Media and operations connected" : "Operations data unavailable" : venueSnapshot?.mediaError ?? "Checking services"}</small></div>
      </aside>

      <section className="command-content">
        <div className="command-heading scroll-target" id="producer-overview">
          <div><span className="eyebrow"><Radio size={13} /> {mode === "demo" ? "DEMO MODE" : "LIVE OPERATIONS"} · SIGNED IN</span><h1>{greeting}, {producerUser.displayName.split(" ")[0]}.</h1><p>{mode === "demo" ? "Explore the producer workflow without changing live systems." : `${venueSnapshot?.totalParticipants ?? 0} participants are connected across ${venueSnapshot?.activeRooms ?? 0} rooms.`}</p></div>
          <div className="command-actions"><button className="secondary-button" disabled={integrationBusy !== null} onClick={() => void sendAnnouncement()}><Bell size={16} />{integrationBusy === "announcement" ? "Sending…" : "Send announcement"}</button><button className="secondary-button" disabled={integrationBusy !== null} onClick={() => void syncCalendar()}><CalendarDays size={15} />{integrationBusy === "calendar" ? "Syncing…" : "Sync calendar"}</button><button className="primary-button" onClick={() => window.open("/", "_blank", "noopener,noreferrer")}><ExternalLink size={15} />Open attendee view</button></div>
        </div>

        {rescueState !== "idle" && (
          <div className={`rescue-banner ${rescueState}`}>
            <div className="rescue-symbol">{rescueState === "moving" ? <Zap size={24} /> : <ShieldCheck size={24} />}</div>
            <div><span>{rescueState === "moving" ? "RESCUE MODE ACTIVE" : "RECOVERY COMPLETE"}</span><strong>{rescueState === "moving" ? "Moving current Main Stage participants to backup…" : mode === "demo" ? "Demo recovery completed" : "LiveKit participant movement completed"}</strong><small>{mode === "demo" ? "No live participants were affected." : "The result is recorded in the operational audit log."}</small></div>
            {mode === "demo" && rescueState === "complete" && <button onClick={resetDemo}>Reset demo</button>}
          </div>
        )}

        <div className="metric-grid scroll-target" id="producer-metrics">
          <MetricCard label="ATTENDEES ONLINE" value={String(mode === "demo" ? 431 : venueSnapshot?.totalParticipants ?? 0)} change={mode === "demo" ? "Demo value" : venueSnapshot?.mediaAvailable ? "LiveKit live count" : "Media unavailable"} icon={Users} tone="cyan" />
          <MetricCard label="ACTIVE ROOMS" value={mode === "demo" ? "4 / 6" : `${venueSnapshot?.activeRooms ?? 0} / ${VENUE_ROOMS.length}`} change={mode === "demo" ? "Demo value" : "Rooms with participants"} icon={Radio} tone="violet" />
          <MetricCard label="OPEN SUPPORT" value={String(openTickets.length)} change={mode === "demo" ? "Demo tickets" : "Persisted D1 tickets"} icon={LifeBuoy} tone="coral" />
          <MetricCard label="RECORDED ACTIONS" value={String(mode === "demo" ? events.length : persistentEvents.length)} change={mode === "demo" ? "Demo activity" : "D1 audit records loaded"} icon={Activity} tone="lime" />
        </div>

        <ProducerIntelligenceCenter mode={mode} accessToken={accessToken} notify={notify} />

        <div className="command-grid">
          <section className="panel run-panel scroll-target" id="producer-run-show">
            <div className="panel-head"><div><span className="eyebrow">{mode === "demo" ? "DEMO CONTROL" : "LIVE CONTROL"}</span><h2>Run of show</h2></div><span className="on-time"><Check size={13} />{persistentRunOfShow.find((item) => item.status === "live") ? "ITEM LIVE" : "NO LIVE ITEM"}</span></div>
            <div className="ros-list">
              {operationsStatus === "error" && mode === "live" && <p className="empty-state">The persisted schedule is unavailable. No demo schedule is being substituted.</p>}
              {operationsStatus === "ready" && persistentRunOfShow.length === 0 && <p className="empty-state">No agenda items have been published yet.</p>}
              {persistentRunOfShow.map((item, index) => (
                <button key={item.id ?? item.scheduledTime} className={`ros-item ${item.status === "live" ? "active" : ""} ${item.status === "done" ? "done" : ""}`} onClick={() => void selectRunItem(index, item)}>
                  <span className="ros-time">{item.scheduledTime}</span><span className="ros-line"><i /></span><span className="ros-copy"><strong>{item.title}</strong><small>{item.owner}</small></span><span className="ros-status">{item.status === "done" ? <Check size={14} /> : item.status === "live" ? "LIVE" : item.status === "next" ? "NEXT" : ""}</span>
                </button>
              ))}
            </div>
            {mode === "live" && (
              <form className="run-item-form" onSubmit={(event) => { event.preventDefault(); void addRunOfShowItem(); }}>
                <span>Add agenda item</span>
                <input type="time" aria-label="Agenda time" value={newRunItem.scheduledTime} onChange={(event) => setNewRunItem((current) => ({ ...current, scheduledTime: event.target.value }))} required />
                <input aria-label="Agenda title" placeholder="Session title" value={newRunItem.title} onChange={(event) => setNewRunItem((current) => ({ ...current, title: event.target.value }))} required />
                <input aria-label="Agenda owner" placeholder="Owner or speaker" value={newRunItem.owner} onChange={(event) => setNewRunItem((current) => ({ ...current, owner: event.target.value }))} required />
                <button type="submit">Publish</button>
              </form>
            )}
          </section>

          <section className="panel room-health-panel scroll-target" id="producer-rooms">
            <div className="panel-head"><div><span className="eyebrow">ROOM MONITOR</span><h2>Live spaces</h2></div><button className="icon-button" aria-label="Refresh room monitor" onClick={() => void refreshParticipants()}><TimerReset size={18} /></button></div>
            <div className="health-room">
              <div className="health-room-head"><span className="health-icon coral"><Radio size={16} /></span><div><strong>Main Stage</strong><small>{mode === "demo" ? "Demo · 286 attendees" : `${venueSnapshot?.rooms.find((item) => item.id === "stage")?.participantCount ?? 0} live participants`}</small></div><StatusPill tone={mode === "demo" || venueSnapshot?.mediaAvailable ? "healthy" : "warning"}>{mode === "demo" ? "Demo" : venueSnapshot?.mediaAvailable ? "Connected" : "Unavailable"}</StatusPill></div>
              <div className="health-stats"><span><i className={venueSnapshot?.mediaAvailable || mode === "demo" ? "green" : ""} />Media <strong>{mode === "demo" ? "Demo" : venueSnapshot?.mediaAvailable ? "Connected" : "Unavailable"}</strong></span><span>Source <strong>{mode === "demo" ? "Sample" : "LiveKit API"}</strong></span><span>Loaded <strong>{mode === "demo" ? 3 : managedParticipants.length}</strong></span></div>
              <div className="health-actions"><button onClick={() => { void refreshParticipants(); openProducerSection("speakers", "producer-participants"); }}><MonitorUp size={15} />Monitor</button><button className="danger-outline" onClick={triggerRescue} disabled={rescueState !== "idle" || (mode === "live" && !venueSnapshot?.mediaAvailable)}><ShieldCheck size={15} />Activate Rescue Mode</button></div>
              <div className="live-participants scroll-target" id="producer-participants">
                <div><strong>LIVEKIT PARTICIPANTS</strong><button onClick={refreshParticipants}>Refresh</button></div>
                {participantStatus === "loading" && <p>Checking the live room…</p>}
                {participantStatus === "error" && <p>Live participant status is temporarily unavailable.</p>}
                {participantStatus === "ready" && managedParticipants.length === 0 && <p>{mode === "demo" ? "Demo participant controls do not affect real users." : "The live room is currently empty."}</p>}
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
            {healthRooms.filter((item) => item.id !== "stage").map((item) => {
              const count = item.count;
              const Icon = item.icon;
              return <div className="health-room compact-room" key={item.id}><span className={`health-icon ${item.accent}`}><Icon size={16} /></span><div><strong>{item.title}</strong><small>{count} {mode === "demo" ? "demo attendees" : "live participants"}</small></div><span className="ready-state"><i />{mode === "demo" ? "Demo" : count > 0 ? "Active" : "Empty"}</span></div>;
            })}
          </section>
        </div>

        <div className="bottom-grid">
          <section className="panel activity-panel scroll-target" id="producer-activity">
            <div className="panel-head"><div><span className="eyebrow">OPERATIONAL RECORD</span><h2>Event activity</h2></div><button className="text-button" aria-expanded={showFullLog} onClick={() => setShowFullLog((showing) => !showing)}>{showFullLog ? "Show recent" : "View full log"} <ChevronRight size={15} /></button></div>
            <div className="event-list">
              {persistentEvents.length > 0
                ? persistentEvents.slice(0, showFullLog ? persistentEvents.length : 4).map((event, index) => <div className="event-row" key={event.id ?? index}><span>{event.createdAt ? new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "NOW"}</span><i className={event.action?.includes("rescue") ? "warn" : "good"} /><strong>{event.detail || event.action}</strong></div>)
                : mode === "demo"
                  ? events.slice(0, showFullLog ? events.length : 4).map((event, index) => <div className="event-row" key={`${event.time}-${index}`}><span>{event.time}</span><i className={event.tone} /><strong>{event.text}</strong></div>)
                  : <p className="empty-state">{operationsStatus === "error" ? "The audit log is unavailable." : "No producer actions have been recorded yet."}</p>}
            </div>
          </section>
          <section className="panel support-panel scroll-target" id="producer-support">
            <div className="panel-head"><div><span className="eyebrow">NEEDS ATTENTION</span><h2>Support queue</h2></div><span className="queue-count">{openTickets.length} OPEN</span></div>
            {operationsStatus === "error" && mode === "live" && <p className="empty-state">The persisted support queue is unavailable.</p>}
            {operationsStatus === "ready" && supportTickets.length === 0 && <p className="empty-state">No attendee support requests.</p>}
            {supportTickets.map((ticket) => (
              <div className={`support-ticket ${ticket.status}`} key={ticket.id}>
                <span className="mini-avatar coral">{ticket.requesterName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                <div><strong>{ticket.requesterName}</strong><small>{ticket.issue} · {ticket.roomName} · {ticket.status.replace("_", " ")}</small></div>
                {ticket.status === "open" && <button onClick={() => void updateSupportTicket(ticket, "in_progress")}>Assign to me</button>}
                {ticket.status === "in_progress" && <button onClick={() => void updateSupportTicket(ticket, "resolved")}>Resolve</button>}
                {ticket.status === "resolved" && <span className="ready-state"><i />Resolved</span>}
              </div>
            ))}
          </section>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, change, icon: Icon, tone }: { label: string; value: string; change: string; icon: typeof Users; tone: string }) {
  return <div className="metric-card"><span className={`metric-icon ${tone}`}><Icon size={18} /></span><small>{label}</small><strong>{value}</strong><p><i />{change}</p></div>;
}
