import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  subscribeResultsAdmin,
  subscribeTeamsAdmin,
  subscribeCourts,
  upsertResult,
  deleteResult,
  reorderMatchNumbers,
} from '../../services/firestore';
import { matchDate, eventDates, dayLabel, LEGACY_DAY_DATES } from '../../lib/matchDay';
import { slotPairOf } from '../../lib/matchSlots';
import { MATCH_NUMBERS, matchNoIndex, GROUP_OPTIONS, STATUS_LABEL } from '../lib/matches';
import { GROUP_SLOTS } from '../lib/prelim';
import { FINALS_PLACEHOLDERS } from '../lib/finals';
import { gameScoreFromSets, computeMatch } from '../lib/volleyball';
import { propagateFinalsResult } from '../lib/propagateFinals';
import { teamNameBySeed, resolveTeams } from '../../lib/teamSeed';
import { courtRank } from '../../lib/courtOrder';
import Modal from '../components/Modal';
import { PageHeader, ErrorBar, Card, Field, inputCls, btnPrimary, btnDanger } from '../components/ui';

// 位置標籤選項：預賽 A1–F4；複賽為 bracket 範本中的佔位標籤（A冠、27勝、F季…）
const SLOT_OPTIONS = {
  prelim: Object.entries(GROUP_SLOTS).flatMap(([g, n]) =>
    Array.from({ length: n }, (_, i) => `${g}${i + 1}`),
  ),
  finals: [...FINALS_PLACEHOLDERS],
};

// 依各局比分自動推導場次狀態（不可手動指定）：
//   已分出大比分（達 2 勝局）→ done（已完成）；
//   其餘一律 scheduled（未開始）。
//   「live（進行中）」僅由計分面板進出時標記，故若原本已是 live 且尚未分出勝負則維持。
const deriveStatus = (setScores, prevStatus) => {
  const filled = (setScores || []).map((s) => String(s).trim()).filter(Boolean);
  const { matchWinner } = computeMatch(filled.length ? filled : ['0:0']);
  if (matchWinner >= 0) return 'done'; // 已分出大比分 → 已完成
  if (prevStatus === 'live') return 'live'; // 計分面板進行中 → 維持
  return 'scheduled'; // 其餘 → 未開始
};

const emptyForm = {
  matchNo: '',
  group: '',
  date: '',
  time: '',
  field: '',
  labelA: '',
  labelB: '',
  sets: ['', '', ''],
  status: 'scheduled',
};

