import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/* ---------------- Firebase config (distilleryhub-b1d2d project) ----------------
   Same config as the old index.html — copied as-is, nothing changed here. */
const firebaseConfig = {
  apiKey: "AIzaSyB63lPTtic1RUjfq-KXWrvtisSGIetXL6k",
  authDomain: "distilleryhub-b1d2d.firebaseapp.com",
  projectId: "distilleryhub-b1d2d",
  storageBucket: "distilleryhub-b1d2d.firebasestorage.app",
  messagingSenderId: "221084904588",
  appId: "1:221084904588:web:f1c47a722b2a7c98509fa9",
  measurementId: "G-66L58LCCVY"
};

export const CLOUDINARY_CLOUD_NAME = "y8iguofl";
export const CLOUDINARY_UPLOAD_PRESET = "tdm_upload";

export const fbApp = initializeApp(firebaseConfig);
export const auth = getAuth(fbApp);
export const db = getFirestore(fbApp);
export const storage = getStorage(fbApp);
