// ============================================================
// useAuth — Firebase Authentication 狀態管理 Hook
// 封裝 Google 登入／登出；登入後將帳號寫入 users/{uid}（沒有就建立），
// 並即時監聽該文件的 permission 欄位來判斷是否為管理員。
// 管理員判定須與 firestore.rules 的 isAdmin() 一致（permission === 'admin'）。
// ============================================================
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

/**
 * 將登入帳號的基本資料寫入 users/{uid}（沒有就建立）。
 *
 * permission 只在「初次建立」時預設為 'user'；既有文件絕不重寫 permission，
 * 以免用 merge 把管理員覆蓋回一般使用者，也符合「禁止自行提權」的規則。
 *
 * @param {import('firebase/auth').User} user 目前登入的 Firebase 使用者。
 */
async function upsertUserProfile(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const profile = {
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    updatedAt: serverTimestamp(),
  };
  // 僅在初次建立時寫入預設 permission 與 createdAt
  if (!snap.exists()) {
    profile.permission = 'user';
    profile.createdAt = serverTimestamp();
  }
  await setDoc(ref, profile, { merge: true });
}

/**
 * 監聽 Firebase Auth 狀態並提供登入／登出方法。
 * @returns {{
 *   user: import('firebase/auth').User | null,
 *   loading: boolean,
 *   isAdmin: boolean,
 *   permission: string | null,
 *   error: string,
 *   login: () => Promise<void>,
 *   logout: () => Promise<void>,
 * }}
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [permission, setPermission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 保存 users 文件的即時監聽取消函式，切換帳號時先取消舊的
  const docUnsubRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // 切換帳號／登出前，先取消前一位使用者的文件監聽
      if (docUnsubRef.current) {
        docUnsubRef.current();
        docUnsubRef.current = null;
      }

      setUser(currentUser);

      if (!currentUser) {
        setPermission(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await upsertUserProfile(currentUser);
      } catch (err) {
        // 寫入失敗不阻擋登入，僅記錄以利除錯
        console.error('寫入 users 文件失敗：', err);
      }

      // 即時監聽 permission，讓管理員在 Console 改權限後前端即時生效
      docUnsubRef.current = onSnapshot(
        doc(db, 'users', currentUser.uid),
        (snap) => {
          setPermission(snap.exists() ? (snap.data().permission ?? null) : null);
          setLoading(false);
        },
        (err) => {
          console.error('讀取 users 文件失敗：', err);
          setPermission(null);
          setLoading(false);
        },
      );
    });

    return () => {
      unsubscribe();
      if (docUnsubRef.current) docUnsubRef.current();
    };
  }, []);

  // Google 彈窗登入
  const login = useCallback(async () => {
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // 使用者主動關閉彈窗時不視為錯誤
      if (err?.code === 'auth/popup-closed-by-user') return;
      setError(err?.message || '登入失敗，請稍後再試。');
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    setError('');
    try {
      await signOut(auth);
    } catch (err) {
      setError(err?.message || '登出失敗，請稍後再試。');
    }
  }, []);

  // 是否為管理員：以 users/{uid}.permission 為準
  const isAdmin = permission === 'admin';

  return { user, loading, isAdmin, permission, error, login, logout };
}
