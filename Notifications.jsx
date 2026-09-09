import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection, query, where, orderBy, onSnapshot, doc, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

function timeAgo(ts) {
  if (!ts?.toDate) return '';
  const diff = Date.now() - ts.toDate().getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Notifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [currentUser]);

  async function markRead(n) {
    if (n.read) return;
    await updateDoc(doc(db, 'notifications', n.id), { read: true });
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notifications-page">
      <div className="card notifications-header">
        <h2>Notifications</h2>
        {unreadCount > 0 && <span className="badge">{unreadCount} new</span>}
      </div>

      {notifications.length === 0 && (
        <div className="empty-state">No notifications yet.</div>
      )}

      {notifications.map((n) => (
        <div
          className={'card notification-row' + (n.read ? '' : ' unread')}
          key={n.id}
          onClick={() => markRead(n)}
        >
          <div className="notification-text">
            <div>{n.message}</div>
            <div className="post-time">{timeAgo(n.createdAt)}</div>
          </div>
          {n.link && (
            <Link to={n.link} className="btn btn-ghost btn-sm" onClick={(e) => e.stopPropagation()}>
              View
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
