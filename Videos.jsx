import { useEffect, useState } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

function getYouTubeId(url) {
  const m = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return m ? m[1] : null;
}

export default function Videos() {
  const { currentUser, currentProfile } = useAuth();
  const toast = useToast();
  const [videos, setVideos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', videoURL: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setVideos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.videoURL.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'videos'), {
        ...form,
        authorId: currentUser.uid,
        authorName: currentProfile?.name || 'Member',
        createdAt: serverTimestamp(),
      });
      setForm({ title: '', videoURL: '', description: '' });
      setShowForm(false);
      toast('Video shared');
    } catch (err) {
      toast(err.message || 'Could not share video');
    }
    setSaving(false);
  }

  async function removeVideo(video) {
    if (video.authorId !== currentUser.uid) return;
    if (!confirm('Delete this video?')) return;
    await deleteDoc(doc(db, 'videos', video.id));
  }

  return (
    <div className="videos-page">
      <div className="card">
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Share a video'}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={handleSubmit}>
          <div className="form-field">
            <input type="text" placeholder="Title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-field">
            <input type="text" placeholder="YouTube/Vimeo link or direct video URL" value={form.videoURL}
              onChange={(e) => setForm({ ...form, videoURL: e.target.value })} />
          </div>
          <div className="form-field">
            <textarea placeholder="Description" rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? <span className="spinner" /> : 'Share'}
          </button>
        </form>
      )}

      {videos.length === 0 && <div className="empty-state">No videos yet.</div>}

      {videos.map((video) => {
        const ytId = getYouTubeId(video.videoURL);
        return (
          <div className="card video-card" key={video.id}>
            <div className="video-embed">
              {ytId ? (
                <iframe src={`https://www.youtube.com/embed/${ytId}`} title={video.title} allowFullScreen />
              ) : (
                <video src={video.videoURL} controls />
              )}
            </div>
            <div className="video-title">{video.title}</div>
            <div className="job-meta">by {video.authorName}</div>
            {video.description && <p className="job-description">{video.description}</p>}
            {video.authorId === currentUser.uid && (
              <button className="btn btn-ghost btn-sm" onClick={() => removeVideo(video)}>Delete</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
