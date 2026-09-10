import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { getAuth, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useNavigate } from 'react-router-dom';

const DEFAULT_SETTINGS = {
  // Privacy & Visibility
  profileVisibility: 'connections', // public | connections | private
  whoCanMessage: 'connections',     // everyone | connections
  whoCanViewStatus: 'connections',  // everyone | connections
  showOnlineStatus: true,
  // Chat & Call Preferences
  readReceipts: true,
  lastSeen: true,
  messagePreview: true,
  defaultCallType: 'video', // audio | video
  // Jobs & Market Alerts
  openToWork: false,
  preferredLocations: '',
  expectedCTC: '',
  jobAlerts: true,
  marketLeadAlerts: true,
  // Content & Downloads
  autoDownloadFiles: false,
  videoAutoplay: true,
  videoQuality: 'auto', // auto | high | data-saver
  // Notifications
  notifyChatMessages: true,
  notifyJobAlerts: true,
  notifyMarketLeads: true,
  notifyAdminAnnouncements: true,
  notifyPush: true,
  notifyEmail: false,
};

const TABS = [
  { id: 'account', label: 'Account & Security', icon: '👤' },
  { id: 'privacy', label: 'Privacy & Visibility', icon: '🔒' },
  { id: 'chatcall', label: 'Chat & Call Preferences', icon: '💬' },
  { id: 'jobsmarket', label: 'Jobs & Market Alerts', icon: '💼' },
  { id: 'content', label: 'Content & Downloads', icon: '📁' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
];

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="settings-toggle-row">
      <span className="settings-toggle-text">
        <span className="settings-toggle-label">{label}</span>
        {hint && <span className="settings-toggle-hint">{hint}</span>}
      </span>
      <input
        type="checkbox"
        className="settings-toggle-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="settings-select-row">
      <span className="settings-toggle-label">{label}</span>
      <select className="settings-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

export default function Settings() {
  const { currentUser, currentProfile, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('account');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [profileForm, setProfileForm] = useState({
    name: '', bio: '', designation: '', company: '', qualifications: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      const data = snap.exists() ? snap.data() : {};
      setSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) });
      setProfileForm({
        name: data.name || '',
        bio: data.bio || '',
        designation: data.designation || '',
        company: data.company || '',
        qualifications: data.qualifications || '',
      });
    });
    return unsub;
  }, [currentUser]);

  async function saveSettings(patch) {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      await setDoc(doc(db, 'users', currentUser.uid), { settings: next }, { merge: true });
    } catch (err) {
      toast('Could not save setting. Try again.');
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { ...profileForm });
      toast('Profile updated');
    } catch (err) {
      toast('Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    try {
      await sendPasswordResetEmail(getAuth(), currentUser.email);
      toast('Password reset email sent');
    } catch (err) {
      toast('Could not send reset email.');
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('This will permanently delete your account. Continue?')) return;
    try {
      await deleteUser(getAuth().currentUser);
      toast('Account deleted');
      navigate('/auth');
    } catch (err) {
      toast('Could not delete account. You may need to sign in again first.');
    }
  }

  function clearLocalCache() {
    try {
      // Clears anything the app has cached locally, keeps Firebase auth (IndexedDB) intact.
      Object.keys(window.localStorage)
        .filter((k) => !k.startsWith('firebase:'))
        .forEach((k) => window.localStorage.removeItem(k));
      toast('Local cache cleared');
    } catch (err) {
      toast('Could not clear cache.');
    }
  }

  return (
    <div className="settings-page">
      <h1 className="settings-title">Settings</h1>

      <div className="settings-layout">
        <nav className="settings-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={'settings-tab' + (activeTab === tab.id ? ' active' : '')}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="settings-tab-icon">{tab.icon}</span>
              <span className="settings-tab-label">{tab.label}</span>
            </button>
          ))}
          {currentProfile?.isAdmin && (
            <button
              type="button"
              className={'settings-tab' + (activeTab === 'admin' ? ' active' : '')}
              onClick={() => setActiveTab('admin')}
            >
              <span className="settings-tab-icon">🛡️</span>
              <span className="settings-tab-label">Admin Access</span>
            </button>
          )}
        </nav>

        <div className="settings-panel">
          {activeTab === 'account' && (
            <section className="settings-section">
              <h2>Account & Professional Identity</h2>
              <form onSubmit={saveProfile} className="settings-form">
                <label className="settings-field">
                  <span>Name</span>
                  <input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </label>
                <label className="settings-field">
                  <span>Bio</span>
                  <textarea
                    rows={3}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                  />
                </label>
                <label className="settings-field">
                  <span>Designation</span>
                  <input
                    value={profileForm.designation}
                    onChange={(e) => setProfileForm((f) => ({ ...f, designation: e.target.value }))}
                  />
                </label>
                <label className="settings-field">
                  <span>Plant / Company</span>
                  <input
                    value={profileForm.company}
                    onChange={(e) => setProfileForm((f) => ({ ...f, company: e.target.value }))}
                  />
                </label>
                <label className="settings-field">
                  <span>Qualifications</span>
                  <input
                    value={profileForm.qualifications}
                    onChange={(e) => setProfileForm((f) => ({ ...f, qualifications: e.target.value }))}
                  />
                </label>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
              </form>

              <h3 className="settings-subheading">Contact & Security</h3>
              <p className="settings-static-field"><strong>Email:</strong> {currentUser?.email}</p>
              <button className="btn btn-secondary" onClick={handlePasswordReset}>
                Change password
              </button>

              <h3 className="settings-subheading danger-zone-heading">Danger zone</h3>
              <div className="danger-zone">
                <button className="btn btn-ghost btn-block" onClick={logout}>Sign out</button>
                <button className="btn btn-danger btn-block" onClick={handleDeleteAccount}>
                  Delete account
                </button>
              </div>
            </section>
          )}

          {activeTab === 'privacy' && (
            <section className="settings-section">
              <h2>Privacy & Network Controls</h2>
              <Select
                label="Who can see my profile"
                value={settings.profileVisibility}
                onChange={(v) => saveSettings({ profileVisibility: v })}
                options={[
                  { value: 'public', label: 'Everyone' },
                  { value: 'connections', label: 'Connections only' },
                  { value: 'private', label: 'Only me' },
                ]}
              />
              <Select
                label="Who can message me"
                value={settings.whoCanMessage}
                onChange={(v) => saveSettings({ whoCanMessage: v })}
                options={[
                  { value: 'everyone', label: 'Everyone' },
                  { value: 'connections', label: 'Connections only' },
                ]}
              />
              <Select
                label="Who can view my Status"
                value={settings.whoCanViewStatus}
                onChange={(v) => saveSettings({ whoCanViewStatus: v })}
                options={[
                  { value: 'everyone', label: 'Everyone' },
                  { value: 'connections', label: 'Connections only' },
                ]}
              />
              <Toggle
                label="Show online status"
                checked={settings.showOnlineStatus}
                onChange={(v) => saveSettings({ showOnlineStatus: v })}
              />
            </section>
          )}

          {activeTab === 'chatcall' && (
            <section className="settings-section">
              <h2>Chat & Call Preferences</h2>
              <Toggle
                label="Read receipts"
                hint="Others see when you've read their messages"
                checked={settings.readReceipts}
                onChange={(v) => saveSettings({ readReceipts: v })}
              />
              <Toggle
                label="Last seen"
                checked={settings.lastSeen}
                onChange={(v) => saveSettings({ lastSeen: v })}
              />
              <Toggle
                label="Message preview in notifications"
                checked={settings.messagePreview}
                onChange={(v) => saveSettings({ messagePreview: v })}
              />
              <Select
                label="Default call type"
                value={settings.defaultCallType}
                onChange={(v) => saveSettings({ defaultCallType: v })}
                options={[
                  { value: 'audio', label: 'Audio' },
                  { value: 'video', label: 'Video' },
                ]}
              />
            </section>
          )}

          {activeTab === 'jobsmarket' && (
            <section className="settings-section">
              <h2>Jobs & Marketplace</h2>
              <Toggle
                label="Open to work"
                checked={settings.openToWork}
                onChange={(v) => saveSettings({ openToWork: v })}
              />
              <label className="settings-field">
                <span>Preferred locations</span>
                <input
                  value={settings.preferredLocations}
                  onChange={(e) => saveSettings({ preferredLocations: e.target.value })}
                />
              </label>
              <label className="settings-field">
                <span>Expected CTC</span>
                <input
                  value={settings.expectedCTC}
                  onChange={(e) => saveSettings({ expectedCTC: e.target.value })}
                />
              </label>
              <Toggle
                label="Job alerts"
                checked={settings.jobAlerts}
                onChange={(v) => saveSettings({ jobAlerts: v })}
              />
              <Toggle
                label="Marketplace lead notifications"
                checked={settings.marketLeadAlerts}
                onChange={(v) => saveSettings({ marketLeadAlerts: v })}
              />
            </section>
          )}

          {activeTab === 'content' && (
            <section className="settings-section">
              <h2>Content & Downloads</h2>
              <Toggle
                label="Auto-download shared files"
                checked={settings.autoDownloadFiles}
                onChange={(v) => saveSettings({ autoDownloadFiles: v })}
              />
              <Toggle
                label="Auto-play videos"
                checked={settings.videoAutoplay}
                onChange={(v) => saveSettings({ videoAutoplay: v })}
              />
              <Select
                label="Video playback quality"
                value={settings.videoQuality}
                onChange={(v) => saveSettings({ videoQuality: v })}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'high', label: 'High' },
                  { value: 'data-saver', label: 'Data saver' },
                ]}
              />
              <button className="btn btn-secondary" onClick={clearLocalCache}>
                Clear local cache
              </button>
            </section>
          )}

          {activeTab === 'notifications' && (
            <section className="settings-section">
              <h2>Notifications</h2>
              <Toggle
                label="Chat messages"
                checked={settings.notifyChatMessages}
                onChange={(v) => saveSettings({ notifyChatMessages: v })}
              />
              <Toggle
                label="Job alerts"
                checked={settings.notifyJobAlerts}
                onChange={(v) => saveSettings({ notifyJobAlerts: v })}
              />
              <Toggle
                label="Marketplace leads"
                checked={settings.notifyMarketLeads}
                onChange={(v) => saveSettings({ notifyMarketLeads: v })}
              />
              <Toggle
                label="Admin announcements"
                checked={settings.notifyAdminAnnouncements}
                onChange={(v) => saveSettings({ notifyAdminAnnouncements: v })}
              />
              <Toggle
                label="Push notifications"
                checked={settings.notifyPush}
                onChange={(v) => saveSettings({ notifyPush: v })}
              />
              <Toggle
                label="Email notifications"
                checked={settings.notifyEmail}
                onChange={(v) => saveSettings({ notifyEmail: v })}
              />
            </section>
          )}

          {activeTab === 'admin' && currentProfile?.isAdmin && (
            <section className="settings-section">
              <h2>Admin Access</h2>
              <p>You have admin privileges on DistilleryHub.</p>
              <button className="btn btn-primary" onClick={() => navigate('/admin')}>
                Open Admin Portal
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
      }
