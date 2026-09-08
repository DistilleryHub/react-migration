import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

const AuthContext = createContext(null);
const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  // authLoading = still waiting to hear from Firebase on first load.
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setCurrentProfile(null);
        setAuthLoading(false);
      }
    });
    return unsub;
  }, []);

  // Live profile doc so header/sidebar reflect edits instantly.
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      setCurrentProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setAuthLoading(false);
    });
    return unsub;
  }, [currentUser]);

  async function signup({ name, headline, email, password }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      name, headline, company: '', location: '', bio: '', photoURL: '',
      blocked: [], isAdmin: false, createdAt: serverTimestamp(),
    });
  }

  async function signin({ email, password }) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function googleSignIn() {
    const cred = await signInWithPopup(auth, googleProvider);
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (!snap.exists()) {
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: cred.user.displayName || 'Member', headline: '', company: '', location: '', bio: '',
        photoURL: cred.user.photoURL || '', blocked: [], isAdmin: false,
        createdAt: serverTimestamp(),
      });
    }
  }

  async function forgotPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  function logout() {
    return signOut(auth);
  }

  const value = {
    currentUser, currentProfile, authLoading,
    signup, signin, googleSignIn, forgotPassword, logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
