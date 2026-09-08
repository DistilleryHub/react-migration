import { useEffect, useState } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc,
  updateDoc, arrayUnion, arrayRemove, serverTimestamp,
} from 'firebase/firestore';
import { db, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from './firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

function timeAgo(ts) {
  if (!ts?.toDate) return '';
  const diff = Date.now() - ts.toDate().getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return ts.toDate().toLocaleDateString();
}

export default function Feed() {
  const { currentUser, currentProfile } = useAuth();
  const toast = useToast();
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handlePost(e) {
    e.preventDefault();
    if (!text.trim() && !image) return;
    setPosting(true);
    try {
      let imageURL = '';
      if (image) {
        const form = new FormData();
        form.append('file', image);
        form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: form }
        );
        const data = await res.json();
        if (!data.secure_url) throw new Error('Image upload failed');
        imageURL = data.secure_url;
      }
      await addDoc(collection(db, 'posts'), {
        authorId: currentUser.uid,
        authorName: currentProfile?.name || 'Member',
        authorHeadline: currentProfile?.headline || '',
        authorPhotoURL: currentProfile?.photoURL || '',
        text: text.trim(),
        imageURL,
        likes: [],
        createdAt: serverTimestamp(),
      });
      setText(''); setImage(null); setPreview('');
      toast('Posted');
    } catch (err) {
      toast(err.message || 'Could not post');
    }
    setPosting(false);
  }

  async function toggleLike(post) {
    const liked = post.likes?.includes(currentUser.uid);
    await updateDoc(doc(db, 'posts', post.id), {
      likes: liked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
    });
  }

  async function removePost(post) {
    if (post.authorId !== currentUser.uid) return;
    if (!confirm('Delete this post?')) return;
    await deleteDoc(doc(db, 'posts', post.id));
  }

  return (
    <div className="feed-page">
      <form className="card composer" onSubmit={handlePost}>
        <div className="composer-top">
          <div className="avatar">
            {currentProfile?.photoURL
              ? <img src={currentProfile.photoURL} alt="" />
              : (currentProfile?.name?.[0] || 'M')}
          </div>
          <textarea
            placeholder="Share something with the distillery network..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
        </div>
        {preview && (
          <div className="composer-preview">
            <img src={preview} alt="preview" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setImage(null); setPreview(''); }}>
              Remove
            </button>
          </div>
        )}
        <div className="composer-actions">
          <label className="btn btn-ghost btn-sm">
            Add photo
            <input type="file" accept="image/*" hidden onChange={handleImagePick} />
          </label>
          <button type="submit" className="btn btn-primary btn-sm" disabled={posting || (!text.trim() && !image)}>
            {posting ? <span className="spinner" /> : 'Post'}
          </button>
        </div>
      </form>

      {posts.length === 0 && (
        <div className="empty-state">No posts yet — be the first to share something.</div>
      )}

      {posts.map((post) => (
        <div className="card post" key={post.id}>
          <div className="post-header">
            <div className="avatar">
              {post.authorPhotoURL ? <img src={post.authorPhotoURL} alt="" /> : (post.authorName?.[0] || '?')}
            </div>
            <div className="post-author">
              <div className="post-author-name">{post.authorName}</div>
              {post.authorHeadline && <div className="post-author-headline">{post.authorHeadline}</div>}
              <div className="post-time">{timeAgo(post.createdAt)}</div>
            </div>
            {post.authorId === currentUser.uid && (
              <button className="btn btn-ghost btn-sm" onClick={() => removePost(post)}>Delete</button>
            )}
          </div>
          {post.text && <p className="post-text">{post.text}</p>}
          {post.imageURL && <img className="post-image" src={post.imageURL} alt="" />}
          <div className="post-actions">
            <button
              type="button"
              className={'btn btn-ghost btn-sm' + (post.likes?.includes(currentUser.uid) ? ' active' : '')}
              onClick={() => toggleLike(post)}
            >
              👍 {post.likes?.length || 0}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
