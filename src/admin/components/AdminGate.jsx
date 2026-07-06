import { useEffect } from 'react';
import useAuth from '../../hooks/useAuth';

// 全螢幕置中的訊息容器（深藍主題淺色背景）
function Centered({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-navy-100 p-8 text-center">
        {children}
      </div>
    </div>
  );
}

// 烤雞 LOGO（深藍圓底、排球黃圖案）
function BrandMark() {
  return (
    <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-navy-900 flex items-center justify-center shadow-sm">
      <svg fill="#FFC53D" width={34} height={34} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.59,6.9a0,0,0,0,1,0,0,.86.86,0,0,0-.07-.1A10,10,0,0,0,7.6,3l0,0h0l-.07,0a10,10,0,0,0-1,17.19h0l.33.2.1.07h0A9.93,9.93,0,0,0,12,22h.21A10,10,0,0,0,20.59,6.9ZM19,8.06a7.64,7.64,0,0,1,.65,1.46,10,10,0,0,0-3-.49.81.81,0,0,0-.31,0,9.78,9.78,0,0,0-3.58.73,7.85,7.85,0,0,1-1.84-1.6A8.16,8.16,0,0,1,19,8.06ZM12,4a7.86,7.86,0,0,1,4,1.07A7.77,7.77,0,0,0,15,5,10,10,0,0,0,9.8,6.47a8,8,0,0,1-.64-1.94A7.92,7.92,0,0,1,12,4ZM6,6.71A8.26,8.26,0,0,1,7.33,5.52,9.9,9.9,0,0,0,12,11.61a7.89,7.89,0,0,1-.77,2.88A8,8,0,0,1,6,7C6,6.9,6,6.81,6,6.71ZM4,12a8.1,8.1,0,0,1,.36-2.37,10,10,0,0,0,5.7,6.56,7.84,7.84,0,0,1-2.93,2.14A8,8,0,0,1,4,12Zm7.86,8a7.8,7.8,0,0,1-2.61-.49,9.94,9.94,0,0,0,3.23-3.22l0,0A10,10,0,0,0,14,11.41a7.71,7.71,0,0,1,1.78-.36A8,8,0,0,1,11.86,20Zm4.22-1.12A9.94,9.94,0,0,0,18,13a10.69,10.69,0,0,0-.18-1.88,8.34,8.34,0,0,1,2.17.7c0,.06,0,.12,0,.18A8,8,0,0,1,16.08,18.87Z" />
      </svg>
    </div>
  );
}

// Google 彩色 G 標誌
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

// ============================================================
// AdminGate — 獨立後台的登入／權限閘門（深藍品牌主題）
// 未登入 → 登入畫面；非白名單 → 直接導回公開首頁（不透露後台入口）。
// 真正寫入權限仍由 firestore.rules 把關，此處僅控制可見性。
// ============================================================
export default function AdminGate({ children }) {
  const { user, loading, isAdmin, error, login } = useAuth();

  // 已登入但非管理員 → 整頁導回公開首頁 /。
  // 公開站與後台是兩個獨立 bundle（後台 basename="/admin"），
  // 故用 window.location（整頁跳轉）而非 react-router 的 navigate。
  const denied = !loading && user && !isAdmin;
  useEffect(() => {
    if (denied) window.location.replace('/');
  }, [denied]);

  // 1) 等待 Auth 狀態
  if (loading) {
    return (
      <Centered>
        <BrandMark />
        <p className="text-navy-600 animate-pulse">載入中…</p>
      </Centered>
    );
  }

  // 2) 未登入 → 登入畫面
  if (!user) {
    return (
      <Centered>
        <BrandMark />
        <h1 className="text-xl font-bold font-display tracking-wide text-navy-800">賽事管理後台</h1>
        <p className="text-slate-500 text-sm mt-2 mb-6">
          請以管理員 Google 帳號登入
        </p>
        <button
          type="button"
          onClick={login}
          className="w-full flex items-center justify-center gap-2 border border-navy-200 rounded-lg px-4 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-50 hover:border-navy-300 transition-colors"
        >
          <GoogleIcon />
          使用 Google 登入
        </button>
        {error && <p className="text-red-500 text-xs mt-4">{error}</p>}
      </Centered>
    );
  }

  // 3) 已登入但非白名單 → 導回首頁進行中（不透露這裡是後台入口）
  //    上方 useEffect 會觸發整頁跳轉，此處僅顯示過場，避免閃現後台內容。
  if (!isAdmin) {
    return (
      <Centered>
        <BrandMark />
        <p className="text-navy-600 animate-pulse">載入中…</p>
      </Centered>
    );
  }

  // 4) 管理員 → 放行
  return children;
}
