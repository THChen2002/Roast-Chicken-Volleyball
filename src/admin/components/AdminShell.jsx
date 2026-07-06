import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

// 後台側邊導覽：依功能分組
const NAV_GROUPS = [
  {
    title: '',
    items: [{ to: '/', label: '總覽', end: true }],
  },
  {
    title: '賽事即時',
    items: [
      { to: '/announcements', label: '公告管理' },
      { to: '/marquee', label: '跑馬燈' },
      { to: '/registration', label: '報名設定' },
    ],
  },
  {
    title: '賽事資料',
    items: [
      { to: '/teams', label: '參賽名單' },
      { to: '/schedule/prelim', label: '預賽管理' },
      { to: '/schedule/finals', label: '複賽管理' },
      { to: '/standings', label: '循環賽排名' },
    ],
  },
  {
    title: '賽務設定',
    items: [
      { to: '/courts', label: '場地管理' },
      { to: '/regulations', label: '競賽章程' },
      { to: '/files', label: '相關檔案' },
    ],
  },
];

// 扁平化導覽項，供頂列麵包屑依路徑查標題
const FLAT_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

// 烤雞 LOGO（排球黃點綴）
function ChickenMark({ size = 26, fill = '#FFC53D' }) {
  return (
    <svg fill={fill} width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.59,6.9a0,0,0,0,1,0,0,.86.86,0,0,0-.07-.1A10,10,0,0,0,7.6,3l0,0h0l-.07,0a10,10,0,0,0-1,17.19h0l.33.2.1.07h0A9.93,9.93,0,0,0,12,22h.21A10,10,0,0,0,20.59,6.9ZM19,8.06a7.64,7.64,0,0,1,.65,1.46,10,10,0,0,0-3-.49.81.81,0,0,0-.31,0,9.78,9.78,0,0,0-3.58.73,7.85,7.85,0,0,1-1.84-1.6A8.16,8.16,0,0,1,19,8.06ZM12,4a7.86,7.86,0,0,1,4,1.07A7.77,7.77,0,0,0,15,5,10,10,0,0,0,9.8,6.47a8,8,0,0,1-.64-1.94A7.92,7.92,0,0,1,12,4ZM6,6.71A8.26,8.26,0,0,1,7.33,5.52,9.9,9.9,0,0,0,12,11.61a7.89,7.89,0,0,1-.77,2.88A8,8,0,0,1,6,7C6,6.9,6,6.81,6,6.71ZM4,12a8.1,8.1,0,0,1,.36-2.37,10,10,0,0,0,5.7,6.56,7.84,7.84,0,0,1-2.93,2.14A8,8,0,0,1,4,12Zm7.86,8a7.8,7.8,0,0,1-2.61-.49,9.94,9.94,0,0,0,3.23-3.22l0,0A10,10,0,0,0,14,11.41a7.71,7.71,0,0,1,1.78-.36A8,8,0,0,1,11.86,20Zm4.22-1.12A9.94,9.94,0,0,0,18,13a10.69,10.69,0,0,0-.18-1.88,8.34,8.34,0,0,1,2.17.7c0,.06,0,.12,0,.18A8,8,0,0,1,16.08,18.87Z" />
    </svg>
  );
}

// ============================================================
// AdminShell — 後台外框：深藍品牌側邊欄 + 頂列（麵包屑/身分/登出）+ 內容
// 已由 AdminGate 保證僅管理員進入。行動裝置側邊欄改為抽屜式。
// ============================================================
export default function AdminShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false); // 行動裝置抽屜開關
  const { pathname } = useLocation();

  // 當前頁標題（供麵包屑顯示）；根路徑對應「總覽」
  const current =
    FLAT_ITEMS.find((it) => it.to === pathname)?.label ||
    (pathname === '/' ? '總覽' : '');

  // 使用者頭像字元（顯示名稱或 email 首字）
  const avatarChar = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();

  // active 導覽項：深藍純色底 + 白字；hover 用淺藍底（顏色克制、不用漸層）
  const linkClass = ({ isActive }) =>
    `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
      isActive
        ? 'bg-navy-800 text-white font-medium shadow-sm'
        : 'text-slate-600 hover:bg-navy-50 hover:text-navy-700'
    }`;

  return (
    <div className="min-h-screen flex bg-navy-50 text-slate-800">
      {/* 行動裝置遮罩 */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 側邊欄：固定於視窗（不隨內容捲動），桌面版常駐、行動裝置抽屜式 */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white/90 backdrop-blur border-r border-navy-100 flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 品牌列：深海軍藍純色底 */}
        <div className="h-16 flex items-center gap-2.5 px-5 bg-navy-900">
          <ChickenMark />
          <div className="leading-tight">
            <p className="font-bold text-white text-[15px] font-display tracking-wide">管理後台</p>
            <p className="text-navy-200 text-[11px]">賽事管理系統</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-1">
              {group.title && (
                <p className="px-3 pt-1 pb-1 text-[11px] font-semibold text-navy-400 tracking-widest">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={linkClass}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* 主內容區：留出固定側邊欄寬度 */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="h-16 bg-white/70 backdrop-blur border-b border-navy-100 flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-20">
          {/* 行動裝置漢堡 */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="lg:hidden text-slate-500 hover:text-navy-700 p-1"
            aria-label="開啟選單"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* 麵包屑 */}
          <nav className="flex items-center gap-1.5 text-sm">
            <span className="text-slate-400">管理後台</span>
            {current && (
              <>
                <span className="text-navy-300">/</span>
                <span className="font-medium text-slate-700">{current}</span>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-navy-800 text-vbyellow-400 text-sm font-semibold flex items-center justify-center shadow-sm">
                {avatarChar}
              </span>
              <span className="text-sm text-slate-600 max-w-[12rem] truncate">
                {user?.displayName || user?.email}
              </span>
            </div>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-600 hover:text-navy-700 border border-navy-200 hover:border-navy-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              前往前台
            </a>
            <button
              type="button"
              onClick={logout}
              className="text-sm text-slate-600 hover:text-red-600 border border-navy-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              登出
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
