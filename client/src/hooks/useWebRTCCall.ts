import { useCallback, useEffect, useRef, useState } from "react";
import { getIceServers, type IceServer } from "@/lib/api";

export type CallConnectionState =
  | "idle"
  | "requesting-media"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed"
  | "ended";

interface WebRTCSignal {
  type: "webrtc-offer" | "webrtc-answer" | "webrtc-ice-candidate";
  userId?: string;
  payload?: unknown;
}

interface UseWebRTCCallOptions {
  ws: WebSocket | null;
  // Call is torn down whenever this flips to false — driven by the parent
  // page's session phase (only "live" audio/video sessions get a call).
  active: boolean;
  withVideo: boolean;
  // Fixed by role, not negotiated, to avoid offer/answer glare: the client
  // always initiates, the professional always answers.
  isInitiator: boolean;
  myUserId: string;
}

const FALLBACK_STUN: IceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

function mediaErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera/microphone access was denied. Please allow access in your browser and rejoin the session.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera or microphone was found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Your camera or microphone is already in use by another app.";
  }
  return "Couldn't access your camera or microphone. Please check your device settings and rejoin.";
}

export function useWebRTCCall({ ws, active, withVideo, isInitiator, myUserId }: UseWebRTCCallOptions) {
  const [connectionState, setConnectionState] = useState<CallConnectionState>("idle");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  // Populated inside the setup effect below so retryConnection (exposed to
  // the UI) can reach the live peer connection without re-running the whole
  // effect — previously a "failed" connectionState had no recovery path
  // except the hangup button, which ends the entire paid session for a
  // problem that's often just a transient network hiccup.
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMuted = !isMuted;
    stream.getAudioTracks().forEach((track) => (track.enabled = !nextMuted));
    setIsMuted(nextMuted);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextOff = !isCameraOff;
    stream.getVideoTracks().forEach((track) => (track.enabled = !nextOff));
    setIsCameraOff(nextOff);
  }, [isCameraOff]);

  useEffect(() => {
    if (!active || !ws) {
      return;
    }

    let cancelled = false;
    let pc: RTCPeerConnection | null = null;
    let onMessage: ((event: MessageEvent) => void) | null = null;
    const pendingCandidates: RTCIceCandidateInit[] = [];
    // Resolves once the local getUserMedia attempt has settled AND (on
    // success) its tracks are already attached to the peer connection — an
    // incoming offer must wait for this before answering, otherwise the
    // answer SDP is built before our tracks exist and comes out receive-only
    // (audio/video would flow one-way) whenever the offer beats the
    // permission prompt, which is a very likely race in practice.
    let resolveLocalMediaReady!: (stream: MediaStream | null) => void;
    const localMediaReady = new Promise<MediaStream | null>((resolve) => {
      resolveLocalMediaReady = resolve;
    });

    setConnectionState("requesting-media");
    setMediaError(null);

    const sendSignal = (message: { type: WebRTCSignal["type"]; payload: unknown }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    };

    (async () => {
      // TURN credentials first — setConfiguration() after ICE gathering has
      // already started won't apply to the connection in progress, so the
      // peer connection must be constructed with the real server list from
      // the start, not upgraded later. STUN-only fallback if this fails.
      let iceServers = FALLBACK_STUN;
      try {
        const res = await getIceServers();
        if (res.iceServers.length) iceServers = res.iceServers;
      } catch (error) {
        console.error("Failed to fetch ICE servers, falling back to STUN-only:", error);
      }
      if (cancelled) return;

      pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({ type: "webrtc-ice-candidate", payload: event.candidate.toJSON() });
        }
      };

      pc.ontrack = (event) => {
        // ontrack fires once per track (audio, then video), often with the
        // *same* underlying MediaStream object both times — React bails out
        // of re-rendering on a referentially-identical state value, which
        // would leave the UI stuck not noticing a video track that arrived
        // after the audio one. Wrapping in a new MediaStream forces a fresh
        // reference every time so downstream track-count checks re-evaluate.
        const stream = event.streams[0];
        setRemoteStream(stream ? new MediaStream(stream.getTracks()) : null);
      };

      pc.onconnectionstatechange = () => {
        if (!pc) return;
        switch (pc.connectionState) {
          case "connected":
            setConnectionState("connected");
            break;
          case "disconnected":
            setConnectionState("reconnecting");
            break;
          case "failed":
            setConnectionState("failed");
            break;
          case "closed":
            setConnectionState((prev) => (prev === "failed" ? prev : "ended"));
            break;
          default:
            setConnectionState((prev) => (prev === "connected" ? prev : "connecting"));
        }
      };

      const flushPendingCandidates = async () => {
        const queued = pendingCandidates.splice(0, pendingCandidates.length);
        for (const candidate of queued) {
          try {
            await pc!.addIceCandidate(candidate);
          } catch (error) {
            console.error("Failed to add queued ICE candidate:", error);
          }
        }
      };

      onMessage = (event: MessageEvent) => {
        if (!pc) return;
        let data: WebRTCSignal;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        // Ignore our own messages (the relay echoes to every room member,
        // including the sender) and anything that isn't call signaling.
        if (data.userId === myUserId) return;

        if (data.type === "webrtc-offer") {
          (async () => {
            const stream = await localMediaReady;
            if (!pc || !stream) return;
            await pc.setRemoteDescription(data.payload as RTCSessionDescriptionInit);
            await flushPendingCandidates();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal({ type: "webrtc-answer", payload: answer });
          })().catch((error) => console.error("Failed to handle WebRTC offer:", error));
        } else if (data.type === "webrtc-answer") {
          (async () => {
            if (!pc || pc.signalingState === "closed") return;
            await pc.setRemoteDescription(data.payload as RTCSessionDescriptionInit);
            await flushPendingCandidates();
          })().catch((error) => console.error("Failed to handle WebRTC answer:", error));
        } else if (data.type === "webrtc-ice-candidate") {
          const candidate = data.payload as RTCIceCandidateInit;
          if (pc.remoteDescription) {
            pc.addIceCandidate(candidate).catch((error) =>
              console.error("Failed to add ICE candidate:", error)
            );
          } else {
            pendingCandidates.push(candidate);
          }
        }
      };
      ws.addEventListener("message", onMessage);

      // The professional (non-initiator) needs the peer connection + message
      // listener ready to receive an offer before its own camera/mic
      // permission prompt resolves — so signaling wiring above happens
      // unconditionally, and media is requested afterward without blocking it.
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
      } catch (error) {
        if (!cancelled) {
          setMediaError(mediaErrorMessage(error));
          setConnectionState("failed");
        }
      }
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        resolveLocalMediaReady(null);
        return;
      }

      if (stream) {
        localStreamRef.current = stream;
        setLocalStream(stream);
        stream.getTracks().forEach((track) => pc!.addTrack(track, stream!));
      }
      resolveLocalMediaReady(stream);

      if (stream && isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: "webrtc-offer", payload: offer });
      }
    })().catch((error) => console.error("WebRTC call setup failed:", error));

    return () => {
      cancelled = true;
      if (onMessage) ws.removeEventListener("message", onMessage);
      if (pc) {
        pc.getSenders().forEach((sender) => sender.track?.stop());
        pc.close();
      }
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
      setIsMuted(false);
      setIsCameraOff(false);
      setConnectionState((prev) => (prev === "failed" ? prev : "idle"));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ws, withVideo, isInitiator, myUserId]);

  // Attempts to recover a "failed" connection in place via an ICE restart,
  // instead of the only previous option — hangup, which ends the entire
  // paid session over what's often just a transient network blip. The
  // signaling relay doesn't gate "webrtc-offer" handling by role (see
  // onMessage above), so either side can initiate a restart, not just
  // whichever one made the original offer.
  const retryConnection = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      setConnectionState("connecting");
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: "webrtc-offer", payload: offer }));
    } catch (error) {
      console.error("ICE restart failed:", error);
      setConnectionState("failed");
    }
  }, [ws]);

  return {
    connectionState,
    mediaError,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    retryConnection,
  };
}
