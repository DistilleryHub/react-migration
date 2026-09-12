import { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { useLanguage } from './LanguageContext.jsx';
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
import Groups from './Groups.jsx';
import GroupDetail from './GroupDetail.jsx';

// Single nav bar used on every screen size — Feed, Chat, Status, Network,
// Notifications. Only 5 fit comfortably in a fixed bottom bar, the rest
// live behind "More". Built inside the component so labels can be translated.
function buildBottomNav(t) {
  return [
    { to: '/', label: t('nav.feed'), icon: '🏠', end: true },
    { to: '/chat', label: t('nav.chat'), icon: '💬' },
    { to: '/status', label: t('nav.status'), icon: '⭐' },
    { to: '/network', label: t('nav.network'), icon: '👥' },
    { to: '/notifications', label: t('nav.notifications'), icon: '🔔' },
  ];
}

function buildBottomMore(t) {
  return [
    { to: '/groups', label: t('nav.groups'), icon: '🧑‍🤝‍🧑' },
    { to: '/search', label: t('nav.search'), icon: '🔍' },
    { to: '/jobs', label: t('nav.jobs'), icon: '💼' },
    { to: '/articles', label: t('nav.articles'), icon: '📰' },
    { to: '/market', label: t('nav.market'), icon: '🛒' },
    { to: '/videos', label: t('nav.videos'), icon: '▶️' },
    { to: '/files', label: t('nav.files'), icon: '📁' },
    { to: '/learning', label: t('nav.learning'), icon: '🎓' },
    { to: '/settings', label: t('nav.settings'), icon: '⚙️' },
  ];
}

function RequireAuth({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  const { currentUser, currentProfile, authLoading, logout } = useAuth();
  const { t } = useLanguage();
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const navigate = useNavigate();
  const BOTTOM_NAV = buildBottomNav(t);
  const BOTTOM_MORE = buildBottomMore(t);

  if (authLoading) {
    return (
      <div className="auth-loading" style={{ display: 'flex' }}>
        <span className="spinner" style={{ marginRight: 8 }} /> {t('app.connecting')}
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
                {/* ---------- Top bar (same on web + mobile) ---------- */}
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
                    <Route path="/groups" element={<Groups />} />
                    <Route path="/groups/:groupId" element={<GroupDetail />} />
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

                {/* ---------- Bottom nav (same on web + mobile) ---------- */}
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
                    <span className="bottom-nav-label">{t('nav.more')}</span>
                  </button>
                </nav>

                {/* ---------- "More" sheet ---------- */}
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
                            <span className="bottom-sheet-label">{t('nav.admin')}</span>
                          </NavLink>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-block"
                        style={{ marginTop: 12 }}
                        onClick={() => { setShowMobileSheet(false); logout(); }}
                      >
                        {t('nav.signOut')}
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
