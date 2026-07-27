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
import { AlertTriangle, Captions, Globe, Link2, Moon, Settings2, ShieldCheck, Sun, Users, Wifi, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccessibleDialog } from "./accessible-dialog";
import { VENUE_ROOMS } from "./venue-config";

export type LiveConnection = {
  token: string;
  serverUrl: string;
  roomName: string;
  choices: LocalUserChoices;
};

export function LiveJoinDialog({ roomTitle, roomDescription, attendeeCount, defaultName, audioEnabled, videoEnabled, engine, setEngine, agoraAvailable, joining, error, close, connect }: {
  roomTitle: string;
  roomDescription: string;
  attendeeCount: number;
  defaultName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  engine: "livekit" | "agora";
  setEngine: (engine: "livekit" | "agora") => void;
  agoraAvailable: boolean;
  joining: boolean;
  error: string | null;
  close: () => void;
  connect: (choices: LocalUserChoices) => void;
}) {
  const { dialogRef, onKeyDown } = useAccessibleDialog<HTMLElement>(close);
  return (
    <div className="live-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section ref={dialogRef} onKeyDown={onKeyDown} className="live-dialog live-prejoin-dialog" role="dialog" aria-modal="true" aria-labelledby="live-dialog-title">
        <button className="live-dialog-close" type="button" onClick={close} aria-label="Close live room setup"><X size={19} /></button>
        <div className="prejoin-heading">
          <span className="eyebrow"><ShieldCheck size={14} /> DEVICE CHECK &amp; LOBBY</span>
          <h2 id="live-dialog-title">Join {roomTitle}</h2>
          <p>{roomDescription}</p>
          <div className="prejoin-room-facts"><span><Users size={15} />{attendeeCount} in the room</span><span><ShieldCheck size={15} />Encrypted media</span><span><Settings2 size={15} />Devices remain editable</span></div>
          <fieldset className="media-engine-picker" disabled={joining}>
            <legend>Media provider</legend>
            <label className={engine === "livekit" ? "active" : ""}><input type="radio" name="media-engine" value="livekit" checked={engine === "livekit"} onChange={() => setEngine("livekit")} /><span><strong>LiveKit</strong><small>Video, chat, screen sharing, and captions</small></span></label>
            <label className={`${engine === "agora" ? "active" : ""}${!agoraAvailable ? " unavailable" : ""}`} aria-disabled={!agoraAvailable}><input type="radio" name="media-engine" value="agora" checked={engine === "agora"} disabled={!agoraAvailable} onChange={() => setEngine("agora")} /><span><strong>Agora</strong><small>{agoraAvailable ? "Alternative audio/video infrastructure" : "Unavailable for this event"}</small></span></label>
          </fieldset>
        </div>
        <PreJoin
          key={`${roomTitle}:${defaultName}`}
          className="velocity-prejoin"
          data-lk-theme="default"
          defaults={{ username: defaultName, videoEnabled, audioEnabled }}
          joinLabel={joining ? "Connecting securely…" : "Join conference"}
          micLabel="Microphone"
          camLabel="Camera"
          userLabel="Display name"
          persistUserChoices={false}
          onValidate={(choices) => Boolean(choices.username.trim()) && !joining}
          onSubmit={(choices) => void connect(choices)}
          onError={(joinError) => console.warn("Media preview unavailable", joinError)}
        />
        <p className="prejoin-action-help">Enter a display name to enable Join conference. Camera and microphone are optional.</p>
        {error && <div className="live-error" role="alert"><AlertTriangle size={16} /><span><strong>Unable to join this room</strong>{error}</span></div>}
        <button className="live-demo-link" type="button" onClick={close}>Continue exploring the venue</button>
      </section>
    </div>
  );
}

