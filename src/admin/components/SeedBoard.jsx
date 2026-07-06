import { useRef, useState } from 'react';
import { updateTeam, resyncPrelimResults } from '../../services/firestore';
import { prelimSeedOf, seedList, normalizeSeedTags, PRELIM_SEED_RE } from '../../lib/teamSeed';
import { Card } from './ui';

// 組出新 seed 陣列：替換「預賽位置」標籤後修剪依附鏈
// （換組或拖回未分組時，失去依附的名次／勝敗標籤自動移除）
const buildSeed = (team, slot) =>
  normalizeSeedTags([slot, ...seedList(team).filter((l) => !PRELIM_SEED_RE.test(l))]);

// ============================================================
// SeedBoard — 預賽分組面板（固定位置）
// 把隊伍拖到各組的 A1、A2…F4 位置；賽程位置固定，只換位置上的隊伍。
// 拖到已佔用的位置＝兩隊互換；拖回「未分組」＝取消。
// ============================================================
export default function SeedBoard({ teams, groups = [] }) {
  const dragRef = useRef(null); // team.id
  const [over, setOver] = useState(null);
  const [error, setError] = useState('');

  const bySeed = {};
  teams.forEach((t) => {
    const slot = prelimSeedOf(t);
    if (slot) bySeed[slot] = t;
  });
  const pool = teams.filter((t) => !prelimSeedOf(t));

  const onDragStart = (t) => (e) => {
    dragRef.current = t.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', t.id);
  };

  // 指派到某位置（seedKey=''代表拖回未分組）
  const assign = async (seedKey) => {
    const id = dragRef.current;
    dragRef.current = null;
    setOver(null);
    if (!id) return;
    const t = teams.find((x) => x.id === id);
    if (!t || prelimSeedOf(t) === seedKey) return;
    const group = seedKey ? seedKey[0] : '';
    const occupant = seedKey ? bySeed[seedKey] : null;
    try {
      await updateTeam(id, { seed: buildSeed(t, seedKey), group });
      if (occupant && occupant.id !== id) {
        const old = prelimSeedOf(t); // 佔用者換到被拖隊伍的舊位置（可能回未分組）
        await updateTeam(occupant.id, { seed: buildSeed(occupant, old), group: old ? old[0] : '' });
      }
      // 已產生的預賽場次即時把該位置替換成隊名
      await resyncPrelimResults();
    } catch (err) {
      setError(err.message || '更新失敗');
    }
  };

  const dropProps = (key) => ({
    onDragOver: (e) => {
      e.preventDefault();
      if (over !== key) setOver(key);
    },
    onDragLeave: () => setOver((k) => (k === key ? null : k)),
    onDrop: (e) => {
      e.preventDefault();
      assign(key);
    },
  });

  const TeamChip = ({ t }) => (
    <div
      draggable
      onDragStart={onDragStart(t)}
      className="rounded-lg border border-navy-100 bg-navy-50 px-2.5 py-1.5 cursor-grab active:cursor-grabbing hover:border-navy-300"
    >
      <div className="font-medium text-slate-700 text-sm leading-tight">{t.team}</div>
      {t.department && <div className="text-[11px] text-slate-400">{t.department}</div>}
    </div>
  );

  const Slot = ({ seedKey }) => {
    const t = bySeed[seedKey];
    const active = over === seedKey;
    return (
      <div
        {...dropProps(seedKey)}
        className={`rounded-lg border px-2 py-1.5 min-h-[2.5rem] flex items-center gap-2 transition-colors ${
          active ? 'border-vbyellow-400 bg-vbyellow-50' : 'border-navy-100 bg-white'
        }`}
      >
        <span className="text-[11px] text-navy-600 font-semibold w-7 shrink-0">{seedKey}</span>
        {t ? (
          <span
            draggable
            onDragStart={onDragStart(t)}
            className="flex-1 min-w-0 truncate font-medium text-slate-700 text-sm cursor-grab active:cursor-grabbing"
          >
            {t.team}
          </span>
        ) : (
          <span className="flex-1 text-slate-300 text-xs">拖曳至此</span>
        )}
      </div>
    );
  };

  return (
    <Card className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-semibold text-navy-800 font-display tracking-wide">預賽分組（固定賽程位置）</h2>
        <span className="text-xs text-slate-400">把隊伍拖到 A1、A2…F4 各位置；賽程順序依賽程表固定</span>
      </div>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      <div className="flex gap-3 pb-2">
        {/* 未分組 */}
        <div {...dropProps('')} className={`flex-shrink-0 w-40 rounded-xl border p-2 ${over === '' ? 'border-vbyellow-400 bg-vbyellow-50' : 'border-navy-100 bg-white'}`}>
          <div className="text-sm font-semibold text-slate-500 mb-2 px-1">未分組（{pool.length}）</div>
          <div className="flex flex-col gap-1.5 min-h-[3rem]">
            {pool.map((t) => (
              <TeamChip key={t.id} t={t} />
            ))}
            {pool.length === 0 && <div className="text-center text-slate-300 text-xs py-2">（全部已排定）</div>}
          </div>
        </div>

        <div className="w-px bg-navy-100 flex-shrink-0" />

        {/* 各組位置（依設定）：自動換行 grid，全部同畫面顯示、不需橫向捲動 */}
        <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-3 gap-3 content-start">
          {groups.filter((g) => g.key && g.size > 0).map((g) => (
            <div key={g.key} className="rounded-xl border border-navy-100 bg-white p-2">
              <div className="text-sm font-semibold text-navy-700 mb-2 px-1">{g.key} 組</div>
              <div className="flex flex-col gap-1.5">
                {Array.from({ length: g.size }, (_, i) => (
                  <Slot key={i} seedKey={`${g.key}${i + 1}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
