import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 設定：單一進入點 index.html 的 SPA。
// 前台與後台共用同一個 React 掛載點，由 src/main.jsx 依網址路徑
// （/admin 進後台）動態載入對應 App，達成前後台 bundle 分離。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    allowedHosts: ['847a-150-116-173-47.ngrok-free.app'],
  },
});
