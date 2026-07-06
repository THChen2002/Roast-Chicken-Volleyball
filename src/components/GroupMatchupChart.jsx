import { useMemo } from 'react';
import { tally } from './GroupStandings';

// ============================================================
// GroupMatchupChart — 單組循環賽對戰圖（頂點＝隊伍，連線＝兩隊對戰比分）
// 依組內隊數自動排成正多邊形（3 隊＝三角形、4 隊＝四邊形…），
// 每兩隊連一線（完全圖），取代原本以時間×場地表格呈現對戰成績。
// ============================================================

const VB = 360; // svg viewBox 邊長（含各局小分後徽章變大，加大版面避免擁擠）
const CENTER = VB / 2;
const RADIUS = 120;
const LABEL_RADIUS = RADIUS + 52; // 隊名標籤環（頂點外側）
const NUDGE = 28; // 一般邊線：比分徽章偏離連線中點的距離
const CENTRAL_OFFSET = 46; // 對角線（通過圖心）：徽章沿線本身方向偏移的距離，避免兩條對角線疊在一起

const LINE_IDLE = '#E2E9F2'; // navy-100：尚未開打
const LINE_DONE = '#9DB3CC'; // navy-300：已完成
const LINE_LIVE = '#EF4444'; // red-500：進行中
const DOT_FILL = '#12263F'; // navy-800：頂點圓點

function vertexPos(i, n) {
  const even = n % 2 === 0;
  // 偶數邊（如四邊形）將起始角度偏移半格，讓「一邊」置頂、呈正方形（而非菱形），維持順時針排列（1、2 在上排已符合直覺）；
  // 奇數邊（如三角形）頂點置頂、改逆時針排列，讓「2」落在左下、「3」落在右下，由左到右符合編號順序。
  const offset = even ? Math.PI / n : 0;
  const dir = even ? 1 : -1;
  const angle = -Math.PI / 2 - offset + dir * ((2 * Math.PI * i) / n);
  return { x: CENTER + RADIUS * Math.cos(angle), y: CENTER + RADIUS * Math.sin(angle) };
}

function pct(v) {
  return `${(v / VB) * 100}%`;
}

export default function GroupMatchupChart({ groupKey, size, results, teamsBySeed }) {
  const positions = useMemo(
    () => Array.from({ length: size }, (_, i) => `${groupKey}${i + 1}`),
    [groupKey, size],
  );

  // 位置標籤（如 A1、A2）→ 該場對戰紀錄
  const matchByPair = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      if ((r.round || 'prelim') !== 'prelim' || r.group !== groupKey) return;
      const [a, b] = r.seeds || r.teams || [];
      if (!a || !b) return;
      map[[a, b].sort().join('|')] = r;
    });
    return map;
  }, [results, groupKey]);

  const verts = useMemo(
    () => positions.map((seed, i) => ({ seed, name: teamsBySeed[seed] || seed, ...vertexPos(i, size) })),
    [positions, size, teamsBySeed],
  );

  // 每兩隊一條邊；對角線（會通過圖心）以交錯方向偏移比分徽章，避免重疊
  const edges = useMemo(() => {
    let centralCount = 0;
    const list = [];
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) {
        const a = verts[i];
        const b = verts[j];
        const m = matchByPair[[a.seed, b.seed].sort().join('|')];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const centerOffset = (CENTER - mx) * nx + (CENTER - my) * ny;
        let labelX;
        let labelY;
        if (Math.abs(centerOffset) < 1) {
          // 邊線本身通過圖心（如四邊形對角線）：沿線本身方向交錯偏移（而非垂直偏移），
          // 兩條對角線方向不同，才能確實把徽章拉開、不疊在圖心
          const ux = dx / len;
          const uy = dy / len;
          const sign = centralCount % 2 === 0 ? 1 : -1;
          centralCount += 1;
          labelX = mx + ux * CENTRAL_OFFSET * sign;
          labelY = my + uy * CENTRAL_OFFSET * sign;
        } else {
          // 一般邊線：往遠離圖心的方向偏移，貼近邊線外側
          const sign = -Math.sign(centerOffset);
          labelX = mx + nx * NUDGE * sign;
          labelY = my + ny * NUDGE * sign;
        }

        list.push({ a, b, m, labelX, labelY });
      }
    }
    return list;
  }, [verts, matchByPair]);

  return (
    <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-4 sm:p-5">
      <h3 className="text-lg font-bold font-display tracking-wide text-navy-800 mb-4">{groupKey} 組</h3>
      <div className="relative w-full max-w-md mx-auto aspect-square">
        <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 w-full h-full overflow-visible">
          {edges.map((e, idx) => (
            <EdgeLine key={idx} edge={e} />
          ))}
          {verts.map((v) => (
            <circle key={v.seed} cx={v.x} cy={v.y} r="4" fill={DOT_FILL} />
          ))}
        </svg>
        {verts.map((v) => (
          <VertexLabel key={v.seed} v={v} />
        ))}
        {edges.map((e, idx) => (
          <EdgeBadge key={idx} edge={e} />
        ))}
      </div>
    </div>
  );
}