// ============================================================
// ScheduleAdmin — 賽程（時間 × 場地時刻表，依 round 過濾）
// 列＝時間、欄＝場地，格子顯示「場次＋誰打誰」；點格子以 Modal 編輯，
// 可直接「拖曳」格子改時間／場地（拖到空格＝移動；拖到已有比賽＝互換）。
// 只負責賽程欄位，比分另於成績頁設定。
// ============================================================
// intro：頁首下方的自訂區塊（如預賽頁的分組面板）
export default function ScheduleAdmin({ round, title, desc, intro = null }) {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [teams, setTeams] = useState([]);
  const [configCourts, setConfigCourts] = useState([]); // 場地清單（courts collection），未設定時維持空陣列
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [modalErr, setModalErr] = useState('');

  const draggingRef = useRef(null); // { matchNo, time, field }
  const [dropKey, setDropKey] = useState(null);

  // 手動新增的空時段（尚無場次）：{ [date]: string[] }，只影響顯示，實際場次仍由點格子建立
  const [extraTimes, setExtraTimes] = useState({});
  // 手動移除／改名後要隱藏的時段（含固定範本時段）：{ [date]: string[] }
  const [hiddenTimes, setHiddenTimes] = useState({});
  const [editingTime, setEditingTime] = useState(null); // 正在改名的原始時間
  const [editingTimeValue, setEditingTimeValue] = useState('');
  const slotSeq = useRef(0); // 新增時段的暫時佔位名稱編號

  useEffect(() => {
    const unsubResults = subscribeResultsAdmin(setResults, (err) => setError(err.message));
    const unsubTeams = subscribeTeamsAdmin(setTeams, (err) => setError(err.message));
    const unsubCourts = subscribeCourts(setConfigCourts, (err) => setError(err.message));
    return () => {
      unsubResults();
      unsubTeams();
      unsubCourts();
    };
  }, []);

  const [dayFilter, setDayFilter] = useState('');

  // 僅本輪次的場次
  const rows = useMemo(
    () => results.filter((r) => (r.round || 'prelim') === round),
    [results, round],
  );

  // 本輪次出現的比賽日期（升冪；日期較小者即 DAY1，不依賴 day 欄位）
  const days = useMemo(() => {
    const dates = eventDates(rows);
    return dates.length ? dates : [LEGACY_DAY_DATES.day1];
  }, [rows]);

  useEffect(() => {
    if (!days.includes(dayFilter)) setDayFilter(days[0]);
  }, [days, dayFilter]);

  // 目前選取比賽日的場次
  const dayRows = useMemo(
    () => rows.filter((r) => matchDate(r) === dayFilter),
    [rows, dayFilter],
  );

  // seed 標籤（A1、A冠…）→ 隊名：場次文件只存佔位標籤，顯示／開賽時由此反查
  const nameBySeed = useMemo(() => teamNameBySeed(teams), [teams]);
  const displayTeam = (name) => nameBySeed[name] || name || '?';

  const courts = useMemo(() => {
    // 欄位以「場地設定」為主，並保留已排入但不在設定內的場地（避免既有資料消失）
    const set = new Set(configCourts);
    dayRows.forEach((r) => r.field && set.add(r.field));
    return [...set].sort(
      (a, b) => courtRank(configCourts, a) - courtRank(configCourts, b) || a.localeCompare(b),
    );
  }, [dayRows, configCourts]);

  const times = useMemo(() => {
    // 時段一律由實際場次時間 + 管理者手動新增的時段組成，不再預帶寫死的固定時段
    const set = new Set();
    dayRows.forEach((r) => r.time && r.field && set.add(r.time));
    (extraTimes[dayFilter] || []).forEach((t) => set.add(t)); // 手動新增的空時段
    (hiddenTimes[dayFilter] || []).forEach((t) => set.delete(t)); // 手動移除／已改名的時段
    return [...set].sort();
  }, [dayRows, dayFilter, extraTimes, hiddenTimes]);

  // 新增一個空時段：固定加在最後一列，並立即進入編輯狀態讓使用者直接打時間字串
  // （該時段各場地預設未排定；之後點格子選要排在哪個場地）
  const addTimeSlot = () => {
    slotSeq.current += 1;
    const placeholder = `新時段${slotSeq.current}`; // 中文字元排序在時間字串之後，自然排最後一列
    setExtraTimes((s) => ({ ...s, [dayFilter]: [...(s[dayFilter] || []), placeholder] }));
    setEditingTime(placeholder);
    setEditingTimeValue('');
  };

  const grid = useMemo(() => {
    const map = {};
    dayRows.forEach((r) => {
      if (r.time && r.field) map[`${r.time}|${r.field}`] = r;
    });
    return map;
  }, [dayRows]);

  // 該時段是否已有任一場地排定場次
  const hasMatchAt = (t) => courts.some((c) => grid[`${t}|${c}`]);

  // 刪除時段：該時段各場地都還沒有場次時才允許（有場次要先搬移或刪除場次）
  const removeTimeSlot = (t) => {
    if (hasMatchAt(t)) return; // 按鈕本身已 disabled，這裡是保險
    if (!window.confirm(`刪除時段 ${t}？`)) return;
    setHiddenTimes((s) => ({ ...s, [dayFilter]: [...(s[dayFilter] || []), t] }));
  };

  // 點時間 label 改名：只搬動同一時段內已排定的場次，不影響其他時段
  const startEditTime = (t) => {
    setEditingTime(t);
    setEditingTimeValue(t);
  };
  // 新增後尚未輸入就取消（清空或按 Escape）：若該時段還沒有場次，直接移除這個暫時佔位列
  const dropIfEmptyPlaceholder = (t) => {
    if (!hasMatchAt(t)) {
      setExtraTimes((s) => ({ ...s, [dayFilter]: (s[dayFilter] || []).filter((x) => x !== t) }));
    }
  };
  const cancelEditTime = (oldTime) => {
    setEditingTime(null);
    if (!editingTimeValue.trim()) dropIfEmptyPlaceholder(oldTime);
  };
  const commitEditTime = async (oldTime) => {
    setEditingTime(null);
    const nt = editingTimeValue.trim();
    if (!nt) {
      dropIfEmptyPlaceholder(oldTime);
      return;
    }
    if (nt === oldTime) return;
    if (times.includes(nt)) {
      setError(`時段 ${nt} 已存在`);
      return;
    }
    const affected = courts.map((c) => grid[`${oldTime}|${c}`]).filter(Boolean);
    try {
      await Promise.all(affected.map((m) => upsertResult(m.matchNo, { time: nt })));
    } catch (err) {
      setError(err.message || '更新失敗');
      return;
    }
    setError('');
    setHiddenTimes((s) => ({ ...s, [dayFilter]: [...(s[dayFilter] || []), oldTime] }));
    setExtraTimes((s) => ({
      ...s,
      [dayFilter]: [...(s[dayFilter] || []).filter((x) => x !== oldTime), nt],
    }));
  };

  const unscheduled = useMemo(
    () =>
      dayRows
        .filter((r) => !r.time || !r.field)
        .sort((a, b) => matchNoIndex(a.matchNo) - matchNoIndex(b.matchNo)),
    [dayRows],
  );

  // ---- 拖曳改時間／場地 ----
  const onDragStart = (m) => (e) => {
    draggingRef.current = { matchNo: m.matchNo, time: m.time || '', field: m.field || '' };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', m.matchNo);
  };
  // 預賽專用：依表格順序（日期→時間→場地）重新分配場次編號。
  // 編號池取自現有場次編號（重排而非重產），已排定者在前、未排定者殿後。
  const renumberAssignments = (updated) => {
    const scheduled = updated
      .filter((r) => r.time && r.field)
      .sort(
        (a, b) =>
          matchDate(a).localeCompare(matchDate(b)) ||
          a.time.localeCompare(b.time) ||
          courtRank(configCourts, a.field) - courtRank(configCourts, b.field),
      );
    const rest = updated
      .filter((r) => !r.time || !r.field)
      .sort((a, b) => matchNoIndex(a.matchNo) - matchNoIndex(b.matchNo));
    const pool = updated.map((r) => r.matchNo).sort((a, b) => matchNoIndex(a) - matchNoIndex(b));
    return [...scheduled, ...rest].map((row, i) => ({ row, matchNo: pool[i] }));
  };

  const onDropSlot = (time, court) => async (e) => {
    e.preventDefault();
    setDropKey(null);
    const d = draggingRef.current;
    draggingRef.current = null;
    if (!d || (d.time === time && d.field === court)) return;
    const target = grid[`${time}|${court}`];
    try {
      if (round === 'prelim') {
        // 修改：預賽拖曳（移動／互換）後，場次編號依表格順序重排，單一批次寫入
        const updated = rows.map((r) => {
          if (r.matchNo === d.matchNo) return { ...r, time, field: court };
          if (target && target.matchNo !== d.matchNo && r.matchNo === target.matchNo) {
            return { ...r, time: d.time, field: d.field };
          }
          return r;
        });
        // 只寫入有變動的場次（編號改變，或本次拖曳動到的兩場）
        const changed = renumberAssignments(updated).filter(
          ({ row, matchNo }) =>
            row.matchNo !== matchNo || row.matchNo === d.matchNo || row.matchNo === target?.matchNo,
        );
        await reorderMatchNumbers(changed);
      } else {
        // 複賽場次編號即 bracket 位置，不可重編，僅更新時間／場地
        await upsertResult(d.matchNo, { time, field: court });
        if (target && target.matchNo !== d.matchNo) {
          await upsertResult(target.matchNo, { time: d.time, field: d.field }); // 互換
        }
      }
    } catch (err) {
      setError(err.message || '更新失敗');
    }
  };

  // ---- Modal ----
  const openEdit = (r) => {
    setIsNew(false);
    setModalErr('');
    const sets = Array.isArray(r.setScores) ? r.setScores : [];
    // 只編標籤：隊名由標籤（seed）自動反查，不在此手動指定
    const pair = slotPairOf(r) || ['', ''];
    setEditing({
      matchNo: r.matchNo,
      group: r.group ?? '',
      date: matchDate(r), // 優先讀 date 欄位，舊資料由 day 對照回填
      time: r.time ?? '',
      field: r.field ?? '',
      labelA: pair[0] ?? '',
      labelB: pair[1] ?? '',
      sets: [sets[0] ?? '', sets[1] ?? '', sets[2] ?? ''],
      status: r.status ?? 'scheduled',
    });
  };
  const openNew = (preset = {}) => {
    setIsNew(true);
    setModalErr('');
    // 新場次日期預設為目前檢視的比賽日
    setEditing({ ...emptyForm, date: dayFilter, ...preset });
  };
  const close = () => setEditing(null);
  const setF = (k, v) => setEditing((s) => ({ ...s, [k]: v }));

  // 組出寫入 results 的 payload（save／開始計分共用）；驗證失敗回傳 null
  const buildPayload = () => {
    const f = editing;
    const no = f.matchNo.trim();
    if (!no) {
      setModalErr('請輸入場次編號');
      return null;
    }
    if (isNew && results.some((r) => r.matchNo === no)) {
      setModalErr(`場次「${no}」已存在`);
      return null;
    }
    // 同一時段／場地不可排定兩場：擋掉手動輸入時間、場地與其他場次撞期
    const clash = f.time.trim() && f.field.trim() && results.find(
      (r) =>
        (r.round || 'prelim') === round &&
        r.matchNo !== no &&
        matchDate(r) === f.date &&
        r.time === f.time.trim() &&
        r.field === f.field.trim(),
    );
    if (clash) {
      setModalErr(`「${f.time} ${f.field}場」已排定場次「${clash.matchNo}」，請改選其他時段／場地，或用拖曳互換`);
      return null;
    }
    // 勝敗類標籤不可引用本場或之後的場次（如場次 31 不能掛 31勝／35敗）
    const badLabel = [f.labelA, f.labelB].find(
      (s) => s && !labelOptionsFor(no).includes(s) && /^(\d+)[勝敗]$/.test(s),
    );
    if (badLabel) {
      setModalErr(`標籤「${badLabel}」引用了本場或之後的場次，請改選較早場次的勝敗`);
      return null;
    }
    setModalErr('');
    // teams 一律存佔位標籤；前台顯示／開賽時再由 seed 反查實際隊名
    const teams = [f.labelA, f.labelB];
    const setScores = f.sets.map((s) => s.trim()).filter(Boolean);
    const gameScore = gameScoreFromSets(setScores);
    const base = {
      round,
      group: f.group,
      date: f.date, // 比賽日由日期推導，不再寫入 day 欄位
      time: f.time.trim(),
      field: f.field.trim(),
      teams,
      setScores,
      gameScore,
      status: deriveStatus(f.sets, f.status), // 狀態依比分自動推導，不可手動指定
    };
    // 標籤存入 seeds（前台小標籤／佔位顯示來源）；兩者皆空時不動原值
    if (f.labelA || f.labelB) base.seeds = [f.labelA, f.labelB];
    return { no, base, teams, setScores, gameScore };
  };

  const save = async () => {
    const p = buildPayload();
    if (!p) return;
    try {
      await upsertResult(p.no, p.base);
      // 已完成的複賽場次：勝敗方自動遞補到後續場次（取代 X勝／X敗 佔位標籤）
      if (p.base.status === 'done') {
        const [ga, gb] = p.gameScore.split(':').map(Number);
        if (ga !== gb) {
          const w = ga > gb ? 0 : 1;
          // 佔位標籤（如 A冠）先由各隊 seed 反查為實際隊名，再寫入勝敗標籤
          const [wName, lName] = resolveTeams([p.teams[w], p.teams[1 - w]], nameBySeed);
          await propagateFinalsResult(p.no, wName, lName, teams);
        }
      }
      close();
    } catch (err) {
      setModalErr(err.message || '儲存失敗');
    }
  };

  // 隊伍是否尚未確定：值為空、或仍是「無法由各隊 seed 反查隊名」的佔位標籤
  // （名次佔位如 A冠 在該組結算後即可反查，視為已確定）
  const isUnresolvedTeam = (name) =>
    !name || ((SLOT_OPTIONS[round] || []).includes(name) && !nameBySeed[name]);

  // 該場次可選的標籤：名次類（A冠…）不限；「X勝／X敗」僅能引用較早的場次
  const labelOptionsFor = (matchNo) => {
    const n = Number(String(matchNo || '').trim());
    const cur = Number.isFinite(n) && n > 0 ? n : Infinity; // 編號未定時暫不限制
    return (SLOT_OPTIONS[round] || []).filter((s) => {
      const ref = s.match(/^(\d+)[勝敗]$/);
      return !ref || Number(ref[1]) < cur;
    });
  };

  // 開始計分：儲存表單後直接前往該場的編輯比分頁
  // （「比賽中」狀態由編輯比分頁進出時自動標記／恢復，場地看板亦由該頁建立）
  const startLive = async () => {
    const p = buildPayload();
    if (!p) return;
    if (!p.base.field) return setModalErr('請先設定場地，才能開始即時計分');
    // 兩隊皆為實際隊名才可開賽（佔位標籤代表前置比賽／分組尚未完成）
    if (p.teams.some(isUnresolvedTeam)) {
      return setModalErr('兩隊尚未確定（仍為佔位標籤），無法開始計分');
    }
    try {
      await upsertResult(p.no, p.base);
      close();
      navigate(`/score/${encodeURIComponent(p.no)}`);
    } catch (err) {
      setModalErr(err.message || '開始計分失敗');
    }
  };
  const remove = async () => {
    if (!window.confirm(`刪除場次「${editing.matchNo}」？`)) return;
    try {
      await deleteResult(editing.matchNo);
      close();
    } catch (err) {
      setModalErr(err.message || '刪除失敗');
    }
  };

  return (
    <>
      <PageHeader title={title} desc={desc} />
      <ErrorBar message={error} />

      {intro}

      {/* 比賽日切換 */}
      {days.length > 1 && (
        <div className="flex gap-2 mb-4">
          {days.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => setDayFilter(d)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                d === dayFilter
                  ? 'bg-vbyellow-400 text-navy-900 font-semibold shadow-sm' // 選中：排球黃底深藍字
                  : 'bg-white border border-navy-100 text-slate-600 hover:bg-navy-50'
              }`}
            >
              {dayLabel(d, i)}
            </button>
          ))}
        </div>
      )}

      {/* 時刻表 */}
      <Card className="overflow-x-auto p-0">
        {times.length === 0 ? (
          <p className="text-slate-400 text-sm p-5">尚無已排定時間的場次，請用下方「新增時段」。</p>
        ) : (
          // table-fixed：欄寬不隨內容變動，時間欄固定，場地欄平均分配 → 各 card 等寬
          <table className="w-full min-w-[48rem] text-sm border-collapse table-fixed">
            <thead>
              {/* 輕盈簡約表頭：小型灰藍字 + 細底線 */}
              <tr className="text-navy-400 text-xs font-semibold tracking-wider border-b-2 border-navy-100">
                <th className="px-3 py-2.5 text-left w-20">時間</th>
                {courts.map((c) => (
                  <th key={c} className="px-3 py-2.5 text-center">{c} 場</th>
                ))}
                <th className="px-2 py-2.5 w-10" aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {times.map((t) => {
                const hasMatch = hasMatchAt(t);
                return (
                <tr key={t} className="border-b border-navy-100 last:border-0">
                  {/* 時間欄：點文字改時間；刪除按鈕移到本列最後一欄，避免蓋到場次格 */}
                  <td className="px-3 py-2.5 align-top">
                    {editingTime === t ? (
                      <input
                        type="text"
                        autoFocus
                        placeholder="13:00"
                        className="w-16 bg-transparent border-0 outline-none focus:outline-none font-display font-semibold text-navy-800 tabular-nums text-sm p-0"
                        value={editingTimeValue}
                        onChange={(e) => setEditingTimeValue(e.target.value)}
                        onBlur={() => commitEditTime(t)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') cancelEditTime(t);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditTime(t)}
                        title="點擊編輯時間"
                        className="font-display font-semibold text-navy-800 tabular-nums hover:text-court hover:underline decoration-dashed underline-offset-2"
                      >
                        {t}
                      </button>
                    )}
                  </td>
                  {courts.map((c) => {
                    const m = grid[`${t}|${c}`];
                    const key = `${t}|${c}`;
                    const isDrop = dropKey === key;
                    // 兩隊皆已由實際隊名取代原始標籤時，於下方以小字顯示原始對戰位置標籤（與前台一致）
                    const pair = m ? slotPairOf(m) : null;
                    const slotResolved =
                      pair &&
                      pair.every((slot, i) => {
                        const shown = displayTeam(m.teams?.[i]);
                        return shown && shown !== '?' && shown !== slot;
                      });
                    // 大比分（勝局）：卡片右上角顯示，與前台對戰成績頁一致，方便一眼看出哪些場次已完成
                    const live = m?.status === 'live';
                    const sets = Array.isArray(m?.setScores) ? m.setScores : [];
                    const bigScore = m?.gameScore || '0:0';
                    const hasScore = bigScore !== '0:0' || sets.length > 0;
                    return (
                      <td
                        key={c}
                        // h-px：讓格子高度貼齊該列最高的卡片（含小標籤時多一行），同列卡片才能等高
                        className={`px-2 py-1.5 align-top h-px ${isDrop ? 'bg-vbyellow-50' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dropKey !== key) setDropKey(key);
                        }}
                        onDragLeave={() => setDropKey((k) => (k === key ? null : k))}
                        onDrop={onDropSlot(t, c)}
                      >
                        {m ? (
                          <button
                            type="button"
                            draggable
                            onDragStart={onDragStart(m)}
                            onClick={() => openEdit(m)}
                            className="relative w-full h-full flex flex-col justify-center text-center rounded-lg border border-navy-100 hover:border-vbyellow-400 hover:bg-vbyellow-50 px-2.5 py-2 transition-colors cursor-grab active:cursor-grabbing"
                          >
                            {/* 大比分（勝局）：固定在卡片右上角，進行中標紅、已完成標黃 */}
                            {(hasScore || live) && (
                              <span className={`absolute top-1.5 right-1.5 text-xs font-bold rounded-full px-2 py-0.5 tabular-nums ${live ? 'bg-red-500 text-white' : 'bg-vbyellow-400 text-navy-900'}`}>
                                {bigScore}
                              </span>
                            )}
                            <div className="text-xs text-court font-semibold">
                              場次 {m.matchNo}{m.group ? `・${m.group}組` : ''}
                            </div>
                            {/* 以 vs 為中心對齊（左右隊名各佔等寬欄位），與前台一致 */}
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-slate-700">
                              <span className="truncate text-right">{displayTeam(m.teams?.[0])}</span>
                              <span className="text-slate-300">vs</span>
                              <span className="truncate text-left">{displayTeam(m.teams?.[1])}</span>
                            </div>
                            {/* 原始對戰位置標籤（A1 vs A2、C冠 vs D亞…）：小字呈現 */}
                            {slotResolved && (
                              <div className="mt-0.5 text-[10px] text-navy-400 tabular-nums">
                                {pair[0]} vs {pair[1]}
                              </div>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openNew({ time: t, field: c })}
                            className="w-full h-full min-h-[2.75rem] flex items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300 hover:text-vbyellow-500 hover:border-vbyellow-400 transition-colors"
                          >
                            ＋
                          </button>
                        )}
                      </td>
                    );
                  })}
                  {/* 刪除時段：放在本列最後一欄；有場次時不可刪除，需先搬移或刪除場次 */}
                  <td className="px-2 py-2.5 align-middle text-center">
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(t)}
                      disabled={hasMatch}
                      title={hasMatch ? '時段內仍有場次，請先搬移或刪除場次' : '刪除時段'}
                      aria-label={`刪除時段 ${t}`}
                      className="text-slate-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-300 leading-none"
                    >
                      <i className="fa-solid fa-trash-can text-xs" aria-hidden="true"></i>
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {/* 新增時段：固定加在最後一列並立即可編輯時間；各場地預設未排定，點格子才建立場次 */}
        <div className="flex items-center justify-center px-3 py-3 border-t border-navy-100">
          <button type="button" onClick={addTimeSlot} className={btnPrimary}>＋ 新增時段</button>
        </div>
      </Card>

      {/* 未排定 */}
      {unscheduled.length > 0 && (
        <Card className="mt-5">
          <p className="text-sm text-slate-500 mb-2">未排定時間／場地（{unscheduled.length}）· 可拖入上方時刻表</p>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((r) => (
              <button
                key={r.matchNo || r.id}
                type="button"
                draggable
                onDragStart={onDragStart(r)}
                onClick={() => openEdit(r)}
                className="rounded-lg border border-navy-100 hover:border-vbyellow-400 hover:bg-vbyellow-50 px-3 py-1.5 text-sm cursor-grab active:cursor-grabbing"
              >
                <span className="text-court font-semibold">場次{r.matchNo}</span>{' '}
                {displayTeam(r.teams?.[0])} vs {displayTeam(r.teams?.[1])}
              </button>
            ))}
          </div>
        </Card>
      )}

      <datalist id="schedule-no-options">
        {MATCH_NUMBERS.filter((n) => !results.some((r) => r.matchNo === n)).map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {/* 編輯 Modal */}
      <Modal
        open={!!editing}
        onClose={close}
        title={isNew ? '新增場次' : `編輯場次 ${editing?.matchNo}`}
        footer={
          <>
            <button type="button" onClick={save} className={btnPrimary}>儲存</button>
            {!isNew && (() => {
              // 兩隊皆為實際隊名才可開始計分（佔位標籤＝前置比賽／分組尚未完成）
              const canStart =
                editing && ![editing.labelA, editing.labelB].some(isUnresolvedTeam);
              return (
                <button
                  type="button"
                  onClick={startLive}
                  disabled={!canStart}
                  title={canStart ? undefined : '兩隊尚未確定（仍為佔位標籤），無法開始計分'}
                  className="text-sm font-semibold text-white bg-court hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-4 py-2 transition-all"
                >
                  <i className="fa-solid fa-volleyball mr-1.5" aria-hidden="true"></i>開始計分
                </button>
              );
            })()}
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
              <Field label="場次編號">
                <input
                  className={inputCls}
                  list={isNew ? 'schedule-no-options' : undefined}
                  value={editing.matchNo}
                  disabled={!isNew}
                  onChange={(e) => setF('matchNo', e.target.value)}
                />
              </Field>
              <Field label="組別">
                <select className={inputCls} value={editing.group} onChange={(e) => setF('group', e.target.value)}>
                  <option value="">未選擇</option>
                  {GROUP_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g} 組</option>
                  ))}
                </select>
              </Field>
              {/* 修改：日期／時間改用原生選擇器；比賽日由日期大小推導（較小者為 DAY1） */}
              <Field label="日期">
                <input type="date" className={inputCls} value={editing.date} onChange={(e) => setF('date', e.target.value)} />
              </Field>
              <Field label="時間">
                <input type="time" className={inputCls} value={editing.time} onChange={(e) => setF('time', e.target.value)} />
              </Field>
              {/* 場地改用「場地設定」清單的下拉；若既有值不在清單內，仍保留該選項 */}
              <Field label="場地" className="col-span-2">
                <select className={inputCls} value={editing.field} onChange={(e) => setF('field', e.target.value)}>
                  <option value="">未選擇</option>
                  {editing.field && !configCourts.includes(editing.field) && (
                    <option value={editing.field}>{editing.field}</option>
                  )}
                  {configCourts.map((c) => (
                    <option key={c} value={c}>{c} 場</option>
                  ))}
                </select>
              </Field>
              {/* 標籤（原始位置：A1、B冠、27勝…）與實際隊伍分開選擇；
                  勝敗類標籤僅列出早於本場次者（不能引用自己或之後的場次） */}
              {[['labelA', '標籤 A'], ['labelB', '標籤 B']].map(([key, label]) => {
                const options = labelOptionsFor(editing.matchNo);
                return (
                  <Field key={key} label={label}>
                    <select className={inputCls} value={editing[key]} onChange={(e) => setF(key, e.target.value)}>
                      <option value="">未選擇</option>
                      {editing[key] && !options.includes(editing[key]) && (
                        <option value={editing[key]}>{editing[key]}</option>
                      )}
                      {options.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                );
              })}
            </div>

            {/* 成績：各局比分 + 自動大比分 + 狀態 */}
            <div className="border-t border-navy-100 pt-3 mt-1">
              <p className="text-xs text-slate-400 font-semibold tracking-wider mb-2">成績</p>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <Field key={i} label={`第 ${i + 1} 局`}>
                    <input
                      className={inputCls}
                      placeholder={i === 2 ? '15:13' : '25:20'}
                      value={editing.sets[i]}
                      onChange={(e) =>
                        setF('sets', editing.sets.map((s, j) => (j === i ? e.target.value : s)))
                      }
                    />
                  </Field>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 items-end">
                {/* 狀態依比分自動推導、唯讀；「進行中」僅在計分面板進行計分時才會出現 */}
                <Field label="狀態">
                  {(() => {
                    const st = deriveStatus(editing.sets, editing.status);
                    const tone = st === 'done'
                      ? 'bg-court/10 text-court'
                      : st === 'live'
                        ? 'bg-vbyellow-100 text-vbyellow-700'
                        : 'bg-slate-100 text-slate-500';
                    return (
                      <div className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${tone}`}>
                        {st === 'live' && <i className="fa-solid fa-volleyball" aria-hidden="true"></i>}
                        {STATUS_LABEL[st]}
                      </div>
                    );
                  })()}
                </Field>
                <div className="text-sm text-slate-500 pb-2.5">
                  大比分{' '}
                  <span className="font-display text-lg font-bold text-navy-800 tabular-nums">
                    {gameScoreFromSets(editing.sets.filter((s) => s.trim()))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
