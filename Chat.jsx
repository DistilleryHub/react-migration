import { useEffect, useMemo, useState } from 'react';
import {
  collection, query, where, orderBy, onSnapshot, addDoc, doc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

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

export default function Chat() {
  const { currentUser } = useAuth();
  const [people, setPeople] = useState([]);
  const [connections, setConnections] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { type:'direct', person } or { type:'group', chat }
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

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

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;
    const chatId = activeChat.type === 'direct'
      ? chatIdFor(currentUser.uid, activeChat.person.id)
      : activeChat.chat.id;
    const participants = activeChat.type === 'direct'
      ? [currentUser.uid, activeChat.person.id].sort()
      : activeChat.chat.participants;
    const body = text.trim();
    setText('');
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: currentUser.uid,
      text: body,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'chats', chatId), {
      type: activeChat.type === 'group' ? 'group' : 'direct',
      participants,
      ...(activeChat.type === 'group' ? { name: activeChat.chat.name } : {}),
      lastMessage: body,
      lastMessageAt: serverTimestamp(),
    }, { merge: true });
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
        </div>
        <div className="chat-messages">
          {messages.map((m) => (
            <div key={m.id} className={'chat-bubble' + (m.senderId === currentUser.uid ? ' mine' : '')}>
              <div>{m.text}</div>
              <div className="chat-bubble-time">{timeAgo(m.createdAt)}</div>
            </div>
          ))}
        </div>
        <form className="chat-input-row" onSubmit={sendMessage}>
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