function VertexLabel({ v }) {
  const angle = Math.atan2(v.y - CENTER, v.x - CENTER);
  const lx = CENTER + LABEL_RADIUS * Math.cos(angle);
  const ly = CENTER + LABEL_RADIUS * Math.sin(angle);
  return (
    <div
      className="absolute w-24 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
      style={{ left: pct(lx), top: pct(ly) }}
    >
      <div className="text-[10px] text-navy-400 tabular-nums leading-tight">{v.seed}</div>
      <div className="text-xs font-bold text-navy-800 leading-tight truncate">{v.name}</div>
    </div>
  );
}

function EdgeLine({ edge }) {
  const { a, b, m } = edge;
  const sets = Array.isArray(m?.setScores) ? m.setScores : [];
  const live = m?.status === 'live';
  const played = sets.length > 0;
  if (!m || (!played && !live)) {
    return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={LINE_IDLE} strokeWidth="1.5" strokeDasharray="4 4" />;
  }
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={live ? LINE_LIVE : LINE_DONE} strokeWidth="2.5" />;
}

function EdgeBadge({ edge }) {
  const { a, b, m, labelX, labelY } = edge;
  if (!m) return null;
  const sets = Array.isArray(m.setScores) ? m.setScores : [];
  const live = m.status === 'live';
  const played = sets.length > 0;
  if (!played && !live) return null;

  const [rawA] = m.seeds || m.teams || [];
  const [tA, tB] = tally(sets);
  const aIsRawA = a.seed === rawA;
  const scoreA = aIsRawA ? tA : tB;
  const scoreB = aIsRawA ? tB : tA;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
      style={{ left: pct(labelX), top: pct(labelY) }}
    >
      <div
        className="flex items-center gap-0.5 rounded-full border bg-white px-1.5 py-0.5 text-[11px] font-bold tabular-nums shadow-sm"
        style={{ borderColor: live ? LINE_LIVE : LINE_DONE }}
      >
        {live && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
        <span className={scoreA > scoreB ? 'text-navy-800' : 'text-gray-400'}>{scoreA}</span>
        <span className="text-gray-300">:</span>
        <span className={scoreB > scoreA ? 'text-navy-800' : 'text-gray-400'}>{scoreB}</span>
      </div>
      {/* 各局比分：依 a/b 頂點順序顯示，進行中的當前局標紅 */}
      {sets.length > 0 && (
        <div className="flex items-center gap-1 whitespace-nowrap">
          {sets.map((s, i) => {
            const [l, r] = String(s).split(':').map((n) => Number(n) || 0);
            const [setA, setB] = aIsRawA ? [l, r] : [r, l];
            const isCurrent = live && i === sets.length - 1;
            return (
              <span
                key={i}
                className={`text-[9px] leading-none tabular-nums rounded px-1 py-0.5 ${
                  isCurrent ? 'bg-red-50 text-red-600 font-semibold' : 'bg-navy-50 text-navy-500'
                }`}
              >
                {setA}:{setB}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
