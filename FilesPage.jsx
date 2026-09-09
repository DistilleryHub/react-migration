import { useEffect, useState } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from './firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export default function Files() {
  const { currentUser, currentProfile } = useAuth();
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'files'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setFiles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`,
        { method: 'POST', body: fd }
      );
      const data = await res.json();
      if (!data.secure_url) throw new Error('Upload failed — check that your Cloudinary preset allows raw uploads');
      await addDoc(collection(db, 'files'), {
        title: title.trim(),
        fileURL: data.secure_url,
        fileName: file.name,
        uploadedBy: currentUser.uid,
        uploadedByName: currentProfile?.name || 'Member',
        createdAt: serverTimestamp(),
      });
      setTitle(''); setFile(null);
      toast('File shared');
    } catch (err) {
      toast(err.message || 'Upload failed');
    }
    setUploading(false);
  }

  async function removeFile(f) {
    if (f.uploadedBy !== currentUser.uid) return;
    if (!confirm('Delete this file?')) return;
    await deleteDoc(doc(db, 'files', f.id));
  }

  return (
    <div className="files-page">
      <form className="card" onSubmit={handleUpload}>
        <div className="form-field">
          <input type="text" placeholder="File title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="submit" className="btn btn-primary btn-block" disabled={uploading} style={{ marginTop: 8 }}>
          {uploading ? <span className="spinner" /> : 'Upload'}
        </button>
      </form>

      {files.length === 0 && <div className="empty-state">No files shared yet.</div>}

      {files.map((f) => (
        <div className="card file-row" key={f.id}>
          <div className="file-info">
            <div className="file-title">{f.title}</div>
            <div className="job-meta">{f.fileName} • shared by {f.uploadedByName}</div>
          </div>
          <div className="job-actions">
            <a className="btn btn-ghost btn-sm" href={f.fileURL} target="_blank" rel="noreferrer">Download</a>
            {f.uploadedBy === currentUser.uid && (
              <button className="btn btn-ghost btn-sm" onClick={() => removeFile(f)}>Delete</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
