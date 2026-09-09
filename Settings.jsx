import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const ACCENT_OPTIONS = [
  { name: 'Blue', value: '#4f7fff' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Teal', value: '#14b8a6' },
];

function applyAccent(color) {
  document.documentElement.style.setProperty('--primary', color);
  const hoverMap = {
    '#4f7fff': '#3d6bef', '#8b5cf6': '#7c3aed', '#22c55e': '#16a34a',
    '#f59e0b': '#d97706', '#f43f5e': '#e11d48', '#14b8a6': '#0d9488',
  };
  document.documentElement.style.setProperty('--primary-hover', hoverMap[color] || color);
  document.documentElement.style.setProperty('--primary-soft', color + '1f');
}

function applyCompact(compact) {
  document.documentElement.style.setProperty('--radius', compact ? '10px' : '14px');
  document.documentElement.classList.toggle('compact-mode', compact);
}

export default function Settings() {
  const { currentUser, currentProfile } = useAuth();
  const toast = useToast();
  const [accent, setAccent] = useState(localStorage.getItem('dh-accent') || '#4f7fff');
  const [compact, setCompact] = useState(localStorage.getItem('dh-compact') === '1');
  const [emailNotifs, setEmailNotifs] = useState(currentProfile?.emailNotifs !== false);

  useEffect(() => { applyAccent(accent); }, [accent]);
  useEffect(() => { applyCompact(compact); }, [compact]);

  function pickAccent(color) {
    setAccent(color);
    localStorage.setItem('dh-accent', color);
    toast('Accent color updated');
  }

  function toggleCompact() {
    const next = !compact;
    setCompact(next);
    localStorage.setItem('dh-compact', next ? '1' : '0');
  }

  async function toggleEmailNotifs() {
    const next = !emailNotifs;
    setEmailNotifs(next);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { emailNotifs: next });
      toast(next ? 'Email notifications on' : 'Email notifications off');
    } catch {
      toast('Could not update — try again');
      setEmailNotifs(!next);
    }
  }

  function resetToDefault() {
    setAccent('#4f7fff');
    setCompact(false);
    localStorage.removeItem('dh-accent');
    localStorage.removeItem('dh-compact');
    applyAccent('#4f7fff');
    applyCompact(false);
    toast('Reset to default');
  }

  return (
    <div className="settings-page">
      <h2>Settings</h2>

      <div className="card">
        <h3>Appearance</h3>
        <div className="settings-row">
          <div>
            <div className="settings-label">Accent color</div>
            <div className="settings-sub">Choose a color that shows up across buttons and links</div>
          </div>
        </div>
        <div className="accent-swatches">
          {ACCENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={'accent-swatch' + (accent === opt.value ? ' selected' : '')}
              style={{ background: opt.value }}
              onClick={() => pickAccent(opt.value)}
              title={opt.name}
            >
              {accent === opt.value && '✓'}
            </button>
          ))}
        </div>

        <div className="settings-row" style={{ marginTop: 18 }}>
          <div>
            <div className="settings-label">Compact mode</div>
            <div className="settings-sub">Tighter spacing and smaller corners</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={compact} onChange={toggleCompact} />
            <span className="switch-track"><span className="switch-thumb" /></span>
          </label>
        </div>
      </div>

      <div className="card">
        <h3>Notifications</h3>
        <div className="settings-row">
          <div>
            <div className="settings-label">Email notifications</div>
            <div className="settings-sub">Get emailed about connection requests and messages</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={emailNotifs} onChange={toggleEmailNotifs} />
            <span className="switch-track"><span className="switch-thumb" /></span>
          </label>
        </div>
      </div>

      <div className="card">
        <h3>Account</h3>
        <div className="settings-row">
          <div>
            <div className="settings-label">Signed in as</div>
            <div className="settings-sub">{currentUser?.email}</div>
          </div>
        </div>
      </div>

      <button className="btn btn-ghost btn-sm" onClick={resetToDefault}>Reset appearance to default</button>
    </div>
  );
}
