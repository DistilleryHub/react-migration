import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import {
  doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, where,
  serverTimestamp, arrayRemove, getDoc, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

const CallContext = createContext(null);
export function useCall() { return useContext(CallContext); }

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function CallProvider({ children }) {
  const { currentUser } = useAuth();
  const [activeCall, setActiveCall] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const unsubSignalsRef = useRef(null);
  const activeCallRef = useRef(null);

  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'calls'), where('participants', 'array-contains', currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        const data = { id: change.doc.id, ...change.doc.data() };
        if (change.type === 'added' && data.status === 'ringing' && data.initiatedBy !== currentUser.uid) {
          setIncomingCall(data);
        }
        if (data.status === 'ended' && activeCallRef.current?.id === data.id) {
          endCallCleanup();
        }
      });
    });
    return unsub;
  }, [currentUser]);

  function createPeerConnection(peerUid, callId) {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [peerUid]: event.streams[0] }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(collection(db, 'calls', callId, 'signals'), {
          from: currentUser.uid,
          to: peerUid,
          kind: 'candidate',
          payload: JSON.stringify(event.candidate),
          createdAt: serverTimestamp(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[peerUid];
          return next;
        });
      }
    };

    peersRef.current[peerUid] = pc;
    return pc;
  }

  async function connectToPeer(peerUid, callId, callType) {
    const pc = createPeerConnection(peerUid, callId);
    const initiate = currentUser.uid < peerUid;
    if (initiate) {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await pc.setLocalDescription(offer);
      await addDoc(collection(db, 'calls', callId, 'signals'), {
        from: currentUser.uid,
        to: peerUid,
        kind: 'offer',
        payload: JSON.stringify(offer),
        createdAt: serverTimestamp(),
      });
    }
  }

  function listenForSignals(callId) {
    const q = query(
      collection(db, 'calls', callId, 'signals'),
      where('to', '==', currentUser.uid),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
      snap.docChanges().forEach(async (change) => {
        if (change.type !== 'added') return;
        const sig = change.doc.data();
        const from = sig.from;
        let pc = peersRef.current[from];
        if (!pc) pc = createPeerConnection(from, callId);

        const payload = JSON.parse(sig.payload);

        try {
          if (sig.kind === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await addDoc(collection(db, 'calls', callId, 'signals'), {
              from: currentUser.uid,
              to: from,
              kind: 'answer',
              payload: JSON.stringify(answer),
              createdAt: serverTimestamp(),
            });
          } else if (sig.kind === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
          } else if (sig.kind === 'candidate') {
            await pc.addIceCandidate(new RTCIceCandidate(payload));
          }
        } catch (e) { /* ignore stale signals */ }

        deleteDoc(change.doc.ref).catch(() => {});
      });
    });
  }

  const startCall = useCallback(async (participantUids, callType = 'video') => {
    if (!currentUser) return;
    const allParticipants = [...new Set([currentUser.uid, ...participantUids])];
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });
    localStreamRef.current = stream;
    setLocalStream(stream);

    const callRef = await addDoc(collection(db, 'calls'), {
      participants: allParticipants,
      initiatedBy: currentUser.uid,
      callType,
      status: 'ringing',
      createdAt: serverTimestamp(),
    });

    setActiveCall({ id: callRef.id, callType, participants: allParticipants });
    unsubSignalsRef.current = listenForSignals(callRef.id);

    for (const uid of allParticipants) {
      if (uid !== currentUser.uid) await connectToPeer(uid, callRef.id, callType);
    }

    await updateDoc(doc(db, 'calls', callRef.id), { status: 'active' });
  }, [currentUser]);

  const joinCall = useCallback(async (call) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: call.callType === 'video',
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    setIncomingCall(null);
    setActiveCall({ id: call.id, callType: call.callType, participants: call.participants });

    unsubSignalsRef.current = listenForSignals(call.id);

    for (const uid of call.participants) {
      if (uid !== currentUser.uid) await connectToPeer(uid, call.id, call.callType);
    }
  }, [currentUser]);

  function endCallCleanup() {
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams({});
    setActiveCall(null);
    setMuted(false);
    setVideoOff(false);
    if (unsubSignalsRef.current) { unsubSignalsRef.current(); unsubSignalsRef.current = null; }
  }

  const leaveCall = useCallback(async () => {
    if (!activeCall) return;
    const callRef = doc(db, 'calls', activeCall.id);
    const snap = await getDoc(callRef);
    if (snap.exists()) {
      const remaining = (snap.data().participants || []).filter((u) => u !== currentUser.uid);
      if (remaining.length <= 1) {
        await updateDoc(callRef, { status: 'ended' });
      } else {
        await updateDoc(callRef, { participants: arrayRemove(currentUser.uid) });
      }
    }
    endCallCleanup();
  }, [activeCall, currentUser]);

  const declineCall = useCallback(() => setIncomingCall(null), []);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const next = !muted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const next = !videoOff;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !next));
    setVideoOff(next);
  }, [videoOff]);

  return (
    <CallContext.Provider value={{
      activeCall, remoteStreams, localStream, muted, videoOff, incomingCall,
      startCall, joinCall, leaveCall, declineCall, toggleMute, toggleVideo,
    }}>
      {children}
    </CallContext.Provider>
  );
              }
