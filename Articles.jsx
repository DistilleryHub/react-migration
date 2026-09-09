import { useEffect, useState } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from './firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export default function Articles() {
  const { currentUser, currentProfile } = useAuth();
  const toast = useToast();
  const [articles, setArticles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cover, setCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [openArticle, setOpenArticle] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setArticles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  function handleCoverPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCover(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function handlePublish(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      let coverImageURL = '';
      if (cover) {
        const fd = new FormData();
        fd.append('file', cover);
        fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: fd }
        );
        const data = await res.json();
        if (!data.secure_url) throw new Error('Cover upload failed');
        coverImageURL = data.secure_url;
      }
      await addDoc(collection(db, 'articles'), {
        title: title.trim(),
        body: body.trim(),
        coverImageURL,
        authorId: currentUser.uid,
        authorName: currentProfile?.name || 'Member',
        authorPhotoURL: currentProfile?.photoURL || '',
        createdAt: serverTimestamp(),
      });
      setTitle(''); setBody(''); setCover(null); setCoverPreview(''); setShowForm(false);
      toast('Article published');
    } catch (err) {
      toast(err.message || 'Could not publish');
    }
    setSaving(false);
  }

  async function removeArticle(article) {
    if (article.authorId !== currentUser.uid) return;
    if (!confirm('Delete this article?')) return;
    await deleteDoc(doc(db, 'articles', article.id));
    if (openArticle?.id === article.id) setOpenArticle(null);
  }

  if (openArticle) {
    return (
      <div className="articles-page">
        <button className="btn btn-ghost btn-sm" onClick={() => setOpenArticle(null)}>← Back to articles</button>
        <div className="card article-full">
          {openArticle.coverImageURL && <img className="article-cover" src={openArticle.coverImageURL} alt="" />}
          <h2>{openArticle.title}</h2>
          <div className="article-byline">by {openArticle.authorName}</div>
          <p className="article-body">{openArticle.body}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="articles-page">
      <div className="card">
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Write an article'}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={handlePublish}>
          <div className="form-field">
            <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-field">
            <textarea placeholder="Write your article..." rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {coverPreview && <img className="composer-preview-img" src={coverPreview} alt="" />}
          <label className="btn btn-ghost btn-sm">
            Add cover image
            <input type="file" accept="image/*" hidden onChange={handleCoverPick} />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={saving} style={{ marginTop: 8 }}>
            {saving ? <span className="spinner" /> : 'Publish'}
          </button>
        </form>
      )}

      {articles.length === 0 && <div className="empty-state">No articles yet.</div>}

      {articles.map((article) => (
        <div className="card article-card" key={article.id} onClick={() => setOpenArticle(article)}>
          {article.coverImageURL && <img className="article-thumb" src={article.coverImageURL} alt="" />}
          <div className="article-card-body">
            <div className="article-title">{article.title}</div>
            <div className="article-byline">by {article.authorName}</div>
            <p className="article-excerpt">{article.body.slice(0, 140)}{article.body.length > 140 ? '…' : ''}</p>
            {article.authorId === currentUser.uid && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); removeArticle(article); }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
