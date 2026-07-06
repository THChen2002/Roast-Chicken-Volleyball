import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeResultsAdmin,
  subscribeTeamsAdmin,
  subscribeAnnouncementsAdmin,
} from '../../services/firestore';
import { PageHeader } from '../components/ui';

// 後台各管理區塊（與側邊欄一致）。icon 為 Font Awesome class。
// 即時計分改由預賽／複賽管理點場次「開始計分」進入，不再有獨立頁籤。
const SECTIONS = [
  { to: '/teams', icon: 'fa-solid fa-users', label: '參賽名單', desc: '隊伍、系所、組別與隊員（表格）' },
  { to: '/schedule/prelim', icon: 'fa-solid fa-calendar-days', label: '預賽管理', desc: '拖曳分組產生賽程；點場次編輯賽程與比分' },
  { to: '/schedule/finals', icon: 'fa-solid fa-calendar-check', label: '複賽管理', desc: '複決賽時刻表；點場次編輯賽程與比分' },
  { to: '/standings', icon: 'fa-solid fa-trophy', label: '循環賽排名', desc: '各組積分與排名（可自動計算）' },
  { to: '/announcements', icon: 'fa-solid fa-bullhorn', label: '公告管理', desc: '賽事公告的新增與編輯' },
  { to: '/marquee', icon: 'fa-solid fa-scroll', label: '跑馬燈', desc: '首頁跑馬燈文字與顯示開關' },
  { to: '/regulations', icon: 'fa-solid fa-book-open', label: '競賽章程', desc: '章程條文內容' },
];

// 統計卡的配色（三主題色各一：navy／排球黃／court 藍）。fg 為 icon 對比色。
const STAT_STYLES = [
  { icon: 'fa-solid fa-users', bg: 'bg-navy-800', fg: 'text-white' },
  { icon: 'fa-solid fa-volleyball', bg: 'bg-vbyellow-400', fg: 'text-navy-900' },
  { icon: 'fa-solid fa-bullhorn', bg: 'bg-court', fg: 'text-white' },
];

// 單一統計卡
function StatCard({ label, value, to, style }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 bg-white rounded-xl border border-navy-100 shadow-sm p-5 hover:shadow-md hover:border-navy-200 transition-all"
    >
      <span
        className={`w-12 h-12 shrink-0 rounded-xl ${style.bg} ${style.fg} text-xl flex items-center justify-center shadow-sm`}
      >
        <i className={style.icon} aria-hidden="true"></i>
      </span>
      <div>
        <p className="text-slate-500 text-sm">{label}</p>
        <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
      </div>
    </Link>
  );
}

// ============================================================
// Dashboard — 後台總覽：即時統計 + 各管理區塊入口
// ============================================================
export default function Dashboard() {
  const [stats, setStats] = useState({ teams: '–', matches: '–', announcements: '–' });

  // 即時統計各集合數量（元件卸載時取消訂閱）
  useEffect(() => {
    const unsubs = [
      subscribeTeamsAdmin((d) => setStats((s) => ({ ...s, teams: d.length }))),
      subscribeResultsAdmin((d) => setStats((s) => ({ ...s, matches: d.length }))),
      subscribeAnnouncementsAdmin((d) =>
        setStats((s) => ({ ...s, announcements: d.length })),
      ),
    ];
    return () => unsubs.forEach((u) => u && u());
  }, []);

  return (
    <>
      <PageHeader title="總覽" desc="賽事資料即時概況與各管理區塊入口" />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-8">
        <StatCard label="參賽隊伍" value={stats.teams} to="/teams" style={STAT_STYLES[0]} />
        <StatCard label="賽程場次" value={stats.matches} to="/schedule/prelim" style={STAT_STYLES[1]} />
        <StatCard label="公告則數" value={stats.announcements} to="/announcements" style={STAT_STYLES[2]} />
      </div>

      <h2 className="text-[11px] font-semibold text-navy-400 tracking-widest mb-3">
        管理區塊
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="group flex items-center gap-4 bg-white rounded-xl shadow-sm hover:shadow-md border border-navy-100 hover:border-navy-200 p-5 transition-all"
          >
            {/* icon 圓底：navy 淺底，hover 轉排球黃淺底 */}
            <span className="w-11 h-11 shrink-0 rounded-xl bg-navy-50 group-hover:bg-vbyellow-100 text-navy-700 group-hover:text-vbyellow-600 text-xl flex items-center justify-center transition-colors">
              <i className={s.icon} aria-hidden="true"></i>
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-800">{s.label}</h3>
              <p className="text-slate-500 text-sm mt-0.5">{s.desc}</p>
            </div>
            <span className="ml-auto text-navy-300 group-hover:text-vbyellow-500 transition-colors">
              <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
