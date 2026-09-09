import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  collection, query, where, orderBy, onSnapshot, doc, updateDoc,
  addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export default function Profile() {
  const { uid } = useParams();
  const { currentUser, currentProfile } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [connections, setConnections] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const isOwn = uid === currentUser?.uid;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) setProfile({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), where('authorId', '==', uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!currentUser || isOwn) return;
    const qFrom = query(collection(db, 'connections'), where('from', '==', currentUser.uid));
    const qTo = query(collection(db, 'connections'), where('to', '==', currentUser.uid));
    let fromDocs = [], toDocs = [];
    const merge = () => setConnections([...fromDocs, ...toDocs]);
    const unsub1 = onSnapshot(qFrom, (snap) => { fromDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() })); merge(); });
    const unsub2 = onSnapshot(qTo, (snap) => { toDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() })); merge(); });
    return () => { unsub1(); unsub2(); };
  }, [currentUser, isOwn]);

  const conn = connections.find((c) => c.from === uid || c.to === uid);

  async function sendRequest() {
    await addDoc(collection(db, 'connections'), {
      from: currentUser.uid, to: uid, status: 'pending', createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'notifications'), {
      toUserId: uid,
      message: `${currentProfile?.name || 'Someone'} sent you a connection request`,
      read: false,
      createdAt: serverTimestamp(),
    });
    toast('Request sent');
  }

  async function acceptRequest() {
    await updateDoc(doc(db, 'connections', conn.id), { status: 'accepted' });
  }

  function startEdit() {
    setForm({
      name: profile.name || '',
      headline: profile.headline || '',
      company: profile.company || '',
      location: profile.location || '',
      bio: profile.bio || '',
    });
    setEditing(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    await updateDoc(doc(db, 'users', uid), { ...form });
    setEditing(false);
    toast('Profile updated');
  }

  if (!profile) return <div className="empty-state">Loading…</div>;

  return (
    <div className="profile-page">
      <div className="card profile-header">
        <div className="avatar avatar-xl">
          {profile.photoURL ? <img src={profile.photoURL} alt="" /> : (profile.name?.[0] || '?')}
        </div>
        {!editing ? (
          <>
            <h2>{profile.name}</h2>
            {profile.headline && <div className="job-meta">{profile.headline}</div>}
            {profile.company && <div className="job-meta">{profile.company}{profile.location ? ` • ${profile.location}` : ''}</div>}
            {profile.bio && <p className="job-description">{profile.bio}</p>}
            <div className="job-actions" style={{ marginTop: 10 }}>
              {isOwn && (
                <button className="btn btn-ghost btn-sm" onClick={startEdit}>Edit profile</button>
              )}
              {!isOwn && !conn && (
                <button className="btn btn-primary btn-sm" onClick={sendRequest}>Connect</button>
              )}
              {!isOwn && conn?.status === 'pending' && conn.to === currentUser.uid && (
                <button className="btn btn-primary btn-sm" onClick={acceptRequest}>Accept request</button>
              )}
              {!isOwn && conn?.status === 'pending' && conn.from === currentUser.uid && (
                <button className="btn btn-ghost btn-sm" disabled>Pending</button>
              )}
              {!isOwn && conn?.status === 'accepted' && (
                <Link className="btn btn-primary btn-sm" to="/chat">Message</Link>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={saveEdit}>
            <div className="form-field">
              <input type="text" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-field">
              <input type="text" placeholder="Headline" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
            </div>
            <div className="form-field">
              <input type="text" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="form-field">
              <input type="text" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="form-field">
              <textarea placeholder="Bio" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            <div className="job-actions">
              <button type="submit" className="btn btn-primary btn-sm">Save</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      <h3>Posts</h3>
      {posts.length === 0 && <div className="empty-state">No posts yet.</div>}
      {posts.map((post) => (
        <div className="card post" key={post.id}>
          {post.text && <p className="post-text">{post.text}</p>}
          {post.imageURL && <img className="post-image" src={post.imageURL} alt="" />}
        </div>
      ))}
    </div>
  );
}
