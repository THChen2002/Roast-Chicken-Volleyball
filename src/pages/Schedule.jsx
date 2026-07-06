import { useEffect, useMemo, useState } from 'react';
import { subscribeResults, subscribeTeams, subscribeCourts } from '../services/firestore';
import { teamNameBySeed, resolveMatch } from '../lib/teamSeed';
import LoadingOverlay from '../components/LoadingOverlay';
import TabbedMain from '../components/TabbedMain';
import ScheduleGrid from '../components/ScheduleGrid';
import { IconCalendar } from '../components/TabIcons';
import { matchDate, eventDates, dayLabel, LEGACY_DAY_DATES } from '../lib/matchDay';

// 賽程表：依後台 results 即時動態顯示（以比賽日分頁；比賽日由場次日期推導，較小者為 DAY 1）
export default function Schedule() {
  const [results, setResults] = useState([]);
  const [teams, setTeams] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('');

  useEffect(() => {
    const unsub = subscribeResults(
      (data) => {
        setResults(data);
        setLoading(false);
      },
      (err) => {
        console.error('獲取賽程失敗:', err);
        setLoading(false);
      },
    );
    // 訂閱隊伍：場次文件只存佔位標籤，顯示時由各隊 seed 反查隊名
    const unsubTeams = subscribeTeams(setTeams, (err) => console.error(err));
    // 訂閱場地設定：決定賽程表場地欄位的顯示順序
    const unsubCourts = subscribeCourts(setCourts, (err) => console.error(err));
    return () => {
      unsub();
      unsubTeams();
      unsubCourts();
    };
  }, []);

  // seed 標籤（A1、A冠…）→ 隊名
  const nameBySeed = useMemo(() => teamNameBySeed(teams), [teams]);

  // 場次出現過的比賽日期（升冪；最小者為 DAY 1）
  const dates = useMemo(() => {
    const list = eventDates(results);
    return list.length ? list : [LEGACY_DAY_DATES.day1];
  }, [results]);

  useEffect(() => {
    if (!dates.includes(active)) setActive(dates[0]);
  }, [dates, active]);

  const tabs = useMemo(
    () => dates.map((d, i) => ({ key: d, label: dayLabel(d, i), icon: IconCalendar })),
    [dates],
  );

  const matches = useMemo(
    () => results
      .filter((r) => matchDate(r) === active)
      .map((r) => resolveMatch(r, nameBySeed)),
    [results, active, nameBySeed],
  );

  return (
    <>
      {loading && <LoadingOverlay />}
      <TabbedMain id="scheduleContainer" tabs={tabs} active={active} onChange={setActive}>
        {/* 賽程表：顯示原始對戰標籤小字，不顯示分數（分數見對戰成績頁） */}
        <ScheduleGrid matches={matches} courtOrder={courts} showScores={false} showSlots />
      </TabbedMain>
    </>
  );
}
