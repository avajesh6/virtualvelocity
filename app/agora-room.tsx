"use client";

import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IRemoteVideoTrack,
} from "agora-rtc-sdk-ng";
import { AlertTriangle, Mic, MicOff, PhoneOff, Radio, ShieldCheck, Users, Video, VideoOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface AgoraRoomProps {
  appId: string;
  channelName: string;
  token: string;
  uid: number;
  roomTitle: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  onLeave: () => void;
  notify: (message: string) => void;
}

function RemoteVideo({ track, uid }: { track: IRemoteVideoTrack; uid: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) track.play(containerRef.current);
    return () => track.stop();
  }, [track]);

  return <div className="agora-video-surface" ref={containerRef} aria-label={`Video from participant ${uid}`} />;
}

export function AgoraRoom({
  appId,
  channelName,
  token,
  uid,
  roomTitle,
  displayName,
  audioEnabled,
  videoEnabled,
  onLeave,
  notify,
}: AgoraRoomProps) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const audioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const videoTrackRef = useRef<ILocalVideoTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(audioEnabled);
  const [cameraEnabled, setCameraEnabled] = useState(videoEnabled);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);

  const refreshRemoteUsers = useCallback((client: IAgoraRTCClient) => {
    setRemoteUsers([...client.remoteUsers]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let client: IAgoraRTCClient | null = null;
    let audioTrack: ILocalAudioTrack | null = null;
    let videoTrack: ILocalVideoTrack | null = null;

    const connect = async () => {
      try {
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        client.on("user-published", async (user, mediaType) => {
          if (mediaType !== "audio" && mediaType !== "video") return;
          await client?.subscribe(user, mediaType);
          if (mediaType === "audio") user.audioTrack?.play();
          if (client) refreshRemoteUsers(client);
        });
        client.on("user-unpublished", () => client && refreshRemoteUsers(client));
        client.on("user-left", () => client && refreshRemoteUsers(client));

        await client.join(appId, channelName, token, uid);
        if (cancelled) {
          await client.leave();
          return;
        }

        [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
          { AEC: true, ANS: true, AGC: true },
          { encoderConfig: "720p_2" },
        );
        audioTrackRef.current = audioTrack;
        videoTrackRef.current = videoTrack;
        await audioTrack.setEnabled(audioEnabled);
        await videoTrack.setEnabled(videoEnabled);
        await client.publish([audioTrack, videoTrack]);
        if (videoEnabled && localVideoRef.current) videoTrack.play(localVideoRef.current);

        setStatus("connected");
        refreshRemoteUsers(client);
        notify(`Connected securely to ${channelName} with Agora.`);
      } catch (connectionError) {
        audioTrack?.stop();
        audioTrack?.close();
        videoTrack?.stop();
        videoTrack?.close();
        if (client) await client.leave().catch(() => undefined);
        audioTrackRef.current = null;
        videoTrackRef.current = null;
        clientRef.current = null;
        const message = connectionError instanceof Error ? connectionError.message : "Agora could not connect.";
        setError(message);
        setStatus("error");
        notify("Agora connection failed. No simulated connection was shown.");
      }
    };

    void connect();
    return () => {
      cancelled = true;
      audioTrack?.stop();
      audioTrack?.close();
      videoTrack?.stop();
      videoTrack?.close();
      audioTrackRef.current = null;
      videoTrackRef.current = null;
      clientRef.current = null;
      if (client) {
        client.removeAllListeners();
        void client.leave().catch(() => undefined);
      }
    };
  }, [appId, audioEnabled, channelName, notify, refreshRemoteUsers, token, uid, videoEnabled]);

  const toggleMicrophone = async () => {
    const next = !micEnabled;
    await audioTrackRef.current?.setEnabled(next);
    setMicEnabled(next);
    notify(next ? "Agora microphone enabled." : "Agora microphone muted.");
  };

  const toggleCamera = async () => {
    const next = !cameraEnabled;
    await videoTrackRef.current?.setEnabled(next);
    if (next && localVideoRef.current) videoTrackRef.current?.play(localVideoRef.current);
    else videoTrackRef.current?.stop();
    setCameraEnabled(next);
    notify(next ? "Agora camera enabled." : "Agora camera disabled.");
  };

  return (
    <div className="live-room-overlay" role="dialog" aria-modal="true" aria-label={`${roomTitle} Agora room`}>
      <div className="live-room-shell agora-room-container">
        <header className="live-room-header">
          <div className="live-room-identity">
            <Radio size={20} />
            <div><span className="status-pill live">AGORA</span><strong>{roomTitle}</strong><small>{channelName}</small></div>
          </div>
          <div className="conference-room-meta">
            <span><Users size={15} />{remoteUsers.length + 1} connected</span>
            <span><ShieldCheck size={15} />{status === "connected" ? "Encrypted media active" : "Connecting media"}</span>
          </div>
          <button className="leave-room-button" type="button" onClick={onLeave}><PhoneOff size={17} />Leave room</button>
        </header>

        {error ? (
          <div className="live-error" role="alert">
            <AlertTriangle size={18} />
            <span><strong>Unable to join with Agora</strong>{error}</span>
            <button type="button" className="secondary-button" onClick={onLeave}>Return to venue</button>
          </div>
        ) : (
          <div className="agora-participant-grid" aria-busy={status === "connecting"}>
            <article className="agora-participant-tile">
              <div className="agora-video-surface" ref={localVideoRef} />
              {!cameraEnabled && <div className="agora-avatar">{displayName.slice(0, 2).toUpperCase()}</div>}
              <footer><strong>{displayName} (You)</strong><span>{micEnabled ? <Mic size={13} /> : <MicOff size={13} />}</span></footer>
            </article>
            {remoteUsers.map((user) => (
              <article className="agora-participant-tile" key={String(user.uid)}>
                {user.hasVideo && user.videoTrack
                  ? <RemoteVideo track={user.videoTrack} uid={String(user.uid)} />
                  : <div className="agora-avatar">{String(user.uid).slice(-2)}</div>}
                <footer><strong>Participant {user.uid}</strong><span>{user.hasAudio ? <Mic size={13} /> : <MicOff size={13} />}</span></footer>
              </article>
            ))}
            {status === "connecting" && <p className="experience-empty">Connecting devices and publishing encrypted media…</p>}
          </div>
        )}

        {status === "connected" && (
          <div className="agora-action-bar">
            <button type="button" className={!micEnabled ? "off" : ""} onClick={() => void toggleMicrophone()}>
              {micEnabled ? <Mic size={17} /> : <MicOff size={17} />}{micEnabled ? "Mute" : "Unmute"}
            </button>
            <button type="button" className={!cameraEnabled ? "off" : ""} onClick={() => void toggleCamera()}>
              {cameraEnabled ? <Video size={17} /> : <VideoOff size={17} />}{cameraEnabled ? "Stop video" : "Start video"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
