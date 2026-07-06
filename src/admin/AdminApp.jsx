import { Routes, Route, Navigate } from 'react-router-dom';
import AdminGate from './components/AdminGate';
import AdminShell from './components/AdminShell';
import Dashboard from './pages/Dashboard';
import ScoreboardAdmin from './pages/ScoreboardAdmin';
import AnnouncementsAdmin from './pages/AnnouncementsAdmin';
import MarqueeAdmin from './pages/MarqueeAdmin';
import TeamsAdmin from './pages/TeamsAdmin';
import PrelimScheduleAdmin from './pages/PrelimScheduleAdmin';
import FinalsScheduleAdmin from './pages/FinalsScheduleAdmin';
import RoundResultsAdmin from './pages/RoundResultsAdmin';
import RegulationsAdmin from './pages/RegulationsAdmin';
import CourtsAdmin from './pages/CourtsAdmin';
import RegistrationAdmin from './pages/RegistrationAdmin';
import AboutFilesAdmin from './pages/AboutFilesAdmin';

// ============================================================
// AdminApp — 獨立後台應用的路由表
// 由 AdminGate 統一守衛，通過後進入 AdminShell（側邊欄 + 內容出口）。
// 賽程與成績已拆分：賽程(schedule) / 預賽成績(prelim) / 複賽成績(finals)。
// ============================================================
export default function AdminApp() {
  return (
    <AdminGate>
      <Routes>
        <Route element={<AdminShell />}>
          <Route index element={<Dashboard />} />
          {/* 編輯比分頁：由預賽／複賽管理點「開始計分」進入（無側邊欄頁籤） */}
          <Route path="score/:matchNo" element={<ScoreboardAdmin />} />
          <Route path="announcements" element={<AnnouncementsAdmin />} />
          <Route path="marquee" element={<MarqueeAdmin />} />
          <Route path="teams" element={<TeamsAdmin />} />
          <Route path="grouping" element={<Navigate to="/schedule/prelim" replace />} />
          <Route path="schedule/prelim" element={<PrelimScheduleAdmin />} />
          <Route path="schedule/finals" element={<FinalsScheduleAdmin />} />
          <Route path="prelim" element={<Navigate to="/schedule/prelim" replace />} />
          <Route path="finals" element={<Navigate to="/schedule/finals" replace />} />
          <Route path="standings" element={<RoundResultsAdmin />} />
          <Route path="courts" element={<CourtsAdmin />} />
          <Route path="regulations" element={<RegulationsAdmin />} />
          <Route path="registration" element={<RegistrationAdmin />} />
          <Route path="files" element={<AboutFilesAdmin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AdminGate>
  );
}
