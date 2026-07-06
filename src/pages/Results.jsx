import { useEffect, useMemo, useState } from 'react';
import {
  subscribeResults,
  subscribeTeams,
  subscribeTournamentConfig,
  subscribeLiveMatches,
} from '../services/firestore';
import LoadingOverlay from '../components/LoadingOverlay';
import TabbedMain from '../components/TabbedMain';
import GroupMatchupChart from '../components/GroupMatchupChart';
import FinalsBracket from '../components/FinalsBracket';
import GroupStandings from '../components/GroupStandings';
import { IconList, IconTrophy, IconCycle } from '../components/TabIcons';
import { teamNameBySeed, resolveMatch } from '../lib/teamSeed';

const TABS = [
  { key: 'prelim', label: '循環賽', icon: IconCycle },
  { key: 'finals', label: '複決賽', icon: IconTrophy },
  { key: 'standings', label: '小組排名', icon: IconList },
];

// 對戰成績：預賽時刻表 / 複賽樹狀圖 / 小組排名（積分表共用 GroupStandings）
export default function Results() {
  const [results, setResults] = useState([]);
  const [teams, setTeams] = useState([]);
  const [cfg, setCfg] = useState({ groups: [] });
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('prelim');

  useEffect(() => {
    const unsubResults = subscribeResults(
      (data) => {
        setResults(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
    const unsubTeams = subscribeTeams(setTeams, (err) => console.error(err));
    const unsubCfg = subscribeTournamentConfig(setCfg, (err) => console.error(err));
    // 訂閱各場地即時看板，供卡片合併即時比分（不依賴主檔是否已同步）
    const unsubLive = subscribeLiveMatches(setLiveMatches, (err) => console.error(err));
    return () => {
      unsubResults();
      unsubTeams();
      unsubCfg();
      unsubLive();
    };
  }, []);

  // 以 matchNo 對應正在計分的即時看板（status='live'）
  const liveByMatchNo = useMemo(() => {
    const map = {};
    liveMatches.forEach((lm) => {
      if (lm.matchNo && lm.status === 'live') map[lm.matchNo] = lm;
    });
    return map;
  }, [liveMatches]);

  // 主檔為底，若該場次正在某場地計分，則以即時看板比分覆蓋
  const mergeLive = useMemo(() => {
    return (r) => {
      const live = liveByMatchNo[r.matchNo];
      if (!live) return r;
      return {
        ...r,
        status: 'live',
        gameScore: live.gameScore ?? r.gameScore,
        setScores: Array.isArray(live.setScores) ? live.setScores : r.setScores,
        // 即時看板有帶入實際隊名時優先採用
        teams: Array.isArray(live.teams) && live.teams.some(Boolean) ? live.teams : r.teams,
      };
    };
  }, [liveByMatchNo]);

  // seed 標籤（A1、A冠…）→ 隊名：場次文件只存佔位標籤，顯示時由此反查
  const teamsBySeed = useMemo(() => teamNameBySeed(teams), [teams]);

  const prelim = useMemo(
    () => results
      .filter((r) => (r.round || 'prelim') === 'prelim')
      .map(mergeLive)
      .map((r) => resolveMatch(r, teamsBySeed)),
    [results, mergeLive, teamsBySeed],
  );
  const finals = useMemo(
    () => results
      .filter((r) => r.round === 'finals')
      .map(mergeLive)
      .map((r) => resolveMatch(r, teamsBySeed)),
    [results, mergeLive, teamsBySeed],
  );

  const groups = (cfg.groups || []).filter((g) => g.key && g.size > 0);

  return (
    <>
      {loading && <LoadingOverlay />}
      <TabbedMain id="resultsContainer" tabs={TABS} active={active} onChange={setActive}>
        {active === 'prelim' && (
          <div className="flex flex-col gap-5">
            {groups.length === 0 ? (
              /* 空狀態卡片：細邊框輕陰影 */
              <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-10 text-center text-gray-400">尚未設定分組。</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {groups.map((g) => (
                  <GroupMatchupChart
                    key={g.key}
                    groupKey={g.key}
                    size={g.size}
                    results={prelim}
                    teamsBySeed={teamsBySeed}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {active === 'finals' && <FinalsBracket matches={finals} />}
        {active === 'standings' && (
          <div className="flex flex-col gap-5">
            {groups.length === 0 ? (
              /* 空狀態卡片：細邊框輕陰影 */
              <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-10 text-center text-gray-400">尚未設定分組。</div>
            ) : (
              groups.map((g) => (
                <GroupStandings
                  key={g.key}
                  groupKey={g.key}
                  size={g.size}
                  results={prelim}
                  teamsBySeed={teamsBySeed}
                />
              ))
            )}
          </div>
        )}
      </TabbedMain>
    </>
  );
}
