// ============================================================
// Firestore 資料存取層
// 取代原專案的 Google Apps Script API，輸出與原本 GAS 相同的資料形狀，
// 供即時比分頁的 jQuery 綁定邏輯直接運作。
//
// Firestore 結構（以 matchNo 串聯賽程／成績／即時比分）：
//   config/marquee            { text, visible }
//   announcements/{id}        { date, type, title, content }
//   teams/{id}                { order, team, department, group, members[], seed[] }
//                             seed[0]=預賽位置（A1…F4）、seed[1]=結算名次標籤（A冠…）
//   results/{matchNo}         場次主檔，文件 id = matchNo
//                             { matchNo, round, group, time, field, teams[], gameScore, setScores[], status }
//   courts/{id}               場地清單 { name, order }
//   liveMatches/{field}       各場地即時看板（指向某場次）
//                             { index, field, matchNo, set, gameScore, teams[], setScores[], votes[], status }
//   roundResults/{group__team} 小組排名（id 採 group__team 以利重算 upsert）
//                             { group, team, winGames, lossGames, lossSets, totalPoints, pointsAgainst, pointRatio, rank }
// ============================================================
import {
  doc,
  collection,
  onSnapshot,
  getDoc,
  getDocs,
  query,
  orderBy,
  runTransaction,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { prelimSeedOf } from '../lib/teamSeed';

/** 跑馬燈（即時） */
export function subscribeMarquee(onData, onError) {
  return onSnapshot(
    doc(db, 'config', 'marquee'),
    (snap) => onData(snap.exists() ? snap.data() : { text: '', visible: false }),
    onError,
  );
}

/** 公告（即時），最新在最前 */
export function subscribeAnnouncements(onData, onError) {
  const q = query(collection(db, 'announcements'), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data())),
    onError,
  );
}

/** 即時比分（即時更新），依 index 排序 */
export function subscribeLiveMatches(onData, onError) {
  const q = query(collection(db, 'liveMatches'), orderBy('index', 'asc'));
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          setScores: [],
          votes: [0, 0],
          ...d.data(),
        })),
      ),
    onError,
  );
}

/**
 * 人氣投票：以交易方式對該場 votes[teamIndex] +1（投票後即鎖定，不可改投）
 * @param {string} field 場地（甲/乙/丙）
 * @param {number} teamIndex 0 或 1
 */
export async function voteForTeam(field, teamIndex) {
  // 以 field 對應的文件 id；seed 時 liveMatches 文件 id 即為場地代碼
  const ref = doc(db, 'liveMatches', field);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`場地 ${field} 不存在`);
    const votes = Array.isArray(snap.data().votes) ? [...snap.data().votes] : [0, 0];
    votes[teamIndex] = (votes[teamIndex] || 0) + 1;
    tx.update(ref, { votes });
  });
}

/**
 * 取得賽程／成績資料，回傳 { matches, roundResults }（與 GAS results 形狀一致）
 */
export async function fetchResults() {
  const [matchesSnap, roundSnap] = await Promise.all([
    getDocs(collection(db, 'results')),
    getDocs(collection(db, 'roundResults')),
  ]);
  const matches = matchesSnap.docs.map((d) => ({
    setScores: [],
    teams: ['', ''],
    ...d.data(),
  }));
  const roundResults = roundSnap.docs.map((d) => d.data());
  return { matches, roundResults };
}

/**
 * 取得競賽章程（config/regulations）。
 * 文件結構：{ articles: [{ title, content }] }，content 以純文字（含換行）儲存。
 * @returns {Promise<{ articles: {title?: string, content: string}[] }>}
 */
export async function fetchRegulations() {
  const snap = await getDoc(doc(db, 'config', 'regulations'));
  if (!snap.exists()) return { articles: [] };
  const data = snap.data();
  return { articles: Array.isArray(data.articles) ? data.articles : [] };
}

