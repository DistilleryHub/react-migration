import { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { CallProvider } from './CallContext.jsx';
import CallScreen from './CallScreen.jsx';
import Feed from './Feed.jsx';
import Auth from './Auth.jsx';
import Network from './Network.jsx';
import Jobs from './Jobs.jsx';
import Articles from './Articles.jsx';
import Status from './Status.jsx';
import Market from './Market.jsx';
import Videos from './Videos.jsx';
import FilesPage from './FilesPage.jsx';
import Learning from './Learning.jsx';
import Notifications from './Notifications.jsx';
import Chat from './Chat.jsx';
import Admin from './Admin.jsx';
import Profile from './Profile.jsx';
import Search from './Search.jsx';
import Settings from './Settings.jsx';

const PRIMARY_NAV = [
  { to: '/', label: 'Feed', icon: '🏠', end: true },
  { to: '/search', label: 'Search', icon: '🔍' },
  { to: '/network', label: 'Network', icon: '👥' },
  { to: '/jobs', label: 'Jobs', icon: '💼' },
  { to: '/chat', label: 'Chat', icon: '💬' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
];

const MORE_NAV = [
  { to: '/articles', label: 'Articles', icon: '📰' },
  { to: '/status', label: 'Status', icon: '⭐' },
  { to: '/market', label: 'Marketplace', icon: '🛒' },
  { to: '/videos', label: 'Videos', icon: '▶️' },
  { to: '/files', label: 'Files', icon: '📁' },
  { to: '/learning', label: 'Learning', icon: '🎓' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

function RequireAuth({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  const { currentUser, currentProfile, authLoading, logout } = useAuth();
  const [showMore, setShowMore] = useState(false);

  if (authLoading) {
    return (
      <div className="auth-loading" style={{ display: 'flex' }}>
        <span className="spinner" style={{ marginRight: 8 }} /> Connecting to DistilleryHub…
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={currentUser ? <Navigate to="/" replace /> : <Auth />}
      />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <CallProvider>
              <div className="app-shell">
                <aside className="sidebar">
                  <div className="sidebar-brand">
                    <span className="sidebar-brand-icon">🥃</span> DistilleryHub
                  </div>
                  <nav>
                    {PRIMARY_NAV.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
                      >
                        <span className="sidebar-link-icon">{item.icon}</span>
                        <span className="sidebar-link-text">{item.label}</span>
                      </NavLink>
                    ))}

                    <button
                      type="button"
                      className={'sidebar-link sidebar-more-toggle' + (showMore ? ' active' : '')}
                      onClick={() => setShowMore((v) => !v)}
                    >
                      <span className="sidebar-link-icon">{showMore ? '✕' : '⋯'}</span>
                      <span className="sidebar-link-text">{showMore ? 'Close' : 'More'}</span>
                    </button>

                    {showMore && MORE_NAV.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setShowMore(false)}
                        className={({ isActive }) => 'sidebar-link sidebar-sublink' + (isActive ? ' active' : '')}
                      >
                        <span className="sidebar-link-icon">{item.icon}</span>
                        <span className="sidebar-link-text">{item.label}</span>
                      </NavLink>
                    ))}

                    {currentProfile?.isAdmin && (
                      <NavLink to="/admin" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                        <span className="sidebar-link-icon">🛡️</span>
                        <span className="sidebar-link-text">Admin</span>
                      </NavLink>
                    )}
                  </nav>
                  <div className="sidebar-footer">
                    <NavLink to={`/profile/${currentUser?.uid}`} className="sidebar-user" style={{ textDecoration: 'none' }}>
                      {currentProfile?.photoURL ? (
                        <img className="sidebar-user-avatar" src={currentProfile.photoURL} alt="" />
                      ) : (
                        <span className="sidebar-user-avatar sidebar-user-avatar-fallback">
                          {currentProfile?.name?.[0] || '?'}
                        </span>
                      )}
                      <span>{currentProfile?.name || 'Member'}</span>
                    </NavLink>
                    <button className="btn btn-ghost btn-sm btn-block" onClick={logout}>
                      Sign out
                    </button>
                  </div>
                </aside>
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<Feed />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/network" element={<Network />} />
                    <Route path="/jobs" element={<Jobs />} />
                    <Route path="/articles" element={<Articles />} />
                    <Route path="/status" element={<Status />} />
                    <Route path="/market" element={<Market />} />
                    <Route path="/videos" element={<Videos />} />
                    <Route path="/files" element={<FilesPage />} />
                    <Route path="/learning" element={<Learning />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/profile/:uid" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </main>
              </div>
              <CallScreen />
            </CallProvider>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
