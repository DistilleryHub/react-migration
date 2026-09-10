import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export default function Admin() {
  const { currentProfile } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  async function toggleDisabled(user) {
    await updateDoc(doc(db, 'users', user.id), { disabled: !user.disabled });
    toast(user.disabled ? `${user.name} unblocked` : `${user.name} blocked`);
  }

  async function toggleVerified(user) {
    await updateDoc(doc(db, 'users', user.id), { isVerified: !user.isVerified });
    toast(user.isVerified ? `${user.name} unverified` : `${user.name} verified`);
  }

  async function resolveReport(report) {
    await updateDoc(doc(db, 'reports', report.id), { status: 'resolved' });
  }

  if (!currentProfile?.isAdmin) {
    return <div className="empty-state">You don't have access to this page.</div>;
  }

  const visibleUsers = users.filter((u) => !search.trim() || u.name?.toLowerCase().includes(search.toLowerCase()));
  const openReports = reports.filter((r) => r.status !== 'resolved');

  return (
    <div className="admin-page">
      <h2>Admin</h2>

      <div className="card">
        <h3>Open reports ({openReports.length})</h3>
        {openReports.length === 0 && <div className="empty-state">No open reports.</div>}
        {openReports.map((r) => (
          <div className="person-row" key={r.id}>
            <div className="person-info">
              <div className="person-name">{r.targetType}: {r.targetId}</div>
              <div className="person-headline">{r.reason}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => resolveReport(r)}>Resolve</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Users</h3>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {visibleUsers.map((user) => (
        <div className="card person-row" key={user.id}>
          <div className="avatar">
            {user.photoURL ? <img src={user.photoURL} alt="" /> : (user.name?.[0] || '?')}
          </div>
          <div className="person-info">
            <div className="person-name">
              {user.name}
              {user.isAdmin && <span className="badge">ADMIN</span>}
              {user.isVerified && <span className="verified-badge" title="Verified professional">✔️</span>}
            </div>
            <div className="person-headline">{user.headline}</div>
          </div>
          <div className="admin-user-actions">
            <button
              className={'btn btn-sm ' + (user.isVerified ? 'btn-primary' : 'btn-ghost')}
              onClick={() => toggleVerified(user)}
            >
              {user.isVerified ? 'Unverify' : 'Verify'}
            </button>
            <button
              className={'btn btn-sm ' + (user.disabled ? 'btn-primary' : 'btn-ghost')}
              onClick={() => toggleDisabled(user)}
            >
              {user.disabled ? 'Unblock' : 'Block'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