// ----- 賽制設定 config/tournament（預賽組數／各組隊數／場地／時間）-----

/** 預設賽制設定（文件不存在時使用） */
export const DEFAULT_TOURNAMENT = {
  groups: [
    { key: 'A', size: 3 },
    { key: 'B', size: 3 },
    { key: 'C', size: 3 },
    { key: 'D', size: 3 },
    { key: 'E', size: 3 },
    { key: 'F', size: 4 },
  ],
  startTime: '08:30',
  slotMinutes: 60,
};

/** 訂閱賽制設定（即時） */
export function subscribeTournamentConfig(onData, onError) {
  return onSnapshot(
    doc(db, 'config', 'tournament'),
    (snap) => onData(snap.exists() ? { ...DEFAULT_TOURNAMENT, ...snap.data() } : DEFAULT_TOURNAMENT),
    onError,
  );
}

/** 儲存賽制設定 */
export function saveTournamentConfig(data) {
  return setDoc(doc(db, 'config', 'tournament'), data, { merge: true });
}

// ----- 報名設定 config/registration -----

/** 預設報名設定（文件不存在時使用） */
export const DEFAULT_REGISTRATION = { url: '', isOpen: false, deadline: '', eventDate: '' };

/**
 * 訂閱報名設定（即時）。
 * @returns {import('firebase/firestore').Unsubscribe}
 */
export function subscribeRegistration(onData, onError) {
  return onSnapshot(
    doc(db, 'config', 'registration'),
    (snap) => onData(snap.exists() ? { ...DEFAULT_REGISTRATION, ...snap.data() } : DEFAULT_REGISTRATION),
    onError,
  );
}

/**
 * 儲存報名設定。
 * @param {{url: string, isOpen: boolean, deadline: string, eventDate: string}} data
 */
export function saveRegistration(data) {
  return setDoc(doc(db, 'config', 'registration'), data, { merge: true });
}

// ----- 關於比賽相關檔案 config/aboutFiles -----

/**
 * 訂閱「關於比賽」相關檔案清單（即時）。
 * @returns {import('firebase/firestore').Unsubscribe}
 */
export function subscribeAboutFiles(onData, onError) {
  return onSnapshot(
    doc(db, 'config', 'aboutFiles'),
    (snap) => onData(snap.exists() && Array.isArray(snap.data().files) ? snap.data().files : []),
    onError,
  );
}

/**
 * 儲存「關於比賽」相關檔案清單（整份覆寫）。
 * @param {{title: string, desc: string, tag: string, color: string, href: string}[]} files
 */
export function saveAboutFiles(files) {
  return setDoc(doc(db, 'config', 'aboutFiles'), { files });
}

// ----- 場地 courts -----

/** 場地清單無設定時的預設值。 */
export const DEFAULT_COURTS = ['甲', '乙', '丙'];

/** 場地清單（即時），依 order 升冪；回傳名稱字串陣列。 */
export function subscribeCourts(onData, onError) {
  const q = query(collection(db, 'courts'), orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data().name).filter(Boolean)),
    onError,
  );
}

/** 覆寫整份場地清單（依傳入順序寫入 order）。 */
export async function replaceCourts(names) {
  const col = collection(db, 'courts');
  const snap = await getDocs(col);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  names.forEach((name, i) => batch.set(doc(col), { name, order: i }));
  await batch.commit();
}

