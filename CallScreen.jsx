import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useCall } from './CallContext';

// Small cache so we don't re-fetch the same user profile repeatedly during a call.
const profileCache = {};

function useUserProfile(uid) {
  const [profile, setProfile] = useState(profileCache[uid] || null);
  useEffect(() => {
    if (!uid) return;
    if (profileCache[uid]) { setProfile(profileCache[uid]); return; }
    let cancelled = false;
    getDoc(doc(db, 'users', uid)).then((snap) => {
      if (cancelled) return;
      const data = snap.exists() ? snap.data() : {};
      profileCache[uid] = data;
      setProfile(data);
    });
    return () => { cancelled = true; };
  }, [uid]);
  return profile || {};
}

function Avatar({ profile, size = 96 }) {
  const initial = profile?.name?.[0]?.toUpperCase() || '?';
  return profile?.photoURL ? (
    <img
      src={profile.photoURL}
      alt=""
      className="call-avatar"
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
    />
  ) : (
    <div
      className="call-avatar call-avatar-fallback"
      style={{ width: size, height: size, borderRadius: '50%' }}
    >
      {initial}
    </div>
  );
}

function CallTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return <span className="call-timer">{mm}:{ss}</span>;
}

// ---------------------------------------------------------------------
// Incoming call — full-screen ringing UI, WhatsApp style.
// ---------------------------------------------------------------------
function IncomingCallOverlay({ call, onAccept, onDecline }) {
  const { currentUser } = useAuth();
  const otherUid = (call.participants || []).find((u) => u !== currentUser.uid);
  const profile = useUserProfile(otherUid);

  return (
    <div className="call-overlay call-overlay-incoming">
      <div className="call-incoming-top">
        <span className="call-type-label">
          {call.callType === 'video' ? 'Incoming video call' : 'Incoming voice call'}
        </span>
      </div>
      <div className="call-incoming-center">
        <Avatar profile={profile} size={140} />
        <h2 className="call-caller-name">{profile.name || 'DistilleryHub member'}</h2>
        <p className="call-ringing-text">is calling…</p>
      </div>
      <div className="call-incoming-actions">
        <button className="call-btn call-btn-decline" onClick={onDecline} aria-label="Decline call">
          <span>📞</span>
        </button>
        <button className="call-btn call-btn-accept" onClick={onAccept} aria-label="Accept call">
          <span>📞</span>
        </button>
      </div>
      <div className="call-incoming-labels">
        <span>Decline</span>
        <span>Accept</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Active call — full-screen remote video/avatar with local PiP + controls.
// ---------------------------------------------------------------------
function ActiveCallOverlay({
  call, remoteStreams, localStream, muted, videoOff, onLeave, onToggleMute, onToggleVideo, onSwitchCamera,
}) {
  const { currentUser } = useAuth();
  const otherUid = (call.participants || []).find((u) => u !== currentUser.uid);
  const profile = useUserProfile(otherUid);
  const remoteStream = remoteStreams[otherUid];

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream || null;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream || null;
  }, [remoteStream]);

  // Remote AUDIO always plays through this dedicated <audio> element,
  // regardless of call type or whether a video track exists yet. Previously
  // sound only came through the <video> tag, which meant audio-only calls
  // (and video calls before the remote camera frame arrived) had no sound
  // at all — this fixes that.
  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream || null;
  }, [remoteStream]);

  const isVideoCall = call.callType === 'video';
  const remoteHasVideo = isVideoCall && !!remoteStream && remoteStream.getVideoTracks().length > 0;

  return (
    <div className="call-overlay call-overlay-active">
      {/* Always mounted, handles all remote sound. Video element below is
          always muted so the audio track never plays twice. */}
      <audio ref={remoteAudioRef} autoPlay />

      {remoteHasVideo ? (
        <video ref={remoteVideoRef} className="call-remote-video" autoPlay playsInline muted />
      ) : (
        <div className="call-remote-audio-bg">
          <Avatar profile={profile} size={140} />
        </div>
      )}

      <div className="call-active-header">
        <h2 className="call-caller-name">{profile.name || 'DistilleryHub member'}</h2>
        <CallTimer startedAt={startedAt} />
      </div>

      {isVideoCall && localStream && (
        <video
          ref={localVideoRef}
          className={'call-local-video' + (videoOff ? ' call-local-video-off' : '')}
          autoPlay
          playsInline
          muted
        />
      )}

      <div className="call-active-controls">
        <button
          className={'call-control-btn' + (muted ? ' active' : '')}
          onClick={onToggleMute}
          aria-label="Toggle mute"
        >
          {muted ? '🔇' : '🎙️'}
        </button>

        {isVideoCall && (
          <button
            className={'call-control-btn' + (videoOff ? ' active' : '')}
            onClick={onToggleVideo}
            aria-label="Toggle camera"
          >
            {videoOff ? '📷' : '🎥'}
          </button>
        )}

        {isVideoCall && (
          <button
            className="call-control-btn"
            onClick={onSwitchCamera}
            aria-label="Switch front/back camera"
          >
            🔄
          </button>
        )}

        <button className="call-btn call-btn-decline call-btn-end" onClick={onLeave} aria-label="End call">
          <span>📞</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
export default function CallScreen() {
  const {
    activeCall, remoteStreams, localStream, muted, videoOff, incomingCall,
    joinCall, leaveCall, declineCall, toggleMute, toggleVideo, switchCamera,
  } = useCall();

  if (activeCall) {
    return (
      <ActiveCallOverlay
        call={activeCall}
        remoteStreams={remoteStreams}
        localStream={localStream}
        muted={muted}
        videoOff={videoOff}
        onLeave={leaveCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onSwitchCamera={switchCamera}
      />
    );
  }

  if (incomingCall) {
    return (
      <IncomingCallOverlay
        call={incomingCall}
        onAccept={() => joinCall(incomingCall)}
        onDecline={declineCall}
      />
    );
  }

  return null;
}
