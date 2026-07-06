import { useMemo } from 'react';

// ============================================================
// GroupStandings — 單組循環賽積分表（前台小組排名／後台循環賽排名共用）
// 以「位置標籤（seeds）」即時計算，不需先填隊名或後台重算。
// ============================================================

// 單場各局統計：回傳 [A勝局, B勝局, A得分, B得分]
export function tally(setScores) {
  let sa = 0;
  let sb = 0;
  let pa = 0;
  let pb = 0;
  (setScores || []).forEach((s) => {
    const [l, r] = String(s).split(':').map((n) => Number(n) || 0);
    if (l > r) sa += 1;
    else if (r > l) sb += 1;
    pa += l;
    pb += r;
  });
  return [sa, sb, pa, pb];
}

/** 依「位置標籤（seeds）」即時計算某組積分，回傳依名次排序的列（含 rank/seed） */
export function standingsForGroup(results, groupKey, size) {
  const positions = Array.from({ length: size }, (_, i) => `${groupKey}${i + 1}`);
  const stat = {};
  positions.forEach((p) => {
    stat[p] = { seed: p, winGames: 0, lossGames: 0, lossSets: 0, totalPoints: 0, pointsAgainst: 0 };
  });

  results.forEach((r) => {
    if ((r.round || 'prelim') !== 'prelim' || r.group !== groupKey) return;
    const [A, B] = r.seeds || r.teams || [];
    if (!stat[A] || !stat[B]) return;
    if (!Array.isArray(r.setScores) || r.setScores.length === 0) return; // 未打完不計
    const [sa, sb, pa, pb] = tally(r.setScores);
    const sA = stat[A];
    const sB = stat[B];
    if (sa > sb) {
      sA.winGames += 1;
      sB.lossGames += 1;
    } else if (sb > sa) {
      sB.winGames += 1;
      sA.lossGames += 1;
    }
    sA.lossSets += sb;
    sB.lossSets += sa;
    sA.totalPoints += pa;
    sA.pointsAgainst += pb;
    sB.totalPoints += pb;
    sB.pointsAgainst += pa;
  });

  const list = positions.map((p) => {
    const s = stat[p];
    s.pointRatio = s.pointsAgainst > 0 ? Number((s.totalPoints / s.pointsAgainst).toFixed(3)) : 0;
    s.played = s.winGames + s.lossGames;
    return s;
  });

  // 有人打過 → 依 勝場→失局少→得失分比 排；否則維持位置順序
  if (list.some((s) => s.played > 0)) {
    list.sort((x, y) => y.winGames - x.winGames || x.lossSets - y.lossSets || y.pointRatio - x.pointRatio);
  }
  list.forEach((s, i) => {
    s.rank = i + 1;
  });
  return list;
}

/**
 * 單組積分表：位置標籤即時累計，填入隊伍後顯示隊名。
 * @param {{ groupKey: string, size: number, results: object[], teamsBySeed: Record<string, string>, action?: import('react').ReactNode, manualOrder?: string[], onMove?: (seed: string, dir: 1|-1) => void }} props
 * action：顯示於卡片右上角的自訂操作（如後台的「結算排名」按鈕）
 * manualOrder／onMove：後台在同分無法自動判定（如三隊循環互咬）時，手動調整名次順序用；
 * 前台顯示不帶這兩個 prop，維持純自動計算排序。
 */
export default function GroupStandings({ groupKey, size, results, teamsBySeed, action, manualOrder, onMove }) {
  const computed = useMemo(() => standingsForGroup(results, groupKey, size), [results, groupKey, size]);

  const rows = useMemo(() => {
    if (!manualOrder || manualOrder.length !== computed.length) {
      return computed.map((s) => ({ ...s, name: teamsBySeed[s.seed] || s.seed }));
    }
    // 手動順序：沿用自動計算的各項數據，僅名次／排序依手動調整結果
    const bySeed = Object.fromEntries(computed.map((s) => [s.seed, s]));
    return manualOrder.map((seed, i) => ({ ...bySeed[seed], rank: i + 1, name: teamsBySeed[seed] || seed }));
  }, [computed, manualOrder, teamsBySeed]);

  return (
    <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-bold font-display tracking-wide text-navy-800">{groupKey} 組</h3>
        {action}
      </div>
      <div className="overflow-x-auto">
        {/* table-fixed + 固定欄寬：各組表格欄位對齊一致，隊伍欄吃剩餘寬度 */}
        <table className="w-full min-w-[560px] text-sm table-fixed">
          <thead>
            <tr className="text-navy-400 text-xs font-semibold tracking-wider text-left border-b-2 border-navy-100">
              <th className="px-2 py-2 w-10 text-center">#</th>
              <th className="px-2 py-2 w-[26%]">隊伍</th>
              <th className="px-2 py-2 w-[10%] text-center">場次</th>
              <th className="px-2 py-2 w-[10%] text-center">勝</th>
              <th className="px-2 py-2 w-[10%] text-center">負</th>
              <th className="px-2 py-2 w-[10%] text-center">失局</th>
              <th className="px-2 py-2 w-[10%] text-center">得分</th>
              <th className="px-2 py-2 w-[10%] text-center">失分</th>
              <th className="px-2 py-2 w-[10%] text-center text-navy-500">得失比</th>
              {onMove && <th className="px-2 py-2 w-16 text-center">調整</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
                <tr key={r.seed} className={`border-b border-gray-50 ${r.rank <= 2 ? 'bg-vbyellow-50/70' : ''}`}>
                  <td className="px-2 py-2 text-center font-bold text-navy-700 relative">
                    {r.rank <= 2 && <span className="absolute left-0 top-1 bottom-1 w-1 rounded bg-vbyellow-400" />}
                    {r.rank}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-700 truncate">{r.name}</td>
                  <td className="px-2 py-2 text-center text-gray-600 tabular-nums">{r.played}</td>
                  <td className="px-2 py-2 text-center text-gray-600 tabular-nums">{r.winGames}</td>
                  <td className="px-2 py-2 text-center text-gray-600 tabular-nums">{r.lossGames}</td>
                  <td className="px-2 py-2 text-center text-gray-600 tabular-nums">{r.lossSets}</td>
                  <td className="px-2 py-2 text-center text-gray-600 tabular-nums">{r.totalPoints}</td>
                  <td className="px-2 py-2 text-center text-gray-600 tabular-nums">{r.pointsAgainst}</td>
                  <td className="px-2 py-2 text-center font-semibold text-gray-700 tabular-nums">{r.pointRatio.toFixed(3)}</td>
                  {onMove && (
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onMove(r.seed, -1)}
                          disabled={r.rank === 1}
                          title="上移一名"
                          aria-label={`${r.name} 上移一名`}
                          className="w-6 h-6 flex items-center justify-center rounded border border-navy-100 text-navy-500 hover:border-navy-300 hover:text-navy-800 disabled:opacity-30 disabled:hover:border-navy-100 disabled:hover:text-navy-500 transition-colors"
                        >
                          <i className="fa-solid fa-chevron-up text-[10px]" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => onMove(r.seed, 1)}
                          disabled={r.rank === rows.length}
                          title="下移一名"
                          aria-label={`${r.name} 下移一名`}
                          className="w-6 h-6 flex items-center justify-center rounded border border-navy-100 text-navy-500 hover:border-navy-300 hover:text-navy-800 disabled:opacity-30 disabled:hover:border-navy-100 disabled:hover:text-navy-500 transition-colors"
                        >
                          <i className="fa-solid fa-chevron-down text-[10px]" aria-hidden="true"></i>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
