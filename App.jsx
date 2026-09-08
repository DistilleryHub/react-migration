import { Routes, Route, NavLink } from 'react-router-dom';

import Feed from './pages/Feed.jsx';
import Auth from './pages/Auth.jsx';
import Network from './pages/Network.jsx';
import Jobs from './pages/Jobs.jsx';
import Articles from './pages/Articles.jsx';
import Status from './pages/Status.jsx';
import Market from './pages/Market.jsx';
import Videos from './pages/Videos.jsx';
import FilesPage from './pages/FilesPage.jsx';
import Learning from './pages/Learning.jsx';
import Notifications from './pages/Notifications.jsx';
import Chat from './pages/Chat.jsx';
import Admin from './pages/Admin.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Feed', end: true },
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

export default function App() {
  return (
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
        </nav>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/auth" element={<Auth />} />
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
        </Routes>
      </main>
    </div>
  );
}
