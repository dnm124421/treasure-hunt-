import { CONFIG } from '../config.js';

let firebaseApp = null;
let firebaseAuth = null;

async function initFirebase() {
  if (firebaseAuth) return firebaseAuth;
  const { initializeApp } = await import('firebase/app');
  const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
  firebaseApp = initializeApp(CONFIG.FIREBASE_CONFIG);
  firebaseAuth = getAuth(firebaseApp);
  return { auth: firebaseAuth, signInWithEmailAndPassword };
}

export async function adminLogin(email, password) {
  const { auth, signInWithEmailAndPassword } = await initFirebase();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();
  
  // Store admin session
  try {
    localStorage.setItem('ch_admin_token', idToken);
    localStorage.setItem('ch_admin_email', email);
    localStorage.setItem('ch_admin_ts', String(Date.now()));
  } catch {}
  
  return idToken;
}

export function getStoredAdminSession() {
  try {
    const token = localStorage.getItem('ch_admin_token');
    const ts = parseInt(localStorage.getItem('ch_admin_ts') || '0');
    // Session valid for 1 hour
    if (token && Date.now() - ts < 3600000) {
      return { token, email: localStorage.getItem('ch_admin_email') };
    }
  } catch {}
  return null;
}

export function clearAdminSession() {
  try {
    localStorage.removeItem('ch_admin_token');
    localStorage.removeItem('ch_admin_email');
    localStorage.removeItem('ch_admin_ts');
  } catch {}
}
