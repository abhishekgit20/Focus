import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import type { useWebRTCCall } from "@/hooks/useWebRTCCall";

interface CallPanelProps {
  withVideo: boolean;
  peerName: string;
  peerAvatar: string;
  call: ReturnType<typeof useWebRTCCall>;
  onHangup: () => void;
}

export function CallPanel({ withVideo, peerName, peerAvatar, call, onHangup }: CallPanelProps) {
  const { connectionState, mediaError, localStream, remoteStream, isMuted, isCameraOff, toggleMute, toggleCamera, retryConnection } = call;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const hasRemoteVideo = withVideo && (remoteStream?.getVideoTracks().length ?? 0) > 0;

  return (
    <div className="bg-slate-900 rounded-2xl p-8 mb-4 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden flex-shrink-0">
      {mediaError ? (
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">Can't start the call</p>
          <p className="text-white/70 text-sm">{mediaError}</p>
        </div>
      ) : (
        <>
          {hasRemoteVideo ? (
            // flex-shrink-0 matters here: this is a flex item inside nested
            // flex-col ancestors up to a viewport-height-constrained layout
            // (Consultation.tsx's chat panel below competes for the same
            // space). Flex items default to min-height:auto in a column
            // context, which lets the browser shrink an aspect-ratio box
            // *below* its computed 16:9 size instead of respecting it — the
            // video was rendering as a squashed sliver a few dozen px tall.
            // Pinning it to its intrinsic size makes the page scroll for
            // the rest of the content instead of crushing the video.
            <div className="w-full aspect-video bg-slate-800 rounded-lg overflow-hidden mb-4 relative flex-shrink-0">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {localStream && withVideo && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-3 right-3 w-24 h-16 sm:w-32 sm:h-20 rounded-md object-cover border-2 border-white/30 bg-slate-700"
                />
              )}
            </div>
          ) : (
            <img src={peerAvatar} alt={peerName} className="w-32 h-32 rounded-full object-cover mb-4" />
          )}

          {/* Remote audio always needs an element to actually play, even in
              audio-only calls or before the peer's video track arrives. */}
          {!hasRemoteVideo && <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />}

          <h3 className="text-white text-xl font-semibold mb-1">{peerName}</h3>
          <p className="text-white/60 mb-6 flex items-center gap-2">
            {connectionState === "requesting-media" && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Requesting camera/microphone access...
              </>
            )}
            {connectionState === "connecting" && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting...
              </>
            )}
            {connectionState === "connected" && (withVideo ? "Video call in progress..." : "Voice call in progress...")}
            {connectionState === "reconnecting" && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reconnecting...
              </>
            )}
            {connectionState === "failed" && !mediaError && "Connection failed — this can happen on restrictive networks."}
          </p>

          <div className="flex gap-4">
            {connectionState === "failed" && !mediaError && (
              // Previously the only recovery from a failed connection was
              // hangup, which ends the entire paid session — a transient
              // network blip (very plausible on the mobile/home networks
              // this audience uses) shouldn't cost the rest of a booked slot.
              <Button
                variant="secondary"
                className="rounded-full h-12 px-5 gap-2"
                onClick={retryConnection}
              >
                <RefreshCw className="w-4 h-4" /> Retry Connection
              </Button>
            )}
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              className="rounded-full w-12 h-12"
              onClick={toggleMute}
              disabled={!localStream}
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            {withVideo && (
              <Button
                variant={isCameraOff ? "destructive" : "secondary"}
                size="icon"
                className="rounded-full w-12 h-12"
                onClick={toggleCamera}
                disabled={!localStream}
                aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
              >
                {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>
            )}
            <Button variant="destructive" size="icon" className="rounded-full w-12 h-12" onClick={onHangup} aria-label="End call">
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
