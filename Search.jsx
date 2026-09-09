import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export default function Search() {
  const [term, setTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'users'), (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsub2 = onSnapshot(collection(db, 'posts'), (s) => setPosts(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsub3 = onSnapshot(collection(db, 'jobs'), (s) => setJobs(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsub4 = onSnapshot(collection(db, 'articles'), (s) => setArticles(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, []);

  const s = term.trim().toLowerCase();
  const matchedUsers = s ? users.filter((u) => u.name?.toLowerCase().includes(s) || u.headline?.toLowerCase().includes(s) || u.company?.toLowerCase().includes(s)) : [];
  const matchedPosts = s ? posts.filter((p) => p.text?.toLowerCase().includes(s)) : [];
  const matchedJobs = s ? jobs.filter((j) => j.title?.toLowerCase().includes(s) || j.company?.toLowerCase().includes(s)) : [];
  const matchedArticles = s ? articles.filter((a) => a.title?.toLowerCase().includes(s)) : [];
  const nothing = s && !matchedUsers.length && !matchedPosts.length && !matchedJobs.length && !matchedArticles.length;

  return (
    <div className="search-page">
      <div className="card">
        <input
          type="text"
          placeholder="Search people, posts, jobs, articles..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          autoFocus
        />
      </div>

      {!s && <div className="empty-state">Start typing to search across DistilleryHub.</div>}
      {nothing && <div className="empty-state">No results for "{term}".</div>}

      {matchedUsers.length > 0 && (
        <div className="card">
          <h3>People</h3>
          {matchedUsers.map((u) => (
            <Link className="person-row" key={u.id} to={`/profile/${u.id}`}>
              <div className="avatar">
                {u.photoURL ? <img src={u.photoURL} alt="" /> : (u.name?.[0] || '?')}
              </div>
              <div className="person-info">
                <div className="person-name">{u.name}</div>
                <div className="person-headline">{u.headline}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {matchedPosts.length > 0 && (
        <div className="card">
          <h3>Posts</h3>
          {matchedPosts.map((p) => (
            <div className="post-text" key={p.id} style={{ marginBottom: 8 }}>
              <strong>{p.authorName}: </strong>{p.text}
            </div>
          ))}
        </div>
      )}

      {matchedJobs.length > 0 && (
        <div className="card">
          <h3>Jobs</h3>
          {matchedJobs.map((j) => (
            <Link className="person-row" key={j.id} to="/jobs">
              <div className="person-info">
                <div className="person-name">{j.title}</div>
                <div className="person-headline">{j.company}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {matchedArticles.length > 0 && (
        <div className="card">
          <h3>Articles</h3>
          {matchedArticles.map((a) => (
            <Link className="person-row" key={a.id} to="/articles">
              <div className="person-info">
                <div className="person-name">{a.title}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
