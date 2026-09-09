import { useEffect, useMemo, useState } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from './firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export default function Marketplace() {
  const { currentUser, currentProfile } = useAuth();
  const toast = useToast();
  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', price: '', description: '' });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.price) return;
    setSaving(true);
    try {
      let imageURL = '';
      if (image) {
        const fd = new FormData();
        fd.append('file', image);
        fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: fd }
        );
        const data = await res.json();
        if (!data.secure_url) throw new Error('Image upload failed');
        imageURL = data.secure_url;
      }
      await addDoc(collection(db, 'listings'), {
        title: form.title.trim(),
        price: Number(form.price) || 0,
        description: form.description.trim(),
        imageURL,
        sellerId: currentUser.uid,
        sellerName: currentProfile?.name || 'Member',
        sold: false,
        createdAt: serverTimestamp(),
      });
      setForm({ title: '', price: '', description: '' });
      setImage(null); setPreview(''); setShowForm(false);
      toast('Listing posted');
    } catch (err) {
      toast(err.message || 'Could not post listing');
    }
    setSaving(false);
  }

  async function toggleSold(listing) {
    if (listing.sellerId !== currentUser.uid) return;
    await updateDoc(doc(db, 'listings', listing.id), { sold: !listing.sold });
  }

  async function removeListing(listing) {
    if (listing.sellerId !== currentUser.uid) return;
    if (!confirm('Delete this listing?')) return;
    await deleteDoc(doc(db, 'listings', listing.id));
  }

  const visible = useMemo(() => {
    if (!search.trim()) return listings;
    const s = search.toLowerCase();
    return listings.filter((l) => l.title?.toLowerCase().includes(s));
  }, [listings, search]);

  return (
    <div className="marketplace-page">
      <div className="card">
        <input
          type="text"
          placeholder="Search listings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Sell something'}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={handleSubmit}>
          <div className="form-field">
            <input type="text" placeholder="Item title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-field">
            <input type="number" placeholder="Price" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div className="form-field">
            <textarea placeholder="Description" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {preview && <img className="composer-preview-img" src={preview} alt="" />}
          <label className="btn btn-ghost btn-sm">
            Add photo
            <input type="file" accept="image/*" hidden onChange={handleImagePick} />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={saving} style={{ marginTop: 8 }}>
            {saving ? <span className="spinner" /> : 'Post listing'}
          </button>
        </form>
      )}

      <div className="people-grid">
        {visible.map((listing) => (
          <div className={'card listing-card' + (listing.sold ? ' sold' : '')} key={listing.id}>
            {listing.imageURL && <img className="listing-image" src={listing.imageURL} alt="" />}
            <div className="listing-title">{listing.title}</div>
            <div className="listing-price">₹{listing.price}</div>
            {listing.description && <p className="listing-description">{listing.description}</p>}
            <div className="listing-seller">by {listing.sellerName}</div>
            {listing.sold && <div className="badge">SOLD</div>}
            {listing.sellerId === currentUser.uid && (
              <div className="job-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => toggleSold(listing)}>
                  {listing.sold ? 'Mark available' : 'Mark sold'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => removeListing(listing)}>Delete</button>
              </div>
            )}
          </div>
        ))}
        {visible.length === 0 && <div className="empty-state">No listings found.</div>}
      </div>
    </div>
  );
}
