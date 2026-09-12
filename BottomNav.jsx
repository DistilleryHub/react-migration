import { NavLink } from 'react-router-dom';
import { IconPlaySquare, IconStar, IconHome, IconUsers, IconMessage, IconMenu } from './Icons';

/**
 * Fixed bottom navigation — exact left-to-right order requested:
 * Videos, Status, Feed (primary/highlighted), Network, Chat, Menu.
 * (Notification bell lives in the TopBar only — no need to repeat it here.)
 *
 * Props:
 *  - onMenuClick: () => void, opens the "Menu" bottom sheet (Groups, Jobs,
 *    Settings, etc. — everything that doesn't fit as its own tab)
 */
export default function BottomNav({ onMenuClick, labels = {} }) {
  const L = {
    videos: 'Videos',
    status: 'Status',
    feed: 'Feed',
    network: 'Network',
    chat: 'Chat',
    menu: 'Menu',
    ...labels,
  };

  const tabBase =
    'flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[10.5px] font-medium ' +
    'text-slate-400 transition active:scale-90 active:opacity-70';
  const tabActive = 'text-brand';

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-slate-800
                 bg-navy-card/95 backdrop-blur pb-safe"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
    >
      <NavLink to="/videos" className={({ isActive }) => tabBase + (isActive ? ' ' + tabActive : '')}>
        <IconPlaySquare className="w-6 h-6" />
        {L.videos}
      </NavLink>

      <NavLink to="/status" className={({ isActive }) => tabBase + (isActive ? ' ' + tabActive : '')}>
        <IconStar className="w-6 h-6" />
        {L.status}
      </NavLink>

      <NavLink to="/" end className={({ isActive }) => 'flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[10.5px] font-medium text-slate-400 transition active:scale-90 active:opacity-70'}>
        {({ isActive }) => (
          <>
            <span
              className={
                'flex items-center justify-center w-14 h-14 rounded-full -mt-6 border-4 border-white shadow-lg transition ' +
                (isActive ? 'bg-brand text-white' : 'bg-brand text-white')
              }
            >
              <IconHome className="w-6 h-6" />
            </span>
            <span className={isActive ? 'text-brand' : 'text-slate-400'}>{L.feed}</span>
          </>
        )}
      </NavLink>

      <NavLink to="/network" className={({ isActive }) => tabBase + (isActive ? ' ' + tabActive : '')}>
        <IconUsers className="w-6 h-6" />
        {L.network}
      </NavLink>

      <NavLink to="/chat" className={({ isActive }) => tabBase + (isActive ? ' ' + tabActive : '')}>
        <IconMessage className="w-6 h-6" />
        {L.chat}
      </NavLink>

      <button type="button" onClick={onMenuClick} className={tabBase}>
        <IconMenu className="w-6 h-6" />
        {L.menu}
      </button>
    </nav>
  );
}
