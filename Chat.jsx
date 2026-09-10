import { useEffect, useMemo, useState, useRef } from 'react';
import {
  collection, query, where, orderBy, onSnapshot, addDoc, doc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from './firebase';
import { useAuth } from './AuthContext';
import { useCall } from './CallContext';

function chatIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

function timeAgo(ts) {
  if (!ts?.toDate) return '';
  const diff = Date.now() - ts.toDate().getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

async function uploadToCloudinary(file, resourceType = 'auto') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const reason = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(reason);
  }
  return data.secure_url;
}

const ATTACH_OPTIONS = [
  { key: 'schedule', label: 'Schedule Message', icon: '🕒', color: '#4f7fff' },
  { key: 'quickreply', label: 'Quick Reply', icon: '↗️', color: '#4f7fff' },
  { key: 'location', label: 'Batch Location', icon: '📍', color: '#22c55e' },
  { key: 'profile', label: 'Share Profile', icon: '👤', color: '#f97316' },
  { key: 'photo', label: 'Photo', icon: '🖼️', color: '#ec4899' },
  { key: 'video', label: 'Video', icon: '▶️', color: '#a855f7' },
  { key: 'voice', label: 'Voice Note', icon: '🎤', color: '#f5576c' },
  { key: 'document', label: 'Share Document', icon: '📄', color: '#f97316' },
];

const QUICK_REPLIES = [
  'Thanks, will check and get back!',
  'Can we schedule a call?',
  'Sounds good 👍',
];

