import { useEffect, useState } from 'react';
import {
  subscribeTeamsAdmin,
  createTeam,
  updateTeam,
  deleteTeam,
  resyncPrelimResults,
} from '../../services/firestore';
import { GROUP_OPTIONS } from '../lib/matches';
import { DEPARTMENT_OPTIONS } from '../lib/departments';
import {
  prelimSeedOf,
  seedList,
  normalizeSeedTags,
  PRELIM_SEED_RE,
  RANK_SEED_RE,
} from '../../lib/teamSeed';
import Modal from '../components/Modal';
import { PageHeader, ErrorBar, Card, Field, inputCls, btnPrimary, btnDanger } from '../components/ui';

// 表格內小輸入框：navy 邊框 + 排球黃 focus ring（與 ui.jsx inputCls 一致）
const cell = 'border border-navy-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-vbyellow-400';
const emptyMember = () => ({ number: '', name: '', gender: 'M', status: '在校' });

// 標籤 chip 顏色：預賽位置＝藍、結算名次＝黃、勝敗標籤（X勝/X敗）＝灰
const tagChipCls = (label) =>
  RANK_SEED_RE.test(label)
    ? 'bg-vbyellow-100 text-navy-800'
    : PRELIM_SEED_RE.test(label)
      ? 'bg-court/10 text-court'
      : 'bg-slate-100 text-slate-600';

// seed 陣列標籤（唯讀顯示）：位置由「預賽分組」指派、名次由「循環賽排名」結算、
// 勝敗標籤由複賽場次結束時自動寫入
function SeedTags({ team }) {
  const tags = seedList(team);
  if (tags.length === 0) return <span className="text-slate-300">—</span>;
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1">
      {tags.map((label) => (
        <span key={label} className={`inline-block rounded-full text-xs font-semibold px-2 py-0.5 tabular-nums ${tagChipCls(label)}`}>
          {label}
        </span>
      ))}
    </span>
  );
}

