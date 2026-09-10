import { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
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

// Full desktop sidebar (unchanged behaviour, still used on wide screens)
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

// Mobile bottom nav — Feed, Chat, Status, Network, Notifications.
// Only 5 fit comfortably in a fixed bar, the rest live behind "More".
const BOTTOM_NAV = [
  { to: '/', label: 'Feed', icon: '🏠', end: true },
  { to: '/chat', label: 'Chat', icon: '💬' },
  { to: '/status', label: 'Status', icon: '⭐' },
  { to: '/network', label: 'Network', icon: '👥' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
];

const BOTTOM_MORE = [
  { to: '/search', label: 'Search', icon: '🔍' },
  { to: '/jobs', label: 'Jobs', icon: '💼' },
  { to: '/articles', label: 'Articles', icon: '📰' },
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
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const navigate = useNavigate();

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
                {/* ---------- Desktop sidebar (hidden on mobile via CSS) ---------- */}
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

                {/* ---------- Mobile top bar (hidden on desktop via CSS) ---------- */}
                <header className="mobile-topbar">
                  <span className="mobile-topbar-brand">🥃 DistilleryHub</span>
                  <button
                    type="button"
                    className="mobile-topbar-avatar-btn"
                    onClick={() => navigate(`/profile/${currentUser?.uid}`)}
                  >
                    {currentProfile?.photoURL ? (
                      <img className="mobile-topbar-avatar" src={currentProfile.photoURL} alt="" />
                    ) : (
                      <span className="mobile-topbar-avatar mobile-topbar-avatar-fallback">
                        {currentProfile?.name?.[0] || '?'}
                      </span>
                    )}
                  </button>
                </header>

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

                {/* ---------- Mobile bottom nav (hidden on desktop via CSS) ---------- */}
                <nav className="bottom-nav">
                  {BOTTOM_NAV.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => 'bottom-nav-link' + (isActive ? ' active' : '')}
                    >
                      <span className="bottom-nav-icon">{item.icon}</span>
                      <span className="bottom-nav-label">{item.label}</span>
                    </NavLink>
                  ))}
                  <button
                    type="button"
                    className={'bottom-nav-link bottom-nav-more' + (showMobileSheet ? ' active' : '')}
                    onClick={() => setShowMobileSheet((v) => !v)}
                  >
                    <span className="bottom-nav-icon">{showMobileSheet ? '✕' : '⋯'}</span>
                    <span className="bottom-nav-label">More</span>
                  </button>
                </nav>

                {/* ---------- Mobile "More" sheet ---------- */}
                {showMobileSheet && (
                  <>
                    <div className="bottom-sheet-backdrop" onClick={() => setShowMobileSheet(false)} />
                    <div className="bottom-sheet">
                      <div className="bottom-sheet-grid">
                        {BOTTOM_MORE.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setShowMobileSheet(false)}
                            className="bottom-sheet-item"
                          >
                            <span className="bottom-sheet-icon">{item.icon}</span>
                            <span className="bottom-sheet-label">{item.label}</span>
                          </NavLink>
                        ))}
                        {currentProfile?.isAdmin && (
                          <NavLink
                            to="/admin"
                            onClick={() => setShowMobileSheet(false)}
                            className="bottom-sheet-item"
                          >
                            <span className="bottom-sheet-icon">🛡️</span>
                            <span className="bottom-sheet-label">Admin</span>
                          </NavLink>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-block"
                        style={{ marginTop: 12 }}
                        onClick={() => { setShowMobileSheet(false); logout(); }}
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
              <CallScreen />
            </CallProvider>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
