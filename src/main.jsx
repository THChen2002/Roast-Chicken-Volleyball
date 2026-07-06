import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// ============================================================
// 單一 SPA 進入點：依網址路徑決定掛載前台或後台。
//   /admin、/admin/... → 後台（BrowserRouter basename="/admin"）
//   其餘路徑           → 前台
// 兩個 App 各自 dynamic import，維持「前後台 bundle 分離」——
// 前台不會下載後台程式碼，反之亦然。
// 後台改用 basename 後，內部所有絕對路徑（/teams、/schedule/prelim…）
// 會自動加上 /admin 前綴，網址乾淨且不再有 .html 或 #。
// ============================================================
async function resolveApp() {
  const isAdmin = window.location.pathname.startsWith('/admin');

  if (isAdmin) {
    const { default: AdminApp } = await import('./admin/AdminApp');
    await import('./admin/admin.css');
    return (
      <BrowserRouter basename="/admin">
        <AdminApp />
      </BrowserRouter>
    );
  }

  const { default: App } = await import('./App');
  await Promise.all([
    import('./styles/style.css'),
    import('./styles/index.css'),
    import('./styles/score.css'),
    import('./styles/teams.css'),
    import('./global.css'),
  ]);
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

resolveApp().then((tree) => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>{tree}</React.StrictMode>,
  );
});
