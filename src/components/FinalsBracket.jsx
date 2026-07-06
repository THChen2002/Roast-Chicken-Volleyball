import { useMemo, useLayoutEffect, useRef, useState } from 'react';
import { slotPair } from '../lib/matchSlots';

// ============================================================
// FinalsBracket — 複賽雙敗淘汰樹狀圖（世界盃風格 + 直角括號連接線）
// 勝部 / 敗部：依晉級樹絕對定位（上下游對齊）+ SVG 直角括號連接線。
// 四強：不畫線。從勝部掉下來的輸入畫虛線短樁。
// 連接線不寫死：由資料庫場次範本的 X勝／X敗 標籤推導（見 deriveConnections）。
// ============================================================

// 版面常數
const CARD_W = 208; // 13rem
const COL_STEP = CARD_W + 96;
const ROW_UNIT = 128;
const LABEL_H = 34;
const LINE = '#C5D3E4'; // navy-200
const TAG = { 48: '冠軍戰', 49: '季軍戰' };

// ---- 勝部 ----
// 修改：第一輪列序依實際晉級配對排列（36←25,26、37←27,28、38←29,30），連線才不交叉
const WINNER_LABELS = ['第一輪', '準決賽'];
const WINNER_LAYOUT = {
  25: { col: 0, row: 0 }, 26: { col: 0, row: 1 }, 27: { col: 0, row: 2 },
  28: { col: 0, row: 3 }, 29: { col: 0, row: 4 }, 30: { col: 0, row: 5 },
  36: { col: 1, row: 0.5 }, 37: { col: 1, row: 2.5 }, 38: { col: 1, row: 4.5 },
};

// ---- 敗部 ----
const LOSER_LABELS = ['資格賽', '第一輪', '第二輪', '半準決賽', '敗部決賽'];
const LOSER_LAYOUT = {
  22: { col: 0, row: 0 }, 23: { col: 0, row: 1 }, 24: { col: 0, row: 2 },
  31: { col: 1, row: 0 }, 32: { col: 1, row: 1 }, 33: { col: 1, row: 2 }, 34: { col: 1, row: 3 }, 35: { col: 1, row: 4 },
  39: { col: 2, row: 0 }, 40: { col: 2, row: 1 }, 41: { col: 2, row: 2 }, 42: { col: 2, row: 3.5 },
  43: { col: 3, row: 0.5 }, 44: { col: 3, row: 2.75 },
  45: { col: 4, row: 1.625 },
};

// X勝／X敗 佔位標籤（來源場次編號 + 勝敗）
const SLOT_REF = /^(\d+)(勝|敗)$/;

/**
 * 依資料庫場次範本推導區內連接線。
 * 來源場次在同一區 → 實線晉級線；來自其他區（勝部掉入敗部）→ 虛線短樁；
 * 組別名次標籤（A冠、F季…）不畫線。
 * @param {Record<string, {col: number, row: number}>} layout 區內場次版面
 * @returns {{edges: {from: string, to: string}[], drops: {to: string, input: number}[]}}
 */
function deriveConnections(layout) {
  const inSection = new Set(Object.keys(layout));
  const edges = [];
  const drops = [];
  Object.keys(layout).forEach((no) => {
    (slotPair(no) || []).forEach((slot, input) => {
      const ref = SLOT_REF.exec(slot);
      if (!ref) return;
      if (inSection.has(ref[1])) edges.push({ from: ref[1], to: no });
      else drops.push({ to: no, input });
    });
  });
  return { edges, drops };
}

const WINNER_CONN = deriveConnections(WINNER_LAYOUT);
const LOSER_CONN = deriveConnections(LOSER_LAYOUT);

const SEMIS = {
  title: '四強',
  columns: [
    { label: '四強', nos: ['46', '47'] },
    { label: '冠 / 季軍戰', nos: ['48', '49'] },
  ],
};

function parseGame(s) {
  const [a, b] = String(s || '0:0').split(':').map((n) => Number(n) || 0);
  return [a, b];
}

