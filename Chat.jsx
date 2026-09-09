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
  const [activePerson, setActivePerson] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

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

  const connectedPeople = useMemo(() => {
    const otherIds = connections.map((c) => (c.from === currentUser?.uid ? c.to : c.from));
    return people.filter((p) => otherIds.includes(p.id));
  }, [connections, people, currentUser]);

  useEffect(() => {
    if (!activePerson || !currentUser) return;
    const chatId = chatIdFor(currentUser.uid, activePerson.id);
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [activePerson, currentUser]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || !activePerson) return;
    const chatId = chatIdFor(currentUser.uid, activePerson.id);
    const body = text.trim();
    setText('');
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: currentUser.uid,
      text: body,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'chats', chatId), {
      participants: [currentUser.uid, activePerson.id].sort(),
      lastMessage: body,
      lastMessageAt: serverTimestamp(),
    }, { merge: true });
  }

  if (activePerson) {
    return (
      <div className="chat-thread">
        <div className="chat-thread-header">
          <button className="btn btn-ghost btn-sm" onClick={() => setActivePerson(null)}>← Back</button>
          <div className="avatar">
            {activePerson.photoURL ? <img src={activePerson.photoURL} alt="" /> : (activePerson.name?.[0] || '?')}
          </div>
          <div className="chat-thread-name">{activePerson.name}</div>
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
      {connectedPeople.length === 0 && (
        <div className="empty-state">Connect with people in Network to start chatting.</div>
      )}
      {connectedPeople.map((person) => (
        <div className="card person-row" key={person.id} onClick={() => setActivePerson(person)}>
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