export function ConnectedLiveRoom({ connection, roomTitle, theme, toggleTheme, notify, leave }: {
  connection: LiveConnection;
  roomTitle: string;
  theme: "dark" | "light";
  toggleTheme: () => void;
  notify: (message: string) => void;
  leave: () => void;
}) {
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  useEffect(() => {
    const leaveOnEscape = (event: KeyboardEvent) => event.key === "Escape" && leave();
    window.addEventListener("keydown", leaveOnEscape);
    return () => window.removeEventListener("keydown", leaveOnEscape);
  }, [leave]);

  const copyInvite = async () => {
    const roomId = VENUE_ROOMS.find((room) => room.roomName === connection.roomName)?.id ?? "stage";
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?room=${roomId}`);
      notify("Conference invite copied.");
    } catch {
      notify("Copy unavailable. Use the current page URL to invite attendees.");
    }
  };

  return (
    <div className="live-room-overlay" role="dialog" aria-modal="true" aria-label={`${roomTitle} live room`}>
      <LiveKitRoom className="live-room-shell" token={connection.token} serverUrl={connection.serverUrl} connect video={connection.choices.videoEnabled ? (connection.choices.videoDeviceId ? { deviceId: connection.choices.videoDeviceId } : true) : false} audio={connection.choices.audioEnabled ? (connection.choices.audioDeviceId ? { deviceId: connection.choices.audioDeviceId } : true) : false} onDisconnected={leave} data-lk-theme="default">
        <header className="live-room-header">
          <div className="live-room-identity"><BrandMark /><span className="live-header-divider" /><div><span className="status-pill live">LIVE</span><strong>{roomTitle}</strong><small>{connection.roomName}</small></div></div>
          <ConferenceRoomMeta />
          <div className="live-room-actions">
            <button className="live-header-action" type="button" onClick={() => void copyInvite()}><Link2 size={16} />Invite</button>
            <button className="live-header-action" type="button" aria-pressed={captionsEnabled} onClick={() => setCaptionsEnabled((enabled) => !enabled)}><Captions size={16} />Captions</button>
            <button className="live-header-icon" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
            <button className="leave-room-button" onClick={leave}><X size={18} />Leave room</button>
          </div>
        </header>
        <div className="live-room-conference"><VideoConference />{captionsEnabled && <LiveCaptions />}</div>
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
        const response = await fetch("/api/translation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: latestText, targetLanguage: targetLang }) });
        const payload = await response.json() as { translated?: string; provider?: string; error?: string };
        if (!response.ok || !payload.translated) throw new Error(payload.error || "Translation is unavailable.");
        if (!cancelled) {
          setTranslatedText(payload.translated);
          setTranslationProvider(payload.provider || "Configured translation service");
          setTranslationError(null);
        }
      } catch (failure) {
        if (!cancelled) {
          setTranslatedText(null);
          setTranslationProvider(null);
          setTranslationError(failure instanceof Error ? failure.message : "Translation is unavailable.");
        }
      }
    }
    void translate();
    return () => { cancelled = true; };
  }, [latestText, targetLang]);

  return (
    <div className={`live-captions ${visible.length ? "active" : ""}`} aria-live="polite" aria-label="Live captions">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px", color: "var(--cyan)" }}><Globe size={13} /> REAL-TIME TRANSLATION{translationProvider ? ` · ${translationProvider}` : ""}</span>
        <select value={targetLang} aria-label="Caption language" onChange={(event) => { setTargetLang(event.target.value as typeof targetLang); setTranslatedText(null); setTranslationProvider(null); setTranslationError(null); }}>
          <option value="en">English (Original)</option><option value="es">Spanish (Español)</option><option value="fr">French (Français)</option><option value="de">German (Deutsch)</option><option value="ja">Japanese (日本語)</option>
        </select>
      </div>
      {visible.length ? visible.map((segment, index) => <p key={`${segment.streamInfo.id}-${index}`}><strong>{segment.participantInfo.identity}</strong>{targetLang !== "en" && translatedText && index === visible.length - 1 ? translatedText : segment.text}</p>) : <p><Captions size={15} /> Captions ready. Select a target language for real-time translation.</p>}
      {translationError && <p className="live-caption-error">Translation unavailable: {translationError}</p>}
    </div>
  );
}

function ConferenceRoomMeta() {
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const connected = String(connectionState).toLowerCase() === "connected";
  return <div className="conference-room-meta" aria-live="polite"><span className={connected ? "connected" : "reconnecting"}><Wifi size={14} />{connected ? "Connected" : String(connectionState)}</span><span><Users size={14} />{participants.length} {participants.length === 1 ? "participant" : "participants"}</span></div>;
}

function BrandMark() {
  return <span className="brand" aria-label="Velocity Venue"><span className="brand-mark"><i /><i /></span><span>VELOCITY <span>VENUE</span></span></span>;
}