// 直角括號路徑：a(右緣中心) → b(左緣中心)，同高走水平直線，否則水平→垂直→水平（直角轉折）
function elbow(ax, ay, bx, by) {
  if (Math.abs(ay - by) < 1) return `M ${ax} ${ay} H ${bx}`;
  const mx = (ax + bx) / 2;
  return `M ${ax} ${ay} H ${mx} V ${by} H ${bx}`;
}

// 單場對戰卡（世界盃樣式：兩列隊伍 + 各局小分 + 大比分，勝方粗體 + 晉級箭頭）
function MatchCard({ m, no, onClick }) {
  if (!m) {
    return (
      <div className="w-52 rounded-xl border border-dashed border-navy-200 bg-white px-3 py-3 text-center text-gray-300 text-sm">
        場次 {no}
      </div>
    );
  }
  const [ga, gb] = parseGame(m.gameScore);
  const sets = (Array.isArray(m.setScores) ? m.setScores : []).map(parseGame); // 各局 [左, 右]
  const played = sets.length > 0 || ga + gb > 0;
  const live = m.status === 'live';
  const winner = played && !live ? (ga > gb ? 0 : gb > ga ? 1 : -1) : -1;
  const Row = ({ i }) => (
    <div className={`relative flex items-center gap-1.5 px-3 py-1.5 ${winner === i ? 'font-bold text-navy-900 bg-vbyellow-50' : 'text-gray-600'}`}>
      <span className="truncate flex-1 min-w-0">{m.teams?.[i] || '待定'}</span>
      {/* 各局小分：依局排欄，該局贏方深色；進行中的當前局標紅 */}
      {sets.map(([l, r], si) => {
        const mine = i === 0 ? l : r;
        const theirs = i === 0 ? r : l;
        const isCurrent = live && si === sets.length - 1;
        return (
          <span
            key={si}
            className={`tabular-nums text-[11px] w-[18px] text-center shrink-0 font-normal ${
              isCurrent ? 'text-red-500 font-semibold' : mine > theirs ? 'text-navy-800 font-semibold' : 'text-gray-400'
            }`}
          >
            {mine}
          </span>
        );
      })}
      {/* 大比分（勝局數）：最右側，加分隔線強調 */}
      {played && (
        <span className={`tabular-nums text-sm font-bold shrink-0 w-6 text-center border-l pl-1.5 ${live ? 'text-red-500 border-red-100' : 'text-navy-900 border-navy-100'}`}>
          {i === 0 ? ga : gb}
        </span>
      )}
      {winner === i && <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-navy-400 text-xs"><i className="fa-solid fa-caret-left" aria-hidden="true"></i></span>}
    </div>
  );
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick ? () => onClick(m) : undefined}
      className={`w-52 rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden text-left ${onClick ? 'hover:border-navy-300 transition-colors' : ''}`}
    >
      <div className="flex items-center justify-between px-3 py-1 bg-navy-50 text-[11px] text-navy-600">
        <span className="font-semibold flex items-center gap-1">
          場次 {m.matchNo}{TAG[m.matchNo] ? ` · ${TAG[m.matchNo]}` : ''}
          {live && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
        </span>
        {(m.time || m.field) && (
          <span className="text-gray-400">
            {m.time}
            {m.time && m.field && '・'}
            {m.field && `${m.field}場`}
          </span>
        )}
      </div>
      <Row i={0} />
      <div className="border-t border-navy-50" />
      <Row i={1} />
    </Tag>
  );
}

