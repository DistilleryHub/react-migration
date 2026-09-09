import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useCall } from './CallContext';

function LocalVideo({ stream, muted, videoOff }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return (
    <div className="call-tile call-tile-self">
      <video ref={ref} autoPlay playsInline muted className={videoOff ? 'call-video-hidden' : ''} />
      <div className="call-tile-label">You {muted && '🔇'}</div>
    </div>
  );
}

function RemoteVideo({ stream, name }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return (
    <div className="call-tile">
      <video ref={ref} autoPlay playsInline />
      <div className="call-tile-label">{name || 'Connecting…'}</div>
    </div>
  );
}

export default function CallScreen() {
  const { currentUser } = useAuth();
  const {
    activeCall, remoteStreams, localStream, muted, videoOff,
    incomingCall, joinCall, leaveCall, declineCall, toggleMute, toggleVideo,
  } = useCall();
  const [names, setNames] = useState({});

  useEffect(() => {
    const call = activeCall || incomingCall;
    if (!call) return;
    call.participants.forEach(async (uid) => {
      if (names[uid] || uid === currentUser?.uid) return;
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) setNames((prev) => ({ ...prev, [uid]: snap.data().name }));
    });
  }, [activeCall, incomingCall]);

  if (incomingCall && !activeCall) {
    const callerName = names[incomingCall.initiatedBy] || 'Someone';
    return (
      <div className="call-overlay call-incoming">
        <div className="call-incoming-card">
          <div className="avatar avatar-lg" style={{ margin: '0 auto 14px' }}>{callerName[0] || '?'}</div>
          <div className="call-incoming-name">{callerName}</div>
          <div className="call-incoming-sub">
            Incoming {incomingCall.callType === 'video' ? 'video' : 'voice'} call…
          </div>
          <div className="call-incoming-actions">
            <button className="call-btn call-btn-decline" onClick={declineCall}>✕</button>
            <button className="call-btn call-btn-accept" onClick={() => joinCall(incomingCall)}>✓</button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeCall) return null;

  const otherUids = activeCall.participants.filter((u) => u !== currentUser.uid);

  return (
    <div className="call-overlay">
      <div className="call-grid">
        <LocalVideo stream={localStream} muted={muted} videoOff={videoOff} />
        {otherUids.map((uid) => (
          <RemoteVideo key={uid} stream={remoteStreams[uid]} name={names[uid]} />
        ))}
      </div>
      <div className="call-controls">
        <button className="call-btn" onClick={toggleMute}>{muted ? '🔇' : '🎤'}</button>
        {activeCall.callType === 'video' && (
          <button className="call-btn" onClick={toggleVideo}>{videoOff ? '📷' : '📹'}</button>
        )}
        <button className="call-btn call-btn-end" onClick={leaveCall}>📞</button>
      </div>
    </div>
  );
}
