import { useState } from 'react';
import { updateLiveMatch, upsertResult } from '../../services/firestore';
import { computeMatch, parseScore, isSetPoint, setTarget } from '../lib/volleyball';
import { propagateFinalsResult } from '../lib/propagateFinals';
import { btnPrimary } from './ui';

// ============================================================
// Scoreboard — 即時計分板（與場次主檔串聯）
// 場次由「預賽／複賽管理」點「開始計分」指派進來。
// +1/−1/重置 逐分操作目前這一局，分數同步寫回：
//   · liveMatches/{場地}  → 前台即時比分頁 + 人氣投票
//   · results/{matchNo}   → 前台賽程表 + 對戰成績
// 本局／全場勝負依排球規則自動判定。
// ============================================================
export default function Scoreboard({ match, teams = [], onFinished }) {
  const m = computeMatch(match.setScores);
  const [error, setError] = useState('');
  const [finishStatus, setFinishStatus] = useState('');

  const assigned = !!match.matchNo;
  const teamNames = [match.teams?.[0] || '隊伍 A', match.teams?.[1] || '隊伍 B'];

  // 將整份比分寫回 liveMatches 與（已指派時）results
  const writeSets = (arr) => {
    const next = computeMatch(arr);
    const payload = { set: arr.length, gameScore: next.gameScore, setScores: arr };
    const ops = [updateLiveMatch(match.id, { ...payload, status: 'live' })];
    if (match.matchNo) {
      ops.push(
        upsertResult(match.matchNo, {
          ...payload,
          status: 'live',
          field: match.field || match.id,
          teams: [match.teams?.[0] || '', match.teams?.[1] || ''],
        }),
      );
    }
    return Promise.all(ops).catch((err) => setError(err.message || '寫入失敗'));
  };

  const addPoint = (team, delta) => {
    setError('');
    const arr = [...m.raw];
    let [a, b] = parseScore(arr[m.curIdx]);
    if (team === 0) a = Math.max(0, a + delta);
    else b = Math.max(0, b + delta);
    arr[m.curIdx] = `${a}:${b}`;
    writeSets(arr);
  };

  const resetCurrentSet = () => {
    setError('');
    const arr = [...m.raw];
    arr[m.curIdx] = '0:0';
    writeSets(arr);
  };

  const advanceSet = () => {
    setError('');
    writeSets([...m.raw, '0:0']);
  };

  // 結束比賽：成績主檔標記完成，場地看板則釋出回「未開始」
  // （即時比分只有「未開始／比賽中」兩態，完成後該場地即空出可指派下一場）
  const finishMatch = async () => {
    setFinishStatus('');
    try {
      // results/{matchNo} 標記完成，保留比分與本場人氣投票最終票數供賽程／對戰成績頁顯示
      // （match.votes 為看板即時票數，來自公開投票，結算後一併寫入主檔）
      await upsertResult(match.matchNo, {
        status: 'done',
        votes: Array.isArray(match.votes) ? match.votes : [0, 0],
      });
      // 複賽：勝敗標籤（X勝／X敗）自動寫入兩隊 seed，後續場次由 seed 反查對戰隊伍
      if (m.matchWinner >= 0) {
        await propagateFinalsResult(
          match.matchNo,
          match.teams?.[m.matchWinner],
          match.teams?.[1 - m.matchWinner],
          teams,
        );
      }
      // liveMatches/{場地} 清空回未開始，前台即時比分該場地回到「未開始」
      await updateLiveMatch(match.id, {
        matchNo: '',
        teams: [],
        setScores: [],
        set: 1,
        gameScore: '0:0',
        votes: [0, 0],
        status: 'idle',
      });
      onFinished?.(); // 完成後返回賽程頁
    } catch (err) {
      setFinishStatus(`✗ ${err.message || '寫入失敗'}`);
    }
  };

  // 單側隊伍計分面板
  const TeamPanel = ({ team }) => {
    const points = team === 0 ? m.current.a : m.current.b;
    // 兩隊主色：深海軍藍 vs 輔助藍（純色、不用漸層），白字皆有足夠對比
    const accent = team === 0 ? 'bg-navy-800' : 'bg-court';
    const setPoint = isSetPoint(m.current.a, m.current.b, m.setNo, team);
    const isMatchPoint = setPoint && m.wins[team] === 1;
    return (
      <div className="flex-1 flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2 min-h-[1.75rem]">
          <span className="text-lg font-bold text-slate-800 truncate max-w-[10rem]">
            {teamNames[team]}
          </span>
          {setPoint && m.matchWinner < 0 && (
            <span className="text-[11px] font-semibold text-white bg-rose-500 rounded-full px-2 py-0.5">
              {isMatchPoint ? '賽末點' : '局末點'}
            </span>
          )}
        </div>

        <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl ${accent} text-white flex items-center justify-center shadow-sm`}>
          {/* 比分數字：運動字體、記分板感 */}
          <span className="font-display text-6xl font-black tabular-nums leading-none">{points}</span>
        </div>

        <button
          type="button"
          onClick={() => addPoint(team, 1)}
          className={`w-full max-w-[12rem] ${accent} hover:brightness-110 active:scale-[0.98] text-white text-xl font-bold py-4 rounded-xl shadow-sm transition-transform`}
        >
          ＋ 加 1 分
        </button>
        <button
          type="button"
          onClick={() => addPoint(team, -1)}
          className="w-full max-w-[12rem] border border-slate-300 text-slate-500 hover:bg-slate-50 text-sm py-2 rounded-xl"
        >
          − 減 1 分
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
      {/* 標題列 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 bg-navy-50 border-b border-navy-100 text-sm">
        <span className="font-bold text-slate-800">{match.field || match.id} 場地</span>
        {match.matchNo && <span className="text-slate-500">場次 {match.matchNo}</span>}
        {assigned && (
          <span className="ml-auto inline-flex items-center gap-2 text-slate-600">
            <span className="font-semibold text-navy-700">第 {m.setNo} 局</span>
            <span className="text-slate-300">·</span>
            <span>目標 {setTarget(m.setNo)} 分</span>
          </span>
        )}
      </div>

      {error && (
        <div className="mx-5 mt-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          {error}
        </div>
      )}

      {!assigned ? (
        // 未開始：場次由預賽／複賽管理的「開始計分」帶入
        <div className="p-6">
          <p className="text-slate-500 text-sm">
            此場地目前未開始。請至「預賽管理／複賽管理」點選場次，按「開始計分」進入。
          </p>
        </div>
      ) : (
        <>
          {/* 大比分 */}
          <div className="text-center pt-5">
            <p className="text-xs text-slate-400 tracking-widest">大比分（勝局）</p>
            <p className="font-display text-3xl font-bold text-navy-800 tabular-nums">
              {m.wins[0]} <span className="text-slate-300">:</span> {m.wins[1]}
            </p>
          </div>

          {/* 計分區 */}
          <div className="flex items-start gap-4 sm:gap-8 px-5 py-6">
            <TeamPanel team={0} />
            <div className="self-center text-2xl font-bold text-slate-300 pt-8">VS</div>
            <TeamPanel team={1} />
          </div>

          {/* 本局／全場狀態與動作 */}
          <div className="px-5 pb-5 flex flex-col gap-3">
            {m.matchWinner >= 0 ? (
              // 全場結束：深藍純色底 + 排球黃 CTA
              <div className="rounded-xl bg-navy-800 text-white p-4 text-center">
                <p className="font-bold text-lg">
                  <i className="fa-solid fa-trophy text-vbyellow-400 mr-1.5" aria-hidden="true"></i>
                  比賽結束 · {teamNames[m.matchWinner]} 勝（{m.gameScore}）
                </p>
                <button
                  type="button"
                  onClick={finishMatch}
                  className="mt-3 bg-vbyellow-400 text-navy-900 hover:bg-vbyellow-500 font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm"
                >
                  標記完成
                </button>
                {finishStatus && <p className="text-navy-200 text-sm mt-2">{finishStatus}</p>}
              </div>
            ) : m.canAdvance ? (
              // 本局結束提示：黃色高亮底
              <div className="rounded-xl bg-vbyellow-50 border border-vbyellow-200 p-4 text-center">
                <p className="text-slate-700 font-medium">
                  <i className="fa-solid fa-volleyball text-vbyellow-500 mr-1.5" aria-hidden="true"></i>
                  {teamNames[m.current.winner]} 贏得第 {m.setNo} 局（{m.current.a}:{m.current.b}）
                </p>
                <button type="button" onClick={advanceSet} className={`${btnPrimary} mt-3`}>
                  結束本局，進入第 {m.setNo + 1} 局
                </button>
              </div>
            ) : null}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetCurrentSet}
                className="text-sm text-slate-500 hover:text-navy-700 border border-navy-200 hover:border-navy-300 rounded-lg px-4 py-2"
              >
                重置本局
              </button>
            </div>
          </div>

          {/* 各局比分 */}
          {m.setInfos.length > 0 && (
            <div className="px-5 pb-5">
              <p className="text-xs text-slate-400 mb-2">各局比分</p>
              <div className="flex flex-wrap gap-2">
                {m.setInfos.map((s) => (
                  <span
                    key={s.setNo}
                    className={`text-sm rounded-lg px-3 py-1.5 border ${
                      s.won
                        ? 'bg-vbyellow-50 border-vbyellow-200 text-slate-700 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    第{s.setNo}局 {s.a}:{s.b}
                    {s.won && <span className="text-navy-700"> （{teamNames[s.winner]}勝）</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