// 通用 SVG 樹狀圖：依 layout 絕對定位 + 圓角括號連接線
function SvgBracket({ labels, layout, edges, drops = [], byNo, onMatchClick }) {
  const nos = Object.keys(layout);
  const cols = labels.length;
  const maxRow = Math.max(...nos.map((no) => layout[no].row));
  const contRef = useRef(null);
  const cardRefs = useRef({});
  const [conn, setConn] = useState({ e: [], d: [] });
  const totalW = (cols - 1) * COL_STEP + CARD_W;
  const totalH = LABEL_H + maxRow * ROW_UNIT + 110;

  useLayoutEffect(() => {
    const measure = () => {
      const pos = {};
      nos.forEach((no) => {
        const el = cardRefs.current[no];
        const { col, row } = layout[no];
        const left = col * COL_STEP;
        const top = LABEL_H + row * ROW_UNIT;
        const h = el ? el.getBoundingClientRect().height : 88;
        const header = 26;
        const rowH = Math.max(0, h - header);
        pos[no] = { left, right: left + CARD_W, cy: top + h / 2, inY: [top + header + rowH * 0.25, top + header + rowH * 0.75] };
      });
      const e = [];
      edges.forEach((ed) => {
        const a = pos[ed.from];
        const b = pos[ed.to];
        if (a && b) e.push(elbow(a.right, a.cy, b.left, b.cy));
      });
      const d = [];
      drops.forEach((dr) => {
        const b = pos[dr.to];
        if (b) d.push(`M ${b.left - 18} ${b.inY[dr.input]} H ${b.left}`);
      });
      setConn({ e, d });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (contRef.current) ro.observe(contRef.current);
    return () => ro.disconnect();
  }, [byNo]);

  return (
    <div className="overflow-x-auto pb-2">
      <div ref={contRef} className="relative" style={{ width: totalW, height: totalH }}>
        {labels.map((label, ci) => (
          <div key={ci} className="absolute text-xs font-semibold text-navy-500 tracking-widest text-center" style={{ left: ci * COL_STEP, top: 0, width: CARD_W }}>
            {label}
          </div>
        ))}
        <svg className="absolute top-0 left-0 pointer-events-none" width={totalW} height={totalH}>
          {conn.e.map((p, i) => (
            <path key={`e${i}`} d={p} fill="none" stroke={LINE} strokeWidth="1.5" strokeLinejoin="miter" />
          ))}
          {conn.d.map((p, i) => (
            <path key={`d${i}`} d={p} fill="none" stroke={LINE} strokeWidth="1.5" strokeDasharray="3 3" />
          ))}
        </svg>
        {nos.map((no) => {
          const { col, row } = layout[no];
          return (
            <div key={no} ref={(el) => { cardRefs.current[no] = el; }} className="absolute" style={{ left: col * COL_STEP, top: LABEL_H + row * ROW_UNIT }}>
              <MatchCard m={byNo[no]} no={no} onClick={onMatchClick} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 四強：純欄位（不畫線），保留間隔
function PlainColumns({ section, byNo, onMatchClick }) {
  return (
    <div className="flex gap-12 overflow-x-auto pb-2 items-stretch">
      {section.columns.map((col, ci) => (
        <div key={ci} className="flex flex-col flex-shrink-0" style={{ minWidth: '13rem' }}>
          <div className="text-xs font-semibold text-navy-500 tracking-widest text-center mb-3">{col.label}</div>
          <div className="flex flex-col justify-around flex-1 gap-4">
            {col.nos.map((no) => (
              <MatchCard key={no} no={no} m={byNo[no]} onClick={onMatchClick} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketSection({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-4 sm:p-5">
      <h3 className="text-lg font-bold font-display tracking-wide text-navy-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function FinalsBracket({ matches, onMatchClick }) {
  const byNo = useMemo(() => {
    const map = {};
    matches.forEach((m) => {
      map[m.matchNo] = m;
    });
    return map;
  }, [matches]);

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-10 text-center text-gray-400">
        複賽尚未開始。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BracketSection title="勝部">
        <SvgBracket labels={WINNER_LABELS} layout={WINNER_LAYOUT} edges={WINNER_CONN.edges} drops={WINNER_CONN.drops} byNo={byNo} onMatchClick={onMatchClick} />
      </BracketSection>
      <BracketSection title="敗部">
        <SvgBracket labels={LOSER_LABELS} layout={LOSER_LAYOUT} edges={LOSER_CONN.edges} drops={LOSER_CONN.drops} byNo={byNo} onMatchClick={onMatchClick} />
      </BracketSection>
      <BracketSection title={SEMIS.title}>
        <PlainColumns section={SEMIS} byNo={byNo} onMatchClick={onMatchClick} />
      </BracketSection>
    </div>
  );
}