export default function Chat() {
  const { currentUser } = useAuth();
  const { startCall } = useCall();
  const [people, setPeople] = useState([]);
  const [connections, setConnections] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAttach, setShowAttach] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setPeople(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const qFrom = query(collection(db, 'connections'), where('from', '==', currentUser.uid), where('status', '==', 'accepted'));
    const qTo = query(collection(db, 'connections'), where('to', '==', currentUser.uid), where('status', '==', 'accepted'));
    let fromDocs = [], toDocs = [];
    const merge = () => setConnections([...fromDocs, ...toDocs]);
    const unsub1 = onSnapshot(qFrom, (snap) => { fromDocs = snap.docs.map((d) => d.data()); merge(); });
    const unsub2 = onSnapshot(qTo, (snap) => { toDocs = snap.docs.map((d) => d.data()); merge(); });
    return () => { unsub1(); unsub2(); };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      const groups = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => c.type === 'group');
      groups.sort((a, b) => (b.lastMessageAt?.toMillis() || 0) - (a.lastMessageAt?.toMillis() || 0));
      setGroupChats(groups);
    });
    return unsub;
  }, [currentUser]);

  const connectedPeople = useMemo(() => {
    const otherIds = connections.map((c) => (c.from === currentUser?.uid ? c.to : c.from));
    return people.filter((p) => otherIds.includes(p.id));
  }, [connections, people, currentUser]);

  useEffect(() => {
    if (!activeChat || !currentUser) return;
    const chatId = activeChat.type === 'direct'
      ? chatIdFor(currentUser.uid, activeChat.person.id)
      : activeChat.chat.id;
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [activeChat, currentUser]);

  function getChatMeta() {
    const chatId = activeChat.type === 'direct'
      ? chatIdFor(currentUser.uid, activeChat.person.id)
      : activeChat.chat.id;
    const participants = activeChat.type === 'direct'
      ? [currentUser.uid, activeChat.person.id].sort()
      : activeChat.chat.participants;
    return { chatId, participants };
  }

  async function sendRawMessage(body, extra = {}) {
    if (!body.trim() && !extra.mediaUrl) return;
    const { chatId, participants } = getChatMeta();
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: currentUser.uid,
      text: body,
      createdAt: serverTimestamp(),
      ...extra,
    });
    await setDoc(doc(db, 'chats', chatId), {
      type: activeChat.type === 'group' ? 'group' : 'direct',
      participants,
      ...(activeChat.type === 'group' ? { name: activeChat.chat.name } : {}),
      lastMessage: body || `[${extra.attachmentType || 'attachment'}]`,
      lastMessageAt: serverTimestamp(),
    }, { merge: true });
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;
    const body = text.trim();
    setText('');
    await sendRawMessage(body);
  }

  function handleAttachClick(key) {
    setShowAttach(false);
    if (key === 'schedule') {
      alert('Schedule message — coming soon.');
    } else if (key === 'quickreply') {
      setShowQuickReplies(true);
    } else if (key === 'location') {
      const loc = prompt('Enter batch / distillery location:');
      if (loc) sendRawMessage(`📍 ${loc}`, { attachmentType: 'location' });
    } else if (key === 'profile') {
      sendRawMessage(`👤 Shared profile: ${currentUser.displayName || currentUser.email}`, {
        attachmentType: 'profile',
        sharedUid: currentUser.uid,
      });
    } else if (key === 'photo') {
      fileInputRef.current.setAttribute('accept', 'image/*');
      fileInputRef.current.setAttribute('data-kind', 'photo');
      fileInputRef.current.click();
    } else if (key === 'video') {
      fileInputRef.current.setAttribute('accept', 'video/*');
      fileInputRef.current.setAttribute('data-kind', 'video');
      fileInputRef.current.click();
    } else if (key === 'document') {
      fileInputRef.current.setAttribute('accept', '.pdf,.doc,.docx,.xls,.xlsx,.txt');
      fileInputRef.current.setAttribute('data-kind', 'document');
      fileInputRef.current.click();
    } else if (key === 'voice') {
      startRecording();
    }
  }

  async function handleFileChosen(e) {
    const file = e.target.files?.[0];
    const kind = e.target.getAttribute('data-kind');
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const resourceType = kind === 'photo' ? 'image' : kind === 'video' ? 'video' : 'raw';
      const url = await uploadToCloudinary(file, resourceType);
      const icon = kind === 'photo' ? '🖼️' : kind === 'video' ? '▶️' : '📄';
      await sendRawMessage(`${icon} ${file.name}`, { attachmentType: kind, mediaUrl: url });
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setUploading(true);
        try {
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
          const url = await uploadToCloudinary(file, 'video');
          await sendRawMessage('🎤 Voice note', { attachmentType: 'voice', mediaUrl: url });
        } catch (err) {
          alert('Upload failed: ' + err.message);
        }
        setUploading(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      alert('Microphone access denied or unavailable.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function createGroup(e) {
    e.preventDefault();
    if (!groupName.trim() || selectedIds.length === 0) return;
    const ref = await addDoc(collection(db, 'chats'), {
      type: 'group',
      name: groupName.trim(),
      participants: [...selectedIds, currentUser.uid],
      createdBy: currentUser.uid,
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
    });
    setGroupName(''); setSelectedIds([]); setShowNewGroup(false);
    setActiveChat({ type: 'group', chat: { id: ref.id, name: groupName.trim(), participants: [...selectedIds, currentUser.uid] } });
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleStartCall(callType) {
    const others = activeChat.type === 'direct'
      ? [activeChat.person.id]
      : activeChat.chat.participants.filter((id) => id !== currentUser.uid);
    startCall(others, callType);
  }

  if (activeChat) {
    const name = activeChat.type === 'direct' ? activeChat.person.name : activeChat.chat.name;
    const photoURL = activeChat.type === 'direct' ? activeChat.person.photoURL : null;
    return (
      <div className="chat-thread">
        <div className="chat-thread-header">
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveChat(null)}>← Back</button>
          <div className="avatar">
            {photoURL ? <img src={photoURL} alt="" /> : (name?.[0] || '?')}
          </div>
          <div className="chat-thread-name">{name}</div>
          <div className="chat-call-actions">
            <button className="chat-call-btn" onClick={() => handleStartCall('audio')} title="Voice call">📞</button>
            <button className="chat-call-btn" onClick={() => handleStartCall('video')} title="Video call">📹</button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((m) => (
            <div key={m.id} className={'chat-bubble' + (m.senderId === currentUser.uid ? ' mine' : '')}>
              {m.attachmentType === 'photo' && m.mediaUrl && (
                <img src={m.mediaUrl} alt="" className="chat-media-img" />
              )}
              {m.attachmentType === 'video' && m.mediaUrl && (
                <video src={m.mediaUrl} controls className="chat-media-video" />
              )}
              {m.attachmentType === 'voice' && m.mediaUrl && (
                <audio src={m.mediaUrl} controls className="chat-media-audio" />
              )}
              {m.attachmentType === 'document' && m.mediaUrl && (
                <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="chat-media-doc">{m.text}</a>
              )}
              {(!m.attachmentType || m.attachmentType === 'location' || m.attachmentType === 'profile') && (
                <div>{m.text}</div>
              )}
              <div className="chat-bubble-time">{timeAgo(m.createdAt)}</div>
            </div>
          ))}
          {uploading && <div className="chat-bubble mine chat-bubble-uploading">Uploading…</div>}
        </div>

        {recording && (
          <div className="recording-bar">
            <span className="recording-dot" /> Recording voice note…
            <button className="btn btn-sm btn-primary" onClick={stopRecording}>Stop &amp; Send</button>
          </div>
        )}

        {showQuickReplies && (
          <div className="quick-reply-row">
            {QUICK_REPLIES.map((qr) => (
              <button key={qr} className="quick-reply-chip" onClick={() => { sendRawMessage(qr); setShowQuickReplies(false); }}>
                {qr}
              </button>
            ))}
            <button className="quick-reply-chip quick-reply-close" onClick={() => setShowQuickReplies(false)}>✕</button>
          </div>
        )}

        {showAttach && (
          <div className="attach-menu">
            {ATTACH_OPTIONS.map((opt) => (
              <button key={opt.key} className="attach-item" onClick={() => handleAttachClick(opt.key)}>
                <span className="attach-icon" style={{ background: opt.color + '22', color: opt.color }}>
                  {opt.icon}
                </span>
                <span className="attach-label">{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChosen} />

        <form className="chat-input-row" onSubmit={sendMessage}>
          <button type="button" className="chat-attach-btn" onClick={() => setShowAttach((v) => !v)}>
            {showAttach ? '✕' : '+'}
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">Send</button>
        </form>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="card">
        <button className="btn btn-primary btn-sm" onClick={() => setShowNewGroup((v) => !v)}>
          {showNewGroup ? 'Cancel' : 'New group chat'}
        </button>
      </div>

      {showNewGroup && (
        <form className="card" onSubmit={createGroup}>
          <div className="form-field">
            <input type="text" placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          </div>
          <div className="group-select-list">
            {connectedPeople.map((p) => (
              <label key={p.id} className="group-select-item">
                <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 8 }}>Create group</button>
        </form>
      )}

      {groupChats.length > 0 && (
        <div className="card">
          <h3>Groups</h3>
          {groupChats.map((chat) => (
            <div className="person-row" key={chat.id} onClick={() => setActiveChat({ type: 'group', chat })}>
              <div className="avatar">👥</div>
              <div className="person-info">
                <div className="person-name">{chat.name}</div>
                <div className="person-headline">{chat.lastMessage || 'No messages yet'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3>Direct messages</h3>
      {connectedPeople.length === 0 && (
        <div className="empty-state">Connect with people in Network to start chatting.</div>
      )}
      {connectedPeople.map((person) => (
        <div className="card person-row" key={person.id} onClick={() => setActiveChat({ type: 'direct', person })}>
          <div className="avatar">
            {person.photoURL ? <img src={person.photoURL} alt="" /> : (person.name?.[0] || '?')}
          </div>
          <div className="person-info">
            <div className="person-name">{person.name}</div>
            <div className="person-headline">{person.headline}</div>
          </div>
        </div>
      ))}
    </div>
  );
                         }
