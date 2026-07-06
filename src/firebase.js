// ============================================================
// Firebase 前端設定（專案：matchboard-f3d7d）
// 依你的需求：設定直接寫在程式碼裡（不使用 .env）。
// 此處皆為前端公開識別碼，可安全出現在程式碼中；真正的權限管控由 firestore.rules 負責。
//
// 若要更換專案，到 Firebase Console → 專案設定（齒輪）→「一般」→ 你的應用程式，
// 找到「Web 應用程式」的 firebaseConfig，整段替換下方 firebaseConfig。
// ============================================================
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCYXNBbohrkN_vSyfp77xFFQ3zXWpcgAYI",
  authDomain: "matchboard-f3d7d.firebaseapp.com",
  projectId: "matchboard-f3d7d",
  storageBucket: "matchboard-f3d7d.firebasestorage.app",
  messagingSenderId: "13844647335",
  appId: "1:13844647335:web:264bb27ae256a4429a3a82"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
