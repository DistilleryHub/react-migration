import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection, query, where, orderBy, onSnapshot, doc, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';

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
  const { t } = useLanguage();
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
      <div className="notifications-header">
        <h2>{t('notifications.title')}</h2>
        {unreadCount > 0 && <span className="badge">{unreadCount} {t('notifications.new')}</span>}
      </div>

      {notifications.length === 0 && (
        <div className="empty-state">{t('notifications.empty')}</div>
      )}

      {notifications.length > 0 && (
        <div className="notifications-list">
          {notifications.map((n) => (
            <div
              className={'notification-row' + (n.read ? '' : ' unread')}
              key={n.id}
              onClick={() => markRead(n)}
            >
              <div className="notification-avatar">
                {n.fromUserPhoto ? (
                  <img src={n.fromUserPhoto} alt="" />
                ) : (
                  (n.fromUserName || n.message || '?')[0]?.toUpperCase()
                )}
              </div>
              <div className="notification-text">
                <div className="notification-message">{n.message}</div>
                <div className="post-time">{timeAgo(n.createdAt)}</div>
              </div>
              {n.link && (
                <Link to={n.link} className="btn btn-ghost btn-sm" onClick={(e) => e.stopPropagation()}>
                  {t('notifications.view')}
                </Link>
              )}
              {!n.read && <span className="notification-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
