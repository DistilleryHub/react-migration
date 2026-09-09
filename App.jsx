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

const NAV_ITEMS = [
  { to: '/', label: 'Feed', end: true },
  { to: '/search', label: 'Search' },
  { to: '/network', label: 'Network' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/articles', label: 'Articles' },
  { to: '/status', label: 'Status' },
  { to: '/market', label: 'Marketplace' },
  { to: '/videos', label: 'Videos' },
  { to: '/files', label: 'Files' },
  { to: '/learning', label: 'Learning' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/chat', label: 'Chat' },
];

function RequireAuth({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  const { currentUser, currentProfile, authLoading, logout } = useAuth();

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
                  <div className="sidebar-brand">DistilleryHub</div>
                  <nav>
                    {NAV_ITEMS.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                    {currentProfile?.isAdmin && (
                      <NavLink to="/admin" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                        Admin
                      </NavLink>
                    )}
                  </nav>
                  <div className="sidebar-footer">
                    <NavLink to={`/profile/${currentUser?.uid}`} className="sidebar-user" style={{ textDecoration: 'none' }}>
                      {currentProfile?.name || 'Member'}
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
