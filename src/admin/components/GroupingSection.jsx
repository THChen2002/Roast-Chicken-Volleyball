import { useEffect, useRef, useState } from 'react';
import {
  subscribeTeamsAdmin,
  subscribeTournamentConfig,
  DEFAULT_TOURNAMENT,
} from '../../services/firestore';
import SeedBoard from './SeedBoard';
import { ErrorBar } from './ui';

// ============================================================
// GroupingSection — 預賽分組區塊（嵌於「預賽分組與賽程」頁上方）
// 拖曳隊伍到各位置（A1…F4）；預賽賽程已產生，這裡僅負責調整分組。
// ============================================================
export default function GroupingSection() {
  const [teams, setTeams] = useState([]);
  const [cfg, setCfg] = useState(DEFAULT_TOURNAMENT);
  const [error, setError] = useState('');
  const cfgInit = useRef(false);

  useEffect(() => {
    const unsubTeams = subscribeTeamsAdmin(setTeams, (err) => setError(err.message));
    const unsubCfg = subscribeTournamentConfig((data) => {
      if (!cfgInit.current) {
        cfgInit.current = true;
        setCfg(data);
      }
    }, (err) => setError(err.message));
    return () => {
      unsubTeams();
      unsubCfg();
    };
  }, []);

  return (
    <>
      <ErrorBar message={error} />

      {/* 分組面板 */}
      <SeedBoard teams={teams} groups={cfg.groups} />
    </>
  );
}