// ============================================================
// TeamsAdmin — 參賽名單（表格 + Modal 編輯）
// 表格列為唯讀摘要，點列開 Modal 編輯隊伍基本欄位與隊員。
// ============================================================
export default function TeamsAdmin() {
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { id, team, department, group, order, members }
  const [isNew, setIsNew] = useState(false);
  const [modalErr, setModalErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeTeamsAdmin(setTeams, (err) => setError(err.message));
    return unsub;
  }, []);

  const openEdit = (t) => {
    setIsNew(false);
    setModalErr('');
    setEditing({
      id: t.id,
      team: t.team ?? '',
      department: t.department ?? '',
      group: t.group ?? '',
      order: t.order ?? 0,
      seedTags: seedList(t), // seed 標籤陣列（位置、名次…可多個）
      origSlot: prelimSeedOf(t), // 位置有變動時才需重新同步預賽場次
      members: Array.isArray(t.members) ? t.members.map((m) => ({ ...m })) : [],
    });
  };
  const openNew = () => {
    setIsNew(true);
    setModalErr('');
    // 排序自動接續：取現有最大 order + 1（第一隊為 1）
    const nextOrder = teams.reduce((max, t) => Math.max(max, Number(t.order) || 0), 0) + 1;
    setEditing({
      id: null,
      team: '',
      department: '',
      group: '',
      order: nextOrder,
      seedTags: [],
      origSlot: '',
      members: [],
    });
  };
  const close = () => setEditing(null);

  const setF = (k, v) => setEditing((s) => ({ ...s, [k]: v }));
  const setMemberAt = (i, k, v) =>
    setEditing((s) => ({ ...s, members: s.members.map((m, j) => (j === i ? { ...m, [k]: v } : m)) }));
  const addMember = () => setEditing((s) => ({ ...s, members: [...s.members, emptyMember()] }));
  const removeMember = (i) =>
    setEditing((s) => ({ ...s, members: s.members.filter((_, j) => j !== i) }));
  // 上下調整順序：第一位為隊長，順序異動會改變隊長
  const moveMember = (i, dir) =>
    setEditing((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.members.length) return s;
      const members = [...s.members];
      [members[i], members[j]] = [members[j], members[i]];
      return { ...s, members };
    });

  const save = async () => {
    const f = editing;
    if (!f.team.trim()) return setModalErr('請輸入隊名');
    // 依附鏈修剪（UI 已擋大部分狀況，這裡同時修復舊資料的失依標籤）
    const seedTags = normalizeSeedTags(f.seedTags);
    const slotTag = seedTags.find((l) => PRELIM_SEED_RE.test(l)) || '';
    // 標籤重複檢查：同一個標籤只能屬於一隊，否則反查隊名會互相蓋掉
    const dup = seedTags
      .map((label) => ({ label, holder: teams.find((t) => t.id !== f.id && seedList(t).includes(label)) }))
      .find((d) => d.holder);
    if (dup) return setModalErr(`標籤 ${dup.label} 已由「${dup.holder.team}」持有，請先調整該隊（或用「預賽分組」拖曳互換）`);
    setSaving(true);
    setModalErr('');
    const payload = {
      team: f.team.trim(),
      department: f.department.trim(),
      // 有預賽位置標籤時組別跟著位置走（與預賽分組面板一致）
      group: slotTag ? slotTag[0] : f.group.trim(),
      order: Number(f.order) || 0,
      seed: seedTags,
      members: f.members
        .filter((m) => m.name.trim())
        .map((m) => ({
          number: String(m.number).trim(),
          name: m.name.trim(),
          gender: m.gender,
          status: m.status,
        })),
    };
    try {
      if (isNew) await createTeam(payload);
      else await updateTeam(f.id, payload);
      // 位置有變動時，把已產生的預賽場次同步成新的隊名對應
      if (slotTag !== f.origSlot) await resyncPrelimResults();
      close();
    } catch (err) {
      setModalErr(err.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`刪除隊伍「${editing.team}」？`)) return;
    try {
      await deleteTeam(editing.id);
      close();
    } catch (err) {
      setModalErr(err.message || '刪除失敗');
    }
  };

  return (
    <>
      <PageHeader
        title="參賽名單"
        desc={`共 ${teams.length} 隊`}
        action={<button type="button" onClick={openNew} className={btnPrimary}>＋ 新增隊伍</button>}
      />
      <ErrorBar message={error} />

      <Card className="overflow-x-auto p-0">
        {teams.length === 0 ? (
          <p className="text-slate-400 text-sm p-5">目前沒有任何隊伍，請點「新增隊伍」。</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              {/* 輕盈簡約表頭：小型灰藍字 + 細底線 */}
              <tr className="text-navy-400 text-left text-xs font-semibold tracking-wider border-b-2 border-navy-100">
                <th className="px-3 py-2.5 w-16 text-center">排序</th>
                <th className="px-3 py-2.5">隊名</th>
                <th className="px-3 py-2.5 w-20 text-center">系所</th>
                <th className="px-3 py-2.5 w-20 text-center">組別</th>
                <th className="px-3 py-2.5 text-center">標籤</th>
                <th className="px-3 py-2.5 w-20 text-center">隊員</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => openEdit(t)}
                  className="border-b border-navy-100 last:border-0 hover:bg-navy-50 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2.5 text-slate-400 tabular-nums text-center">{t.order ?? 0}</td>
                  <td className="px-3 py-2.5 font-semibold text-navy-800">{t.team}</td>
                  <td className="px-3 py-2.5 text-slate-600 text-center">{t.department || '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    {t.group ? (
                      <span className="inline-block rounded-full bg-navy-50 text-navy-700 text-xs font-medium px-2 py-0.5">{t.group} 組</span>
                    ) : (
                      <span className="text-slate-300">未分組</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center"><SeedTags team={t} /></td>
                  <td className="px-3 py-2.5 text-slate-600 tabular-nums text-center">{(t.members || []).length} 人</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* 編輯 Modal */}
      <Modal
        open={!!editing}
        onClose={close}
        title={isNew ? '新增隊伍' : '編輯隊伍'}
        footer={
          <>
            <button type="button" onClick={save} disabled={saving} className={btnPrimary}>
              {saving ? '儲存中…' : '儲存'}
            </button>
            {!isNew && (
              <button type="button" onClick={remove} className={`${btnDanger} ml-auto`}>刪除</button>
            )}
          </>
        }
      >
        {editing && (
          <div className="flex flex-col gap-3">
            {modalErr && <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{modalErr}</div>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="隊名">
                <input className={inputCls} value={editing.team} onChange={(e) => setF('team', e.target.value)} />
              </Field>
              <Field label="系所">
                <select className={inputCls} value={editing.department} onChange={(e) => setF('department', e.target.value)}>
                  <option value="">未選擇</option>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="組別">
                {/* 有預賽位置標籤時組別由標籤推導（A1 → A 組），鎖定避免不一致 */}
                {(() => {
                  const slotTag = editing.seedTags.find((l) => PRELIM_SEED_RE.test(l)) || '';
                  return (
                    <select
                      className={inputCls}
                      value={slotTag ? slotTag[0] : editing.group}
                      disabled={!!slotTag}
                      onChange={(e) => setF('group', e.target.value)}
                    >
                      <option value="">未分組</option>
                      {GROUP_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g} 組</option>
                      ))}
                    </select>
                  );
                })()}
              </Field>
              <Field label="排序 (order)">
                <input type="number" className={inputCls} value={editing.order} onChange={(e) => setF('order', e.target.value)} />
              </Field>
            </div>

            {/* seed 標籤陣列：唯讀顯示，此處不提供加／移除。
                預賽位置（A1…F4）請至「預賽分組」拖曳指派；名次標籤由「循環賽排名」結算自動寫入；
                勝敗標籤由複賽場次結束自動寫入。全部交由對應頁面管理，避免與自動結算的狀態衝突。 */}
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-slate-500 font-medium">標籤</span>
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-navy-200 bg-navy-50/50 px-2 py-1.5 min-h-[2.5rem]">
                {editing.seedTags.length === 0 && <span className="text-slate-300 text-sm">尚無標籤</span>}
                {editing.seedTags.map((label) => (
                  <span
                    key={label}
                    className={`inline-block rounded-full text-xs font-semibold px-2 py-0.5 ${tagChipCls(label)}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <span className="text-xs text-slate-400">位置請至「預賽分組」設定；名次、勝敗標籤依賽程結果自動產生</span>
            </div>

            {/* 隊員 */}
            <div className="mt-1">
              <p className="text-sm text-slate-500 mb-2">隊員（第一位為隊長）</p>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {editing.members.map((m, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-col shrink-0">
                      <button
                        type="button"
                        onClick={() => moveMember(i, -1)}
                        disabled={i === 0}
                        className="px-1 text-slate-400 hover:text-navy-700 disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                        title="上移"
                      >
                        <i className="fa-solid fa-chevron-up text-xs" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMember(i, 1)}
                        disabled={i === editing.members.length - 1}
                        className="px-1 text-slate-400 hover:text-navy-700 disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                        title="下移"
                      >
                        <i className="fa-solid fa-chevron-down text-xs" aria-hidden="true"></i>
                      </button>
                    </div>
                    <input className={`${cell} w-14`} placeholder="背號" value={m.number} onChange={(e) => setMemberAt(i, 'number', e.target.value)} />
                    <input className={`${cell} flex-1 min-w-[7rem]`} placeholder="姓名" value={m.name} onChange={(e) => setMemberAt(i, 'name', e.target.value)} />
                    <select className={cell} value={m.gender} onChange={(e) => setMemberAt(i, 'gender', e.target.value)}>
                      <option value="M">男</option>
                      <option value="F">女</option>
                    </select>
                    <select className={cell} value={m.status} onChange={(e) => setMemberAt(i, 'status', e.target.value)}>
                      <option value="在校">在校</option>
                      <option value="畢業">畢業</option>
                    </select>
                    <button type="button" onClick={() => removeMember(i)} className="text-red-400 hover:text-red-600 px-1" aria-label="移除隊員">×</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addMember} className="text-court hover:text-navy-700 text-sm mt-2">＋ 加隊員</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
