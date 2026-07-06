import ScheduleAdmin from './ScheduleAdmin';

// 複賽管理：round='finals'，賽程與成績同頁（點場次格子編輯）
export default function FinalsScheduleAdmin() {
  return (
    <ScheduleAdmin
      round="finals"
      title="複賽管理"
      desc="複決賽時間 × 場地時刻表，可拖曳改時段；點場次編輯賽程與比分，完成後勝敗自動遞補"
    />
  );
}