/** 場次（即時），供前台賽程／成績頁。 */
export function subscribeResults(onData, onError) {
  return onSnapshot(
    collection(db, 'results'),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

/** 參賽隊伍（即時），供前台（含 seed 位置）。 */
export function subscribeTeams(onData, onError) {
  return onSnapshot(
    collection(db, 'teams'),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

/** 小組排名（即時），供前台成績頁。 */
export function subscribeRoundResults(onData, onError) {
  return onSnapshot(
    collection(db, 'roundResults'),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

/** 取得參賽隊伍，依 order 排序 */
export async function fetchTeams() {
  const q = query(collection(db, 'teams'), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

// ============================================================
// 管理後台寫入 API（僅白名單管理員可成功，由 firestore.rules 把關）
// ============================================================

/**
 * 即時比分（即時，含文件 id），供後台列表使用。
 * @param {(matches: object[]) => void} onData
 * @param {(err: Error) => void} [onError]
 * @returns {import('firebase/firestore').Unsubscribe}
 */
export function subscribeLiveMatchesAdmin(onData, onError) {
  const q = query(collection(db, 'liveMatches'), orderBy('index', 'asc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

/**
 * 新增即時比分。文件 id 採場地代碼（與 voteForTeam 共用同一份文件）。
 * @param {string} field 場地代碼（甲/乙/丙）
 * @param {object} data 其餘欄位（index/matchNo/set/gameScore/teams/setScores…）
 */
export function createLiveMatch(field, data) {
  // votes/setScores 給預設值，避免前端讀取時為 undefined
  return setDoc(doc(db, 'liveMatches', field), {
    field,
    votes: [0, 0],
    setScores: [],
    ...data,
  });
}

/** 更新即時比分（部分欄位） */
export function updateLiveMatch(id, data) {
  return updateDoc(doc(db, 'liveMatches', id), data);
}

/** 刪除即時比分 */
export function deleteLiveMatch(id) {
  return deleteDoc(doc(db, 'liveMatches', id));
}

/**
 * 參賽隊伍（即時，含文件 id），供後台列表使用，依 order 排序。
 * @param {(teams: object[]) => void} onData
 * @param {(err: Error) => void} [onError]
 * @returns {import('firebase/firestore').Unsubscribe}
 */
export function subscribeTeamsAdmin(onData, onError) {
  const q = query(collection(db, 'teams'), orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

/** 新增隊伍（自動產生文件 id） */
export function createTeam(data) {
  return addDoc(collection(db, 'teams'), data);
}

/** 更新隊伍 */
export function updateTeam(id, data) {
  return updateDoc(doc(db, 'teams', id), data);
}

/** 刪除隊伍 */
export function deleteTeam(id) {
  return deleteDoc(doc(db, 'teams', id));
}

// ----- 場次主檔 results（文件 id = matchNo，同時驅動前台賽程表＋對戰成績）-----

/**
 * 場次主檔（即時，含文件 id）。文件 id 即 matchNo，為串聯各頁的主鍵。
 * 不在查詢層 orderBy（避免缺欄文件被排除），改由頁面端排序。
 */
export function subscribeResultsAdmin(onData, onError) {
  return onSnapshot(
    collection(db, 'results'),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

/**
 * 新增／更新一場（文件 id = matchNo）。
 * matchNo 是串聯前台賽程表、對戰成績與即時比分的主鍵。
 * @param {string} matchNo 場次（阿拉伯數字字串，如「19」）
 * @param {object} data 其餘欄位（round/group/time/field/teams/gameScore/setScores/status…）
 */
export function upsertResult(matchNo, data) {
  return setDoc(doc(db, 'results', matchNo), { matchNo, ...data }, { merge: true });
}

/** 刪除一場（id = matchNo） */
export function deleteResult(matchNo) {
  return deleteDoc(doc(db, 'results', matchNo));
}

/**
 * 整批重編場次編號（文件 id = matchNo，含同批更新時間／場地等欄位）。
 * 供預賽拖曳交換後依表格順序重排編號使用。
 * 同一批次先刪除編號變動的舊文件、再寫入新文件，避免中途出現重號。
 * @param {{row: object, matchNo: string}[]} assignments row=完整場次資料（含更新後欄位），matchNo=新編號
 */
export async function reorderMatchNumbers(assignments) {
  const col = collection(db, 'results');
  const batch = writeBatch(db);
  // 批次操作依序生效：先刪舊 id，再寫新 id（同 id 時以最後的 set 為準）
  assignments.forEach(({ row, matchNo }) => {
    if (row.matchNo !== matchNo) batch.delete(doc(col, row.matchNo));
  });
  assignments.forEach(({ row, matchNo }) => {
    const { id, ...data } = row; // id 為訂閱層附加欄位，不寫回
    batch.set(doc(col, matchNo), { ...data, matchNo });
  });
  await batch.commit();
}

/**
 * 依各隊 seed 位置，將預賽場次（含 seeds 位置參照）的 teams 同步為實際隊名，
 * 未指派的位置維持位置標籤（如「A2」）。分組變動後呼叫即自動替換。
 * @returns {Promise<number>} 更新的場次數
 */
export async function resyncPrelimResults() {
  const [teamsSnap, resultsSnap] = await Promise.all([
    getDocs(collection(db, 'teams')),
    getDocs(collection(db, 'results')),
  ]);
  const bySeed = {};
  teamsSnap.docs.forEach((d) => {
    const t = d.data();
    const slot = prelimSeedOf(t); // 修改：seed 改為陣列，取 [0] 預賽位置
    if (slot) bySeed[slot] = t.team;
  });
  const batch = writeBatch(db);
  let changed = 0;
  resultsSnap.docs.forEach((d) => {
    const r = d.data();
    if ((r.round || 'prelim') !== 'prelim' || !Array.isArray(r.seeds)) return;
    const teams = r.seeds.map((s) => bySeed[s] || s);
    if (JSON.stringify(teams) !== JSON.stringify(r.teams || [])) {
      batch.update(d.ref, { teams });
      changed += 1;
    }
  });
  if (changed) await batch.commit();
  return changed;
}

// ----- 循環賽排名 roundResults -----

/** 循環賽排名（即時，含文件 id），缺欄風險同上，頁面端排序。 */
export function subscribeRoundResultsAdmin(onData, onError) {
  return onSnapshot(
    collection(db, 'roundResults'),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

/** 新增排名列（自動產生文件 id） */
export function createRoundResult(data) {
  return addDoc(collection(db, 'roundResults'), data);
}

/** 更新排名列 */
export function updateRoundResult(id, data) {
  return updateDoc(doc(db, 'roundResults', id), data);
}

/** 刪除排名列 */
export function deleteRoundResult(id) {
  return deleteDoc(doc(db, 'roundResults', id));
}

/**
 * 以整批新資料覆寫 roundResults（清空後重寫），供「重新計算排名」使用。
 * @param {object[]} rows 計算後的排名列
 */
export async function replaceRoundResults(rows) {
  const col = collection(db, 'roundResults');
  const snap = await getDocs(col);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  rows.forEach((r) => batch.set(doc(col), r));
  await batch.commit();
}

// ----- 公告 announcements -----

/** 公告（即時，含文件 id），最新在前。 */
export function subscribeAnnouncementsAdmin(onData, onError) {
  const q = query(collection(db, 'announcements'), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

/** 新增公告（自動產生文件 id） */
export function createAnnouncement(data) {
  return addDoc(collection(db, 'announcements'), data);
}

/** 更新公告 */
export function updateAnnouncement(id, data) {
  return updateDoc(doc(db, 'announcements', id), data);
}

/** 刪除公告 */
export function deleteAnnouncement(id) {
  return deleteDoc(doc(db, 'announcements', id));
}

// ----- 跑馬燈 config/marquee -----

/** 儲存跑馬燈設定（覆寫文字與顯示開關）。 */
export function saveMarquee(data) {
  return setDoc(doc(db, 'config', 'marquee'), data, { merge: true });
}

// ----- 競賽章程 config/regulations -----

/** 儲存競賽章程（覆寫整份 articles 陣列）。 */
export function saveRegulations(articles) {
  return setDoc(doc(db, 'config', 'regulations'), { articles });
}
