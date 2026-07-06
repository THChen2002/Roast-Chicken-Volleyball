import ScheduleAdmin from './ScheduleAdmin';
import GroupingSection from '../components/GroupingSection';

// 預賽管理：分組、賽程與成績同頁（上方拖曳分組產生預賽，點場次格子編輯）
export default function PrelimScheduleAdmin() {
  return (
    <ScheduleAdmin
      round="prelim"
      title="預賽管理"
      desc="拖曳隊伍到各位置產生預賽；下方時刻表可拖曳改時段，點場次編輯賽程與比分"
      intro={<GroupingSection />}
    />
  );
}
