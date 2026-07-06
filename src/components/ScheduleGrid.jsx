import { useMemo } from 'react';
import { slotPairOf, isSlotResolved } from '../lib/matchSlots';
import { courtRank } from '../lib/courtOrder';

// 時間 × 場地時刻表。
// showScores：顯示大比分與各局比分（對戰成績頁用）
// showSlots：以小字顯示原始對戰位置標籤（A1 vs A2、A冠 vs B亞…，賽程表頁用）
// courtOrder：後台「場地管理」設定的場地順序（見 src/lib/courtOrder.js）
export default function ScheduleGrid({ matches, courtOrder = [], showScores = true, showSlots = false }) {
  const scheduled = useMemo(() => matches.filter((m) => m.time && m.field), [matches]);

  const courts = useMemo(() => {
    const set = new Set();
    scheduled.forEach((m) => set.add(m.field));
    return [...set].sort(
      (a, b) => courtRank(courtOrder, a) - courtRank(courtOrder, b) || a.localeCompare(b),
    );
  }, [scheduled, courtOrder]);

  const times = useMemo(() => {
    const set = new Set();
    scheduled.forEach((m) => set.add(m.time));
    return [...set].sort();
  }, [scheduled]);

  const grid = useMemo(() => {
    const map = {};
    scheduled.forEach((m) => {
      map[`${m.time}|${m.field}`] = m;
    });
    return map;
  }, [scheduled]);

  // 每個場地欄位需要保留足夠寬度容納完整隊名（不換行、不縮字），
  // 寬度不夠時交給外層 overflow-x-auto 左右滑動，而非把字擠壓截斷
  const COURT_MIN_WIDTH = 280; // px
  const TIME_COL_WIDTH = 80; // px
  const tableMinWidth = Math.max(640, courts.length * COURT_MIN_WIDTH + TIME_COL_WIDTH);

  if (scheduled.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-10 text-center text-gray-400">
        賽程尚未公布，敬請期待。
      </div>
    );
  }

  const Cell = ({ m }) => {
    const live = m.status === 'live';
    const sets = Array.isArray(m.setScores) ? m.setScores : [];
    const bigScore = m.gameScore || '0:0';
    const hasScore = bigScore !== '0:0' || sets.length > 0;
    // 隊名尚未確定時，大字以原始位置標籤呈現（如 A季、27勝）
    const pair = slotPairOf(m);
    // 小標籤僅在兩隊皆已由實際隊名取代後顯示，避免與大字標籤重複
    const slots = showSlots && pair && isSlotResolved(m) ? `${pair[0]} vs ${pair[1]}` : '';
    return (
      <div className="relative h-full flex flex-col justify-center rounded-xl border border-navy-100 bg-navy-50/40 px-3 py-2 text-center">
        {/* 大比分（勝局）固定在卡片右上角（僅對戰成績頁顯示） */}
        {showScores && (hasScore || live) && (
          <span className={`absolute top-1.5 right-1.5 text-xs font-bold rounded-full px-2 py-0.5 tabular-nums ${live ? 'bg-red-500 text-white' : 'bg-vbyellow-400 text-navy-900'}`}>
            {bigScore}
          </span>
        )}
        <div className="text-[11px] text-navy-600 font-semibold mb-0.5 flex items-center justify-center gap-1">
          場次 {m.matchNo}{m.group ? `・${m.group} 組` : ''}
          {live && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
          {live && <span className="text-[10px] text-red-500 font-normal">第 {sets.length || 1} 局</span>}
        </div>
        {/* 修改：以 vs 為中心對齊（左右隊名各佔等寬欄位），避免隊名長短不一造成 vs 偏移 */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-gray-700">
          <span className="truncate text-right">{m.teams?.[0] || pair?.[0] || '?'}</span>
          <span className="text-gray-300">vs</span>
          <span className="truncate text-left">{m.teams?.[1] || pair?.[1] || '?'}</span>
        </div>
        {/* 原始對戰位置標籤（A1 vs A2、A冠 vs B亞…）：小字呈現（僅賽程表頁顯示） */}
        {slots && (
          <div className="mt-0.5 text-[10px] text-navy-400 tabular-nums">{slots}</div>
        )}
        {/* 各局比分（進行中的當前局以紅色標示，僅對戰成績頁顯示）；沒有比分的卡片不佔高度 */}
        {showScores && sets.length > 0 && (
          <div className="mt-1 h-5 flex items-center justify-center gap-1.5">
            {sets.map((s, i) => (
              <span
                key={i}
                className={`text-[11px] leading-none tabular-nums rounded px-1.5 py-0.5 ${
                  live && i === sets.length - 1 ? 'bg-red-50 text-red-600 font-semibold' : 'bg-navy-50 text-navy-600'
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    // 外層卡片：白底 + navy 邊框 + 輕陰影
    <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-4 sm:p-6 overflow-x-auto">
      {/* table-fixed + 場地欄平均寬（各欄有最小寬度保底）：live 與非 live 的格子寬度一致 */}
      <table
        className="w-full text-sm border-collapse table-fixed"
        style={{ minWidth: `${tableMinWidth}px` }}
      >
        <thead>
          {/* 表頭：輕盈簡約風（小型灰藍字 + 細底線），與積分表一致 */}
          <tr className="text-navy-400 text-xs font-semibold tracking-wider">
            <th
              className="px-3 py-2.5 text-left border-b-2 border-navy-100"
              style={{ width: `${TIME_COL_WIDTH}px` }}
            >
              時間
            </th>
            {courts.map((c) => (
              <th
                key={c}
                className="px-3 py-2.5 text-center border-b-2 border-navy-100"
                style={{ width: `${100 / courts.length}%`, minWidth: `${COURT_MIN_WIDTH}px` }}
              >
                {c} 場
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((t) => (
            <tr key={t} className="border-b border-navy-50">
              <td className="px-3 py-2 font-semibold text-navy-600 tabular-nums align-top">{t}</td>
              {courts.map((c) => {
                const m = grid[`${t}|${c}`];
                // h-px 讓卡片能以 h-full 撐滿列高，同列卡片等高
                return (
                  <td key={c} className="px-2 py-1.5 align-top h-px">
                    {m ? <Cell m={m} /> : <div className="text-center text-gray-200">—</div>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
