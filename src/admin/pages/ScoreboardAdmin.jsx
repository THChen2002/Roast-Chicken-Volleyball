import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  subscribeLiveMatchesAdmin,
  subscribeResultsAdmin,
  subscribeTeamsAdmin,
  subscribeCourts,
  createLiveMatch,
  updateLiveMatch,
  upsertResult,
} from '../../services/firestore';
import { teamNameBySeed, resolveTeams } from '../../lib/teamSeed';
import { courtRank } from '../../lib/courtOrder';
import Scoreboard from '../components/Scoreboard';
import { PageHeader, ErrorBar } from '../components/ui';

// 看板待命狀態（場地釋出）
const IDLE_BOARD = {
  matchNo: '',
  teams: [],
  setScores: [],
  set: 1,
  gameScore: '0:0',
  votes: [0, 0],
  status: 'idle',
};

// ============================================================
// ScoreboardAdmin — 編輯比分頁（/score/:matchNo）
// 從預賽／複賽管理點「開始計分」進入，場次資訊直接由該場帶入：
// · 進入頁面：場次主檔標記「比賽中」，並以該場資料建立場地即時看板（前台同步）
// · 離開頁面：場次未完成則恢復「未開始」，看板釋出回待命
// ============================================================
export default function ScoreboardAdmin() {
  const { matchNo } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null); // null = 載入中
  const [lives, setLives] = useState(null);
  const [teams, setTeams] = useState(null);
  const [configCourts, setConfigCourts] = useState([]); // 場地設定順序，供看板 index 排序
  const [error, setError] = useState('');
  const startedRef = useRef(false);

  useEffect(() => {
    const unsubResults = subscribeResultsAdmin(setResults, (err) => setError(err.message));
    const unsubLives = subscribeLiveMatchesAdmin(setLives, (err) => setError(err.message));
    const unsubTeams = subscribeTeamsAdmin(setTeams, (err) => setError(err.message));
    const unsubCourts = subscribeCourts(setConfigCourts, (err) => setError(err.message));
    return () => {
      unsubResults();
      unsubLives();
      unsubTeams();
      unsubCourts();
    };
  }, []);

  const row = (results || []).find((r) => r.matchNo === matchNo);
  const board = row?.field ? (lives || []).find((l) => l.id === row.field) : null;

  // seed 標籤（A1、A冠…）→ 隊名：場次主檔可能仍存佔位標籤，計分前先反查
  const nameBySeed = useMemo(() => teamNameBySeed(teams || []), [teams]);

  // 進入頁面：主檔標記比賽中 + 建立場地看板（帶入本場隊伍與已有比分，票數重新起算）
  useEffect(() => {
    if (startedRef.current || !results || !lives || !teams || !row?.field) return;
    startedRef.current = true;
    const setScores = Array.isArray(row.setScores) ? row.setScores : [];
    Promise.all([
      upsertResult(matchNo, { status: 'live' }),
      createLiveMatch(row.field, {
        index: courtRank(configCourts, row.field),
        matchNo,
        // 佔位標籤（A冠…）反查為實際隊名，計分與勝敗遞補才拿得到真隊名
        teams: resolveTeams([row.teams?.[0] || '', row.teams?.[1] || ''], nameBySeed),
        setScores,
        set: Math.max(1, setScores.length),
        gameScore: row.gameScore || '0:0',
        votes: [0, 0],
        status: 'live',
      }),
    ]).catch((err) => setError(err.message || '開始計分失敗'));
  }, [results, lives, teams, row, matchNo, nameBySeed, configCourts]);

  // 離開頁面：未完成的場次恢復「未開始」，看板釋出（以 refs 取離開當下的最新狀態）
  const rowRef = useRef(null);
  rowRef.current = row;
  const boardRef = useRef(null);
  boardRef.current = board;
  useEffect(
    () => () => {
      const r = rowRef.current;
      const b = boardRef.current;
      if (r && r.status === 'live') {
        upsertResult(r.matchNo, { status: 'scheduled' }).catch(() => {});
      }
      if (b && b.matchNo === matchNo) {
        updateLiveMatch(b.id, IDLE_BOARD).catch(() => {});
      }
    },
    [matchNo],
  );

  const back = () => navigate(-1);
  const ready = board && board.matchNo === matchNo;

  return (
    <>
      <PageHeader
        title={`編輯比分 · 場次 ${matchNo}`}
        desc={row ? `${row.field || '?'} 場地 · ${nameBySeed[row.teams?.[0]] || row.teams?.[0] || '?'} vs ${nameBySeed[row.teams?.[1]] || row.teams?.[1] || '?'}（離開此頁即恢復未開始）` : ''}
        action={
          <button
            type="button"
            onClick={back}
            className="text-sm text-slate-600 hover:text-navy-800 border border-navy-200 hover:border-navy-300 rounded-lg px-3 py-2 transition-colors"
          >
            ← 返回賽程
          </button>
        }
      />
      <ErrorBar message={error} />

      {!results || !lives || !teams ? (
        <p className="text-slate-400 text-sm">載入中…</p>
      ) : !row ? (
        <p className="text-slate-400 text-sm">找不到場次 {matchNo}，請回賽程頁重新選取。</p>
      ) : !row.field ? (
        <p className="text-slate-400 text-sm">此場次尚未設定場地，請先於賽程頁設定場地再開始計分。</p>
      ) : !ready ? (
        <p className="text-slate-400 text-sm">看板準備中…</p>
      ) : (
        <Scoreboard match={board} teams={teams} onFinished={back} />
      )}
    </>
  );
}
