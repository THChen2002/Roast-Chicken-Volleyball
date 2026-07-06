import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

// 導覽列連結
const NAV_ITEMS = [
  { to: '/', label: '首頁' },
  { to: '/score', label: '即時比分' },
  { to: '/schedule', label: '賽程表' },
  { to: '/results', label: '對戰成績' },
  { to: '/teams', label: '參賽名單' },
  { to: '/about', label: '關於比賽' },
];

// 烤雞 LOGO
function ChickenLogo({ size = 28, fill = '#FFC53D', style }) { // logo 圖示：排球黃點綴（vbyellow-400）
  return (
    <svg fill={fill} width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1" style={style}>
      <path d="M20.59,6.9a0,0,0,0,1,0,0,.86.86,0,0,0-.07-.1A10,10,0,0,0,7.6,3l0,0h0l-.07,0a10,10,0,0,0-1,17.19h0l.33.2.1.07h0A9.93,9.93,0,0,0,12,22h.21A10,10,0,0,0,20.59,6.9ZM19,8.06a7.64,7.64,0,0,1,.65,1.46,10,10,0,0,0-3-.49.81.81,0,0,0-.31,0,9.78,9.78,0,0,0-3.58.73,7.85,7.85,0,0,1-1.84-1.6A8.16,8.16,0,0,1,19,8.06ZM12,4a7.86,7.86,0,0,1,4,1.07A7.77,7.77,0,0,0,15,5,10,10,0,0,0,9.8,6.47a8,8,0,0,1-.64-1.94A7.92,7.92,0,0,1,12,4ZM6,6.71A8.26,8.26,0,0,1,7.33,5.52,9.9,9.9,0,0,0,12,11.61a7.89,7.89,0,0,1-.77,2.88A8,8,0,0,1,6,7C6,6.9,6,6.81,6,6.71ZM4,12a8.1,8.1,0,0,1,.36-2.37,10,10,0,0,0,5.7,6.56,7.84,7.84,0,0,1-2.93,2.14A8,8,0,0,1,4,12Zm7.86,8a7.8,7.8,0,0,1-2.61-.49,9.94,9.94,0,0,0,3.23-3.22l0,0A10,10,0,0,0,14,11.41a7.71,7.71,0,0,1,1.78-.36A8,8,0,0,1,11.86,20Zm4.22-1.12A9.94,9.94,0,0,0,18,13a10.69,10.69,0,0,0-.18-1.88,8.34,8.34,0,0,1,2.17.7c0,.06,0,.12,0,.18A8,8,0,0,1,16.08,18.87Z" />
    </svg>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, login, logout } = useAuth();

  // 前台導覽僅含公開頁面；後台掛載於 /admin 路徑。
  const navItems = NAV_ITEMS;

  // 管理入口：僅白名單管理員可見，點擊以新分頁開啟後台
  const adminLink = () =>
    isAdmin ? (
      <a href="/admin" target="_blank" rel="noopener noreferrer">
        管理後台
      </a>
    ) : null;

  // 登出後關閉手機選單
  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  // 點擊登入：先收合手機選單，再開啟 Google 登入彈窗
  const handleLogin = () => {
    setOpen(false);
    login();
  };

  // 認證控制項：未登入顯示「登入」按鈕；已登入顯示「登出」按鈕
  // 兩者皆直接觸發 Firebase Auth，毋須額外頁面
  const authControl = () =>
    user ? (
      <button type="button" onClick={handleLogout}>
        登出
      </button>
    ) : (
      <button type="button" onClick={handleLogin}>
        登入
      </button>
    );

  return (
    <nav className="navbar">
      <div className="logo">
        {/* logo 文字：運動字體與字距 */}
        <Link to="/" className="logo font-display tracking-wide" onClick={() => setOpen(false)}>
          <ChickenLogo style={{ marginRight: '0.5rem' }} />
          2026國北烤雞盃混合排球賽
        </Link>
      </div>

      {/* 手機選單 CSS checkbox hack（受控） */}
      <input
        type="checkbox"
        id="nav-toggle"
        className="nav-toggle"
        checked={open}
        onChange={(e) => setOpen(e.target.checked)}
      />
      <label htmlFor="nav-toggle" className="hamburger" aria-label="開啟選單">
        <span></span>
        <span></span>
        <span></span>
      </label>

      <div className="nav-links">
        {navItems.map((item) => (
          <Link key={item.to} to={item.to}>
            {item.label}
          </Link>
        ))}
        {adminLink()}
        {authControl()}
      </div>

      <div className="mobile-menu">
        {navItems.map((item) => (
          <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>
            {item.label}
          </Link>
        ))}
        {adminLink()}
        {authControl()}
      </div>
    </nav>
  );
}

export { ChickenLogo };
