import { useEffect, useMemo, useState } from 'react';
import {
  subscribeResultsAdmin,
  subscribeTeamsAdmin,
  subscribeTournamentConfig,
  updateTeam,
} from '../../services/firestore';
import GroupStandings, { standingsForGroup } from '../../components/GroupStandings';
import {
  prelimSeedOf,
  rankSeedOf,
  seedList,
  teamNameBySeed,
  normalizeSeedTags,
  RANK_SEED_RE,
} from '../../lib/teamSeed';
import { PageHeader, ErrorBar } from '../components/ui';

// 名次 → 名次標籤（A冠 = A組第 1 名，依此類推），結算時寫入 teams.seed[1]
const RANK_LABELS = ['冠', '亞', '季', '殿'];

/** 該組名次標籤的正規式（A冠、A亞…） */
const rankRe = (groupKey) => new RegExp(`^${groupKey}[冠亞季殿]$`);

// ============================================================
// RoundResultsAdmin — 循環賽排名（與前台小組排名同一積分表）
// 每組右上角「結算排名」：把名次標籤（A冠、A亞…）寫入各隊 seed[1]。
// 複賽場次文件維持佔位標籤，顯示／計分時由 seed 反查實際隊名，
// 不需把隊名另外複寫到場次文件；取消結算只要移除 seed[1]。
// ============================================================
export default function RoundResultsAdmin() {
  const [results, setResults] = useState([]);
  const [teams, setTeams] = useState([]);
  const [cfg, setCfg] = useState({ groups: [] });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [settling, setSettling] = useState(''); // 結算中的組別 key
  // 手動調整名次：同分且自動規則無法判定時（如三隊循環互咬），由管理者手動排序覆寫自動計算結果
  const [overrides, setOverrides] = useState({}); // { [groupKey]: seed[] }

  useEffect(() => {
    const unsubResults = subscribeResultsAdmin(setResults, (err) => setError(err.message));
    const unsubTeams = subscribeTeamsAdmin(setTeams, (err) => setError(err.message));
    const unsubCfg = subscribeTournamentConfig(setCfg, (err) => setError(err.message));
    return () => {
      unsubResults();
      unsubTeams();
      unsubCfg();
    };
  }, []);

  // seed 標籤（A1、A冠…）→ 隊名，供積分表顯示
  const teamsBySeed = useMemo(() => teamNameBySeed(teams), [teams]);

  // 預賽位置（A1…）→ 隊伍文件（含 id），供結算時寫回 seed
  const teamBySlot = useMemo(() => {
    const map = {};
    teams.forEach((t) => {
      const slot = prelimSeedOf(t);
      if (slot) map[slot] = t;
    });
    return map;
  }, [teams]);

  const prelim = useMemo(
    () => results.filter((r) => (r.round || 'prelim') === 'prelim'),
    [results],
  );
  const groups = (cfg.groups || []).filter((g) => g.key && g.size > 0);

  /** 該組是否已結算：任一隊伍的 seed[1] 已是該組名次標籤 */
  const isSettled = (g) => teams.some((t) => rankRe(g.key).test(rankSeedOf(t)));

  /** 上移／下移一名：首次調整時，以目前自動計算的順序為基礎 */
  const moveRank = (g, seed, dir) => {
    setOverrides((prev) => {
      const current = prev[g.key] || standingsForGroup(prelim, g.key, g.size).map((s) => s.seed);
      const idx = current.indexOf(seed);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= current.length) return prev;
      const next = [...current];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return { ...prev, [g.key]: next };
    });
  };

  /** 還原該組為自動計算排序，移除手動調整 */
  const resetOrder = (g) => {
    setOverrides((prev) => {
      if (!(g.key in prev)) return prev;
      const next = { ...prev };
      delete next[g.key];
      return next;
    });
  };

  /** 結算該組排名：把名次標籤（A冠、A亞…）寫入各隊 seed[1]；若有手動調整順序，優先採用 */
  const settleGroup = async (g) => {
    setError('');
    setNotice('');
    const rows = (overrides[g.key] || []).length === g.size
      ? overrides[g.key].map((seed) => ({ seed }))
      : standingsForGroup(prelim, g.key, g.size);

    // 位置未指派隊伍時無法對應隊名，直接擋下
    const unnamed = rows.filter((s) => !teamBySlot[s.seed]);
    if (unnamed.length) {
      setError(`${g.key} 組還有位置未指派隊伍（${unnamed.map((s) => s.seed).join('、')}），請先至「預賽分組」排定。`);
      return;
    }

    const groupMatches = prelim.filter((r) => r.group === g.key);
    const unfinished = groupMatches.filter((r) => !Array.isArray(r.setScores) || r.setScores.length === 0).length;
    const warn = unfinished ? `注意：${g.key} 組尚有 ${unfinished} 場未完成！\n` : '';
    const ranking = rows.map((s, i) => `第${i + 1}名 ${teamBySlot[s.seed].team}`).join('、');
    if (!window.confirm(`${warn}結算 ${g.key} 組排名（${ranking}），名次將存入各隊 seed，複賽的「${g.key}冠、${g.key}亞…」佔位會自動對應到實際隊伍，確定？`)) return;

    setSettling(g.key);
    try {
      // 名次標籤寫入各隊 seed 陣列（替換舊名次後修剪依附鏈）；場次文件不動
      await Promise.all(
        rows.map((s, i) => {
          if (!RANK_LABELS[i]) return Promise.resolve(); // 超出名次標籤的隊伍不寫
          const t = teamBySlot[s.seed];
          const others = seedList(t).filter((l) => !RANK_SEED_RE.test(l));
          return updateTeam(t.id, {
            seed: normalizeSeedTags([...others, `${g.key}${RANK_LABELS[i]}`]),
          });
        }),
      );
      setNotice(`✓ ${g.key} 組已結算，名次已存入各隊 seed，複賽佔位將自動顯示對應隊伍`);
    } catch (err) {
      setError(err.message || '結算失敗');
    } finally {
      setSettling('');
    }
  };

  /** 取消結算：移除該組各隊的名次標籤（seed 縮回只剩預賽位置） */
  const cancelSettle = async (g) => {
    setError('');
    setNotice('');
    if (!window.confirm(`取消 ${g.key} 組結算？各隊的名次 seed 將移除，複賽對戰恢復顯示「${g.key}冠、${g.key}亞…」佔位標籤。`)) return;

    setSettling(g.key);
    try {
      const ranked = teams.filter((t) => rankRe(g.key).test(rankSeedOf(t)));
      await Promise.all(
        ranked.map((t) =>
          // 移除名次後修剪依附鏈：依附名次的勝敗標籤一併移除，位置保留
          updateTeam(t.id, {
            seed: normalizeSeedTags(seedList(t).filter((l) => !RANK_SEED_RE.test(l))),
          }),
        ),
      );
      setNotice(`✓ 已取消 ${g.key} 組結算，移除 ${ranked.length} 隊的名次 seed`);
    } catch (err) {
      setError(err.message || '取消結算失敗');
    } finally {
      setSettling('');
    }
  };

  return (
    <>
      <PageHeader
        title="循環賽排名"
        desc="積分即時依預賽成績計算（勝場→總失局→得失分比）；同分且自動規則無法判定時（如多隊循環互咬），可用「調整」欄的上下箭頭手動排序。結算後名次存入各隊 seed，複賽佔位自動對應隊伍"
      />
      <ErrorBar message={error} />
      {notice && (
        <div className="px-4 py-3 rounded-xl bg-court/10 border border-court/20 text-court text-sm mb-4">
          {notice}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {groups.length === 0 ? (
          <p className="text-slate-400 text-sm">尚未設定分組。</p>
        ) : (
          groups.map((g) => {
            const settled = isSettled(g);
            const hasOverride = !!overrides[g.key];
            return (
              <GroupStandings
                key={g.key}
                groupKey={g.key}
                size={g.size}
                results={prelim}
                teamsBySeed={teamsBySeed}
                manualOrder={overrides[g.key]}
                onMove={settled ? undefined : (seed, dir) => moveRank(g, seed, dir)}
                action={
                  <div className="flex items-center gap-2">
                    {!settled && hasOverride && (
                      <button
                        type="button"
                        onClick={() => resetOrder(g)}
                        title="還原為自動計算排序"
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline decoration-dashed underline-offset-2"
                      >
                        還原自動排序
                      </button>
                    )}
                    {settled ? (
                      <button
                        type="button"
                        onClick={() => cancelSettle(g)}
                        disabled={!!settling}
                        className="text-xs font-semibold text-slate-600 border border-slate-300 hover:border-slate-400 hover:text-slate-800 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-all"
                      >
                        {settling === g.key ? '取消中…' : '取消結算'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => settleGroup(g)}
                        disabled={!!settling}
                        className="text-xs font-semibold text-navy-800 bg-vbyellow-400 hover:brightness-105 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-all"
                      >
                        {settling === g.key ? '結算中…' : '結算排名'}
                      </button>
                    )}
                  </div>
                }
              />
            );
          })
        )}
      </div>
    </>
  );
}
